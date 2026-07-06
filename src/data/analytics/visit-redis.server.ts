// FILE: apps/storefront/src/data/analytics/visit-redis.server.ts

import "server-only";

const REQUEST_TIMEOUT_MS = 1_200;
const SESSION_TTL_SECONDS = 35 * 60;
const COUNTER_TTL_SECONDS = 10 * 24 * 60 * 60;
const RATE_WINDOW_SECONDS = 60;
const RATE_LIMIT_PER_IP_PER_STORE_PER_MINUTE = 60;

type RedisResult<T = unknown> = {
  result?: T;
  error?: string;
};

type PipelineResult<T = unknown> = RedisResult<T>;

export type VisitRecordResult =
  | { ok: true; counted: boolean; visits: number }
  | { ok: false; reason: "disabled" | "rate_limited" | "redis_error" };

function s(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function analyticsEnabled() {
  const flag = s(process.env.ANALYTICS_VISITS_ENABLED).toLowerCase();

  return ["1", "true", "yes", "on"].includes(flag) && Boolean(redisUrl() && redisToken());
}

function redisUrl() {
  return s(process.env.UPSTASH_REDIS_REST_URL).replace(/\/+$/, "");
}

function redisToken() {
  return s(process.env.UPSTASH_REDIS_REST_TOKEN);
}

function analyticsKey(...parts: string[]) {
  return ["elyaia", "analytics", "v1", ...parts]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(":");
}

async function redisCommand<T = unknown>(command: Array<string | number>): Promise<RedisResult<T> | null> {
  if (!analyticsEnabled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(redisUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    return (await response.json()) as RedisResult<T>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function redisPipeline(commands: Array<Array<string | number>>): Promise<PipelineResult[] | null> {
  if (!analyticsEnabled() || !commands.length) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS * 3);

  try {
    const response = await fetch(`${redisUrl()}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const body = await response.json();
    return Array.isArray(body) ? (body as PipelineResult[]) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const RECORD_SESSION_SCRIPT = `
local rate = redis.call("INCR", KEYS[1])
if rate == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end
if rate > tonumber(ARGV[2]) then
  return {0, 0, rate}
end

local created = redis.call("SET", KEYS[2], "1", "NX", "EX", tonumber(ARGV[3]))
if not created then
  local existing = redis.call("GET", KEYS[3]) or "0"
  return {1, 0, tonumber(existing)}
end

local visits = redis.call("INCR", KEYS[3])
redis.call("EXPIRE", KEYS[3], tonumber(ARGV[4]))
redis.call("SADD", KEYS[4], ARGV[5])
redis.call("EXPIRE", KEYS[4], tonumber(ARGV[4]))
return {1, 1, visits}
`;

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function isAnalyticsVisitsEnabled() {
  return analyticsEnabled();
}

export async function recordStoreVisit(input: {
  storeId: string;
  sessionId: string;
  ipHash: string;
  dateKey: string;
  rateBucket: string;
}): Promise<VisitRecordResult> {
  if (!analyticsEnabled()) {
    return { ok: false, reason: "disabled" };
  }

  const rateKey = analyticsKey("rate", input.storeId, input.ipHash, input.rateBucket);
  const sessionKey = analyticsKey("session", input.storeId, input.sessionId);
  const visitsKey = analyticsKey("visits", input.dateKey, input.storeId);
  const activeStoresKey = analyticsKey("active-stores", input.dateKey);

  const response = await redisCommand<unknown>([
    "EVAL",
    RECORD_SESSION_SCRIPT,
    4,
    rateKey,
    sessionKey,
    visitsKey,
    activeStoresKey,
    RATE_WINDOW_SECONDS,
    RATE_LIMIT_PER_IP_PER_STORE_PER_MINUTE,
    SESSION_TTL_SECONDS,
    COUNTER_TTL_SECONDS,
    input.storeId,
  ]);

  if (!response || response.error || !Array.isArray(response.result)) {
    return { ok: false, reason: "redis_error" };
  }

  const [accepted, counted, visits] = response.result;

  if (toNumber(accepted) !== 1) {
    return { ok: false, reason: "rate_limited" };
  }

  return {
    ok: true,
    counted: toNumber(counted) === 1,
    visits: Math.max(0, toNumber(visits)),
  };
}

export async function getActiveStoreIds(dateKey: string) {
  if (!analyticsEnabled()) return [] as string[];

  const result = await redisCommand<unknown[]>([
    "SMEMBERS",
    analyticsKey("active-stores", dateKey),
  ]);

  if (!result || result.error || !Array.isArray(result.result)) return [] as string[];

  return Array.from(
    new Set(result.result.map((value) => s(value)).filter(Boolean)),
  );
}

export async function getDailyVisitCounts(input: {
  dateKey: string;
  storeIds: string[];
}) {
  const storeIds = Array.from(new Set(input.storeIds.map(s).filter(Boolean)));
  const counts = new Map<string, number>();

  if (!analyticsEnabled() || !storeIds.length) return counts;

  const pipeline = await redisPipeline(
    storeIds.map((storeId) => [
      "GET",
      analyticsKey("visits", input.dateKey, storeId),
    ]),
  );

  if (!pipeline) return counts;

  for (let index = 0; index < storeIds.length; index += 1) {
    const value = pipeline[index]?.result;
    counts.set(storeIds[index], Math.max(0, toNumber(value)));
  }

  return counts;
}
