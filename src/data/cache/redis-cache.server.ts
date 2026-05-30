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

const DEFAULT_TIMEOUT_MS = 1200;

function isRedisEnabled() {
  if (process.env.REDIS_CACHE_ENABLED === "0") return false;
  if (process.env.REDIS_CACHE_ENABLED === "false") return false;

  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function redisUrl() {
  return String(process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
}

function redisToken() {
  return String(process.env.UPSTASH_REDIS_REST_TOKEN || "");
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

  const response = await redisCommand(["SET", key, JSON.stringify(payload), "EX", ttl]);

  return Boolean(response && !response.error);
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

  await redisSetEnvelope(key, fresh, options.ttlSeconds);

  return fresh;
}

export async function redisDelete(key: string) {
  if (!isRedisEnabled()) return false;

  const response = await redisCommand(["DEL", key]);

  return Boolean(response && !response.error);
}

export function redisCacheStatus() {
  return {
    enabled: isRedisEnabled(),
    hasUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    prefix: process.env.REDIS_CACHE_PREFIX || "madrar:storefront",
    version: process.env.REDIS_CACHE_VERSION || "v1",
  };
}