// FILE: apps/storefront/src/data/cache/redis-cache.server.ts

import "server-only";

type RedisCommandResult<T = unknown> = {
  result?: T;
  error?: string;
};

type RedisCachedOptions = {
  ttlSeconds: number;
};

type CacheEnvelope<T> = {
  __madrar_cache: 1;
  value: T;
};

type RedisCacheMeta = {
  cache: "disabled" | "hit" | "miss" | "error";
  key: string;
  durationMs: number;
};

type RedisCachedWithMetaResult<T> = {
  value: T;
  meta: RedisCacheMeta;
};

declare global {
  // eslint-disable-next-line no-var
  var __redis_cache_health:
    | {
        failures: number;
        disabledUntil: number;
      }
    | undefined;
}

const DEFAULT_TIMEOUT_MS = 350;
const DEFAULT_BREAKER_MS = 10_000;
const DEFAULT_FAILURE_THRESHOLD = 1;

function n(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function nowMs() {
  return Date.now();
}

function redisTimeoutMs() {
  return Math.max(
    120,
    Math.min(1200, n(process.env.REDIS_CACHE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)),
  );
}

function redisBreakerMs() {
  return Math.max(
    1000,
    Math.min(
      60_000,
      n(process.env.REDIS_CACHE_BREAKER_MS, DEFAULT_BREAKER_MS),
    ),
  );
}

function redisFailureThreshold() {
  return Math.max(
    1,
    Math.min(
      5,
      n(process.env.REDIS_CACHE_FAILURE_THRESHOLD, DEFAULT_FAILURE_THRESHOLD),
    ),
  );
}

function getRedisHealth() {
  if (!globalThis.__redis_cache_health) {
    globalThis.__redis_cache_health = {
      failures: 0,
      disabledUntil: 0,
    };
  }

  return globalThis.__redis_cache_health;
}

function isTruthyDisabled(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();

  return text === "0" || text === "false" || text === "off" || text === "no";
}

function isRedisConfigured() {
  if (isTruthyDisabled(process.env.REDIS_CACHE_ENABLED)) return false;

  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function isRedisBreakerOpen() {
  const health = getRedisHealth();

  return health.disabledUntil > nowMs();
}

function isRedisAvailable() {
  return isRedisConfigured() && !isRedisBreakerOpen();
}

function redisUrl() {
  return String(process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
}

function redisToken() {
  return String(process.env.UPSTASH_REDIS_REST_TOKEN || "");
}

function shouldDebugRedis() {
  const value = String(process.env.REDIS_CACHE_DEBUG || "")
    .trim()
    .toLowerCase();

  return value === "1" || value === "true" || value === "yes";
}

function debugRedis(message: string, data?: Record<string, unknown>) {
  if (!shouldDebugRedis()) return;

  console.info("[redis-cache]", message, data ?? {});
}

function recordRedisSuccess() {
  const health = getRedisHealth();

  health.failures = 0;
  health.disabledUntil = 0;
}

function recordRedisFailure(reason: string) {
  const health = getRedisHealth();

  health.failures += 1;

  if (health.failures >= redisFailureThreshold()) {
    health.disabledUntil = nowMs() + redisBreakerMs();

    debugRedis("temporary-disabled", {
      reason,
      failures: health.failures,
      disabledForMs: redisBreakerMs(),
    });
  } else {
    debugRedis("failure", {
      reason,
      failures: health.failures,
    });
  }
}

async function redisCommand<T = unknown>(
  command: Array<string | number>,
): Promise<RedisCommandResult<T> | null> {
  if (!isRedisAvailable()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), redisTimeoutMs());

  const startedAt = nowMs();

  try {
    const res = await fetch(redisUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: controller.signal,
    });

    const durationMs = nowMs() - startedAt;

    if (!res.ok) {
      recordRedisFailure(`http_${res.status}`);

      debugRedis("http-error", {
        command: command[0],
        status: res.status,
        durationMs,
      });

      return null;
    }

    const json = (await res.json()) as RedisCommandResult<T>;

    if (json?.error) {
      recordRedisFailure("redis_error");

      debugRedis("command-error", {
        command: command[0],
        error: json.error,
        durationMs,
      });

      return json;
    }

    recordRedisSuccess();

    debugRedis("command-ok", {
      command: command[0],
      durationMs,
    });

    return json;
  } catch (error: any) {
    const durationMs = nowMs() - startedAt;

    recordRedisFailure(error?.name === "AbortError" ? "timeout" : "fetch_error");

    debugRedis("fetch-error", {
      command: command[0],
      error: error?.name || error?.message || String(error),
      durationMs,
    });

    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function redisGetEnvelope<T>(
  key: string,
): Promise<{ hit: true; value: T } | { hit: false; value: null }> {
  const response = await redisCommand<string | null>(["GET", key]);

  if (!response || response.error || response.result == null) {
    return { hit: false, value: null };
  }

  try {
    const parsed = JSON.parse(response.result) as CacheEnvelope<T>;

    if (parsed && parsed.__madrar_cache === 1) {
      return {
        hit: true,
        value: parsed.value,
      };
    }

    return {
      hit: true,
      value: parsed as T,
    };
  } catch {
    return { hit: false, value: null };
  }
}

async function redisSetEnvelope<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  if (typeof value === "undefined") return false;

  const ttl = Math.max(5, Math.floor(Number(ttlSeconds || 60)));

  const payload: CacheEnvelope<T> = {
    __madrar_cache: 1,
    value,
  };

  const response = await redisCommand([
    "SET",
    key,
    JSON.stringify(payload),
    "EX",
    ttl,
  ]);

  return Boolean(response && !response.error);
}

export async function redisCached<T>(
  key: string,
  options: RedisCachedOptions,
  loader: () => Promise<T>,
): Promise<T> {
  if (!isRedisAvailable()) {
    return loader();
  }

  const cached = await redisGetEnvelope<T>(key);

  if (cached.hit) {
    return cached.value;
  }

  const fresh = await loader();

  await redisSetEnvelope(key, fresh, options.ttlSeconds);

  return fresh;
}

export async function redisCachedWithMeta<T>(
  key: string,
  options: RedisCachedOptions,
  loader: () => Promise<T>,
): Promise<RedisCachedWithMetaResult<T>> {
  const startedAt = nowMs();

  if (!isRedisAvailable()) {
    const value = await loader();

    return {
      value,
      meta: {
        cache: "disabled",
        key,
        durationMs: nowMs() - startedAt,
      },
    };
  }

  const cached = await redisGetEnvelope<T>(key);

  if (cached.hit) {
    return {
      value: cached.value,
      meta: {
        cache: "hit",
        key,
        durationMs: nowMs() - startedAt,
      },
    };
  }

  const fresh = await loader();
  const stored = await redisSetEnvelope(key, fresh, options.ttlSeconds);

  return {
    value: fresh,
    meta: {
      cache: stored ? "miss" : "error",
      key,
      durationMs: nowMs() - startedAt,
    },
  };
}

export async function redisDelete(key: string) {
  if (!isRedisAvailable()) return false;

  const response = await redisCommand(["DEL", key]);

  return Boolean(response && !response.error);
}

export function redisCacheStatus() {
  const health = getRedisHealth();

  return {
    enabled: isRedisAvailable(),
    configured: isRedisConfigured(),
    breakerOpen: isRedisBreakerOpen(),
    failures: health.failures,
    disabledUntil: health.disabledUntil,
    hasUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    timeoutMs: redisTimeoutMs(),
    breakerMs: redisBreakerMs(),
    prefix: process.env.REDIS_CACHE_PREFIX || "madrar:storefront",
    version: process.env.REDIS_CACHE_VERSION || "v1",
  };
}