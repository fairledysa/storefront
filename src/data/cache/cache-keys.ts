// FILE: apps/storefront/src/data/cache/cache-keys.ts

import "server-only";

function cleanPart(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) return "none";

  return raw
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9\u0600-\u06ff._-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 180);
}

export function cacheKey(...parts: unknown[]) {
  const prefix =
    process.env.REDIS_CACHE_PREFIX?.trim() || "madrar:storefront";

  const version = process.env.REDIS_CACHE_VERSION?.trim() || "v1";

  return [prefix, version, ...parts.map(cleanPart)].join(":");
}