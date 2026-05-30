// FILE: apps/storefront/src/data/db/control-db.server.ts

import type { SupabaseClient } from "@supabase/supabase-js";

import { getControlShardKey, getShardClient } from "./shard-router.server";

export function controlDb(): SupabaseClient {
  return getShardClient(getControlShardKey());
}