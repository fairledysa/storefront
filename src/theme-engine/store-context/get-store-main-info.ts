// FILE: apps/storefront/src/theme-engine/store-context/get-store-main-info.ts

import { unstable_cache } from "next/cache";

import { controlDb } from "@/data/db/control-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function fetchStoreMainInfo(args: {
  themeVersionId: string;
  storeId?: string;
}) {
  const themeVersionId = s(args.themeVersionId);
  const storeId = s(args.storeId);

  if (!themeVersionId) return null;

  const slug = `theme_version:${themeVersionId}:main_info`;

  const sb = storeId ? ((await getStoreDb(storeId)) as any) : ((await controlDb()) as any);

  let query = sb.from("store_settings").select("value").eq("slug", slug);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.value as any) ?? null;
}

const mainInfoCache = new Map<string, () => Promise<any>>();

export async function getStoreMainInfo(
  themeVersionId: string,
  storeId?: string,
) {
  const id = s(themeVersionId);
  const sid = s(storeId);

  if (!id) return null;

  const key = sid ? `${sid}:${id}` : `legacy:${id}`;

  let fn = mainInfoCache.get(key);

  if (!fn) {
    fn = unstable_cache(
      () =>
        fetchStoreMainInfo({
          themeVersionId: id,
          storeId: sid || undefined,
        }),
      ["store-main-info", sid || "legacy", id],
      { revalidate: 120 },
    );

    mainInfoCache.set(key, fn);
  }

  return fn();
}