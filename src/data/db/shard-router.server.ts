// FILE: apps/storefront/src/data/db/shard-router.server.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  CONTROL_SHARD_KEY,
  DEFAULT_ORDERS_SHARD_KEY,
  DEFAULT_STORE_SHARD_KEY,
  getShardConfig,
  type ShardConfig,
} from "./shards.config";

declare global {
  // eslint-disable-next-line no-var
  var __sb_shard_clients: Record<string, SupabaseClient> | undefined;
}

type ShardCredentials = {
  url: string;
  serviceRoleKey: string;
};

function getClientCache() {
  if (!globalThis.__sb_shard_clients) {
    globalThis.__sb_shard_clients = {};
  }

  return globalThis.__sb_shard_clients;
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

  // الآن كل المتاجر على نفس الشارد.
  // لاحقًا هذا المكان يقرأ من جدول store_shards.
  return DEFAULT_STORE_SHARD_KEY;
}

export async function getOrdersShardKey(storeId: string): Promise<string> {
  assertStoreId(storeId);

  // الآن كل الطلبات على نفس الشارد.
  // لاحقًا هذا المكان يقرأ من جدول store_shards.
  return DEFAULT_ORDERS_SHARD_KEY;
}

export function assertStoreId(storeId: string): void {
  if (!storeId || typeof storeId !== "string" || !storeId.trim()) {
    throw new Error("Missing storeId for shard routing");
  }
}