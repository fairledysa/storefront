import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { MARKETING_HUBS, type MarketingHubType } from "@/data/marketing/marketing-hubs.config";

export const dynamic = "force-dynamic";

const ORDER: MarketingHubType[] = ["trend", "seasonal", "best_seller", "clearance", "flash_sale", "new_arrival"];
function text(value: unknown) { return String(value ?? "").trim(); }

export async function GET() {
  try {
    const context = await resolveStoreContext();
    const storeId = text(context?.store?.id);
    if (!storeId) return NextResponse.json({ data: { enabled: false, items: [] } }, { status: 404 });

    const db: any = await getStoreDb(storeId);
    const { data, error } = await db.from("store_marketing_settings").select("enabled,metadata").eq("store_id", storeId).maybeSingle();
    if (error) throw error;

    const source = data?.metadata?.mainNavPages && typeof data.metadata.mainNavPages === "object" ? data.metadata.mainNavPages : {};
    const items = ORDER.flatMap((type, index) => {
      const raw = source[type];
      const config = MARKETING_HUBS[type];
      const enabled = raw && typeof raw === "object" ? raw.enabled === true : raw === true;
      if (!enabled) return [];
      return [{
        type,
        label: raw && typeof raw === "object" ? text(raw.label) || config.title : config.title,
        href: config.path,
        icon: raw && typeof raw === "object" ? text(raw.icon) || config.icon : config.icon,
        sortOrder: raw && typeof raw === "object" ? Number(raw.sortOrder) || (index + 1) * 10 : (index + 1) * 10,
      }];
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    return NextResponse.json(
      { data: { enabled: data?.enabled !== false && items.length > 0, items } },
      { headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=90" } },
    );
  } catch (error) {
    console.error("[marketing-navigation] failed", error);
    return NextResponse.json({ data: { enabled: false, items: [] }, error: "MARKETING_NAVIGATION_FAILED" }, { status: 500 });
  }
}
