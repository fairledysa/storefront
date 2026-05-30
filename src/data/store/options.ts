// FILE: apps/storefront/src/data/store/options.ts

import { cache } from "react";

import { getStoreDb } from "@/data/db/store-db.server";
import { parseStoreOptions, type StoreOptions } from "@/lib/store-options";

function s(value: unknown) {
  return String(value ?? "").trim();
}

export const getStoreOptions = cache(
  async (storeId: string): Promise<StoreOptions> => {
    const id = s(storeId);

    if (!id) {
      return parseStoreOptions({});
    }

    const sb = (await getStoreDb(id)) as any;

    const { data } = await sb
      .from("store_settings")
      .select("slug, value")
      .eq("store_id", id)
      .like("slug", "options:%");

    const items: Record<string, any> = {};

    for (const row of data || []) {
      const slug = s(row?.slug);
      if (!slug) continue;

      items[slug] = row?.value;
    }

    return parseStoreOptions(items);
  },
);