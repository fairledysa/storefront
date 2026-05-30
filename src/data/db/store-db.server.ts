// FILE: apps/storefront/src/data/db/store-db.server.ts

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertStoreId,
  getShardClient,
  getStoreShardKey,
} from "./shard-router.server";

export async function getStoreDb(storeId: string): Promise<SupabaseClient> {
  assertStoreId(storeId);

  const shardKey = await getStoreShardKey(storeId);

  return getShardClient(shardKey);
}