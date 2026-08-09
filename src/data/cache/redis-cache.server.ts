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

const DEFAULT_TIMEOUT_MS = 1200;

function nowMs() {
  return Date.now();
}

function isRedisEnabled() {
  if (process.env.REDIS_CACHE_ENABLED === "0") return false;
  if (process.env.REDIS_CACHE_ENABLED === "false") return false;

  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function redisUrl() {
  return String(process.env.UPSTASH_REDIS_REST_URL || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .replace(/\/+$/, "");
}

function redisToken() {
  return String(process.env.UPSTASH_REDIS_REST_TOKEN || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

async function redisCommand<T = unknown>(
  command: Array<string | number>,
): Promise<RedisCommandResult<T> | null> {
  if (!isRedisEnabled()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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

    if (!res.ok) return null;

    return (await res.json()) as RedisCommandResult<T>;
  } catch {
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
  if (!isRedisEnabled()) return false;
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

function writeRedisInBackground<T>(
  key: string,
  value: T,
  ttlSeconds: number,
) {
  if (!isRedisEnabled()) return;
  if (typeof value === "undefined") return;

  void redisSetEnvelope(key, value, ttlSeconds).catch(() => {
    // Redis مساعد فقط، لا نخليه يعطل الطلب.
  });
}

export async function redisCached<T>(
  key: string,
  options: RedisCachedOptions,
  loader: () => Promise<T>,
): Promise<T> {
  if (!isRedisEnabled()) {
    return loader();
  }

  const cached = await redisGetEnvelope<T>(key);

  if (cached.hit) {
    return cached.value;
  }

  const fresh = await loader();

  writeRedisInBackground(key, fresh, options.ttlSeconds);

  return fresh;
}

export async function redisCachedWithMeta<T>(
  key: string,
  options: RedisCachedOptions,
  loader: () => Promise<T>,
): Promise<RedisCachedWithMetaResult<T>> {
  const startedAt = nowMs();

  if (!isRedisEnabled()) {
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

  writeRedisInBackground(key, fresh, options.ttlSeconds);

  return {
    value: fresh,
    meta: {
      cache: "miss",
      key,
      durationMs: nowMs() - startedAt,
    },
  };
}

export async function redisDelete(key: string) {
  if (!isRedisEnabled()) return false;

  const response = await redisCommand(["DEL", key]);

  return Boolean(response && !response.error);
}


export async function redisDeletePattern(pattern: string) {
  if (!isRedisEnabled()) return { deleted: 0, enabled: false };

  const cleanPattern = String(pattern || "").trim();
  if (!cleanPattern) return { deleted: 0, enabled: true };

  let cursor = "0";
  let deleted = 0;

  do {
    const scan = await redisCommand<[string, string[]]>([
      "SCAN",
      cursor,
      "MATCH",
      cleanPattern,
      "COUNT",
      100,
    ]);

    if (!scan || scan.error || !Array.isArray(scan.result)) break;

    cursor = String(scan.result[0] ?? "0");
    const keys = Array.isArray(scan.result[1]) ? scan.result[1] : [];

    if (keys.length > 0) {
      const removal = await redisCommand<number>(["DEL", ...keys]);
      if (removal && !removal.error) deleted += Number(removal.result || 0);
    }
  } while (cursor !== "0");

  return { deleted, enabled: true };
}

export function redisCacheStatus() {
  return {
    enabled: isRedisEnabled(),
    hasUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    prefix: process.env.REDIS_CACHE_PREFIX || "storefront",
    version: process.env.REDIS_CACHE_VERSION || "v1",
  };
}