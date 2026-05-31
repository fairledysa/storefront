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

function n(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function nowMs() {
  return Date.now();
}

function isRedisDisabledByEnv() {
  const text = String(process.env.REDIS_CACHE_ENABLED ?? "")
    .trim()
    .toLowerCase();

  return text === "0" || text === "false" || text === "off" || text === "no";
}

function isRedisEnabled() {
  if (isRedisDisabledByEnv()) return false;

  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function redisTimeoutMs() {
  return Math.max(
    500,
    Math.min(3000, n(process.env.REDIS_CACHE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)),
  );
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

async function redisCommand<T = unknown>(
  command: Array<string | number>,
): Promise<RedisCommandResult<T> | null> {
  if (!isRedisEnabled()) return null;

  const controller = new AbortController();
  const startedAt = nowMs();

  const timer = setTimeout(() => {
    controller.abort();
  }, redisTimeoutMs());

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
      debugRedis("http-error", {
        command: command[0],
        status: res.status,
        durationMs,
      });

      return null;
    }

    const json = (await res.json()) as RedisCommandResult<T>;

    if (json?.error) {
      debugRedis("command-error", {
        command: command[0],
        error: json.error,
        durationMs,
      });

      return json;
    }

    debugRedis("command-ok", {
      command: command[0],
      durationMs,
    });

    return json;
  } catch (error: any) {
    const durationMs = nowMs() - startedAt;

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
  if (!isRedisEnabled()) return false;

  const response = await redisCommand(["DEL", key]);

  return Boolean(response && !response.error);
}

export function redisCacheStatus() {
  return {
    enabled: isRedisEnabled(),
    configured: isRedisEnabled(),
    hasUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    timeoutMs: redisTimeoutMs(),
    prefix: process.env.REDIS_CACHE_PREFIX || "madrar:storefront",
    version: process.env.REDIS_CACHE_VERSION || "v1",
  };
}