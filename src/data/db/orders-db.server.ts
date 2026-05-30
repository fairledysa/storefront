// FILE: apps/storefront/src/data/db/orders-db.server.ts

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertStoreId,
  getOrdersShardKey,
  getShardClient,
} from "./shard-router.server";

export async function getOrdersDb(storeId: string): Promise<SupabaseClient> {
  assertStoreId(storeId);

  const shardKey = await getOrdersShardKey(storeId);

  return getShardClient(shardKey);
}