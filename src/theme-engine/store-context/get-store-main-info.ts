// FILE: apps/storefront/src/theme-engine/store-context/get-store-main-info.ts

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/data/store/supabase.server";

async function fetchStoreMainInfo(themeVersionId: string) {
  const sb = supabaseAdmin();

  const { data } = await sb
    .from("store_settings")
    .select("value")
    .eq("slug", `theme_version:${themeVersionId}:main_info`)
    .maybeSingle();

  return (data?.value as any) ?? null;
}

const mainInfoCache = new Map<string, () => Promise<any>>();

export async function getStoreMainInfo(themeVersionId: string) {
  const id = String(themeVersionId || "").trim();
  if (!id) return null;

  let fn = mainInfoCache.get(id);

  if (!fn) {
    fn = unstable_cache(
      () => fetchStoreMainInfo(id),
      ["store-main-info", id],
      { revalidate: 120 },
    );

    mainInfoCache.set(id, fn);
  }

  return fn();
}