//apps/storefront/src/data/store/options.ts
import { cache } from "react";
import { supabaseAdmin } from "@/data/store/supabase.server";
import {
  parseStoreOptions,
  type StoreOptions,
} from "@/lib/store-options";

export const getStoreOptions = cache(async (storeId: string): Promise<StoreOptions> => {
  const sb = supabaseAdmin();

  const { data } = await sb
    .from("store_settings")
    .select("slug, value")
    .eq("store_id", storeId)
    .like("slug", "options:%");

  const items: Record<string, any> = {};

  for (const row of data || []) {
    items[row.slug] = row.value;
  }

  return parseStoreOptions(items);
});