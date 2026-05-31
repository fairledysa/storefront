// FILE: apps/storefront/src/data/db/shard-router.server.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  CONTROL_SHARD_KEY,
  DEFAULT_ORDERS_SHARD_KEY,
  DEFAULT_STORE_SHARD_KEY,
  getShardConfig,
  type ShardConfig,
  type ShardKind,
} from "./shards.config";

declare global {
  // eslint-disable-next-line no-var
  var __sb_shard_clients: Record<string, SupabaseClient> | undefined;

  // eslint-disable-next-line no-var
  var __sb_store_shard_routes:
    | Record<
        string,
        {
          storeShardKey: string;
          ordersShardKey: string;
          expiresAt: number;
        }
      >
    | undefined;
}

type ShardCredentials = {
  url: string;
  serviceRoleKey: string;
};

type StoreShardRoute = {
  storeShardKey: string;
  ordersShardKey: string;
};

const STORE_SHARD_ROUTE_TTL_MS = 30_000;

function getClientCache() {
  if (!globalThis.__sb_shard_clients) {
    globalThis.__sb_shard_clients = {};
  }

  return globalThis.__sb_shard_clients;
}

function getStoreShardRouteCache() {
  if (!globalThis.__sb_store_shard_routes) {
    globalThis.__sb_store_shard_routes = {};
  }

  return globalThis.__sb_store_shard_routes;
}

function readShardCredentials(config: ShardConfig): ShardCredentials {
  const shardUrl = process.env[`${config.envPrefix}_SUPABASE_URL`];
  const shardServiceRoleKey =
    process.env[`${config.envPrefix}_SUPABASE_SERVICE_ROLE_KEY`];

  const fallbackUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const fallbackServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const url = shardUrl || fallbackUrl;
  const serviceRoleKey = shardServiceRoleKey || fallbackServiceRoleKey;

  if (!url || !serviceRoleKey) {
    throw new Error(
      [
        `Missing Supabase env for shard: ${config.key}`,
        `Expected either:`,
        `- ${config.envPrefix}_SUPABASE_URL`,
        `- ${config.envPrefix}_SUPABASE_SERVICE_ROLE_KEY`,
        `Or fallback:`,
        `- NEXT_PUBLIC_SUPABASE_URL`,
        `- SUPABASE_SERVICE_ROLE_KEY`,
      ].join("\n"),
    );
  }

  return {
    url,
    serviceRoleKey,
  };
}

function normalizeStoreId(storeId: string): string {
  return String(storeId ?? "").trim();
}

function fallbackStoreShardRoute(): StoreShardRoute {
  return {
    storeShardKey: DEFAULT_STORE_SHARD_KEY,
    ordersShardKey: DEFAULT_ORDERS_SHARD_KEY,
  };
}

function safeShardKey(args: {
  value: unknown;
  expectedKind: ShardKind;
  fallback: string;
}) {
  const shardKey = String(args.value ?? "").trim();

  if (!shardKey) return args.fallback;

  try {
    const config = getShardConfig(shardKey);

    if (config.kind !== args.expectedKind) {
      return args.fallback;
    }

    return config.key;
  } catch {
    return args.fallback;
  }
}

function cacheStoreShardRoute(storeId: string, route: StoreShardRoute) {
  const cache = getStoreShardRouteCache();

  cache[storeId] = {
    ...route,
    expiresAt: Date.now() + STORE_SHARD_ROUTE_TTL_MS,
  };
}

function readCachedStoreShardRoute(storeId: string): StoreShardRoute | null {
  const cache = getStoreShardRouteCache();
  const cached = cache[storeId];

  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    delete cache[storeId];
    return null;
  }

  return {
    storeShardKey: cached.storeShardKey,
    ordersShardKey: cached.ordersShardKey,
  };
}

async function readStoreShardRouteFromDb(
  storeId: string,
): Promise<StoreShardRoute> {
  const cleanStoreId = normalizeStoreId(storeId);

  assertStoreId(cleanStoreId);

  const cached = readCachedStoreShardRoute(cleanStoreId);

  if (cached) {
    return cached;
  }

  const fallback = fallbackStoreShardRoute();

  try {
    const control = getShardClient(CONTROL_SHARD_KEY);

    const { data, error } = await control
      .from("store_shards")
      .select("store_shard_key, orders_shard_key, status")
      .eq("store_id", cleanStoreId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      cacheStoreShardRoute(cleanStoreId, fallback);
      return fallback;
    }

    if (String(data.status ?? "active") !== "active") {
      cacheStoreShardRoute(cleanStoreId, fallback);
      return fallback;
    }

    const route: StoreShardRoute = {
      storeShardKey: safeShardKey({
        value: data.store_shard_key,
        expectedKind: "store",
        fallback: DEFAULT_STORE_SHARD_KEY,
      }),
      ordersShardKey: safeShardKey({
        value: data.orders_shard_key,
        expectedKind: "orders",
        fallback: DEFAULT_ORDERS_SHARD_KEY,
      }),
    };

    cacheStoreShardRoute(cleanStoreId, route);

    return route;
  } catch {
    cacheStoreShardRoute(cleanStoreId, fallback);
    return fallback;
  }
}

export function getShardClient(shardKey: string): SupabaseClient {
  const config = getShardConfig(shardKey);
  const credentials = readShardCredentials(config);

  const cacheKey = `${config.key}:${credentials.url}`;
  const cache = getClientCache();

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  const client = createClient(credentials.url, credentials.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 0,
      },
    },
  });

  cache[cacheKey] = client;
  return client;
}

export function getControlShardKey(): string {
  return CONTROL_SHARD_KEY;
}

export async function getStoreShardKey(storeId: string): Promise<string> {
  assertStoreId(storeId);

  const route = await readStoreShardRouteFromDb(storeId);

  return route.storeShardKey;
}

export async function getOrdersShardKey(storeId: string): Promise<string> {
  assertStoreId(storeId);

  const route = await readStoreShardRouteFromDb(storeId);

  return route.ordersShardKey;
}

export function assertStoreId(storeId: string): void {
  if (!storeId || typeof storeId !== "string" || !storeId.trim()) {
    throw new Error("Missing storeId for shard routing");
  }
}