import { NextResponse } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function uniqueIds(value: string | null) {
  return Array.from(
    new Set(
      text(value)
        .split(",")
        .map((item) => item.trim())
        .filter((item) => /^[0-9a-f-]{36}$/i.test(item)),
    ),
  ).slice(0, 120);
}

function isLive(row: any) {
  const now = Date.now();
  const startsAt = row?.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row?.ends_at ? new Date(row.ends_at).getTime() : null;

  if (!["active", "scheduled"].includes(text(row?.status))) return false;
  if (row?.show_on_web === false) return false;
  if (startsAt && Number.isFinite(startsAt) && startsAt > now) return false;
  if (endsAt && Number.isFinite(endsAt) && endsAt <= now) return false;
  return true;
}

function typePriority(type: string) {
  const order: Record<string, number> = {
    flash_sale: 100,
    clearance: 90,
    best_seller: 80,
    trend: 70,
    new_arrival: 60,
    seasonal: 50,
    editorial: 40,
    brand_zone: 30,
    custom: 20,
  };
  return order[type] ?? 0;
}

export async function GET(request: Request) {
  try {
    const ids = uniqueIds(new URL(request.url).searchParams.get("ids"));
    if (!ids.length) {
      return NextResponse.json({ ok: true, items: {} }, { headers: { "Cache-Control": "no-store" } });
    }

    const context = await resolveStoreContext();
    const storeId = text(context?.store?.id);
    if (!storeId) {
      return NextResponse.json({ ok: false, error: "STORE_NOT_FOUND" }, { status: 404 });
    }

    const db: any = await getStoreDb(storeId);
    const { data: links, error: linksError } = await db
      .from("marketing_collection_products")
      .select("product_id,collection_id,sort_order,is_pinned,is_excluded")
      .eq("store_id", storeId)
      .in("product_id", ids)
      .eq("is_excluded", false);

    if (linksError) throw linksError;

    const collectionIds = Array.from(
      new Set((links ?? []).map((row: any) => text(row.collection_id)).filter(Boolean)),
    );

    if (!collectionIds.length) {
      return NextResponse.json({ ok: true, items: {} }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: collections, error: collectionsError } = await db
      .from("marketing_collections")
      .select("id,name,slug,collection_type,status,badge_text,badge_bg,badge_color,settings,starts_at,ends_at,show_on_web,sort_order")
      .eq("store_id", storeId)
      .in("id", collectionIds);

    if (collectionsError) throw collectionsError;

    const byCollectionId = new Map(
      (collections ?? []).filter(isLive).map((row: any) => [text(row.id), row]),
    );
    const candidates = new Map<string, any[]>();

    for (const link of links ?? []) {
      const productId = text(link.product_id);
      const collection = byCollectionId.get(text(link.collection_id));
      if (!productId || !collection) continue;
      const list = candidates.get(productId) ?? [];
      list.push({ link, collection });
      candidates.set(productId, list);
    }

    const items: Record<string, any> = {};
    for (const [productId, rows] of candidates) {
      rows.sort((a, b) => {
        const pinned = Number(Boolean(b.link?.is_pinned)) - Number(Boolean(a.link?.is_pinned));
        if (pinned) return pinned;
        const priority = typePriority(text(b.collection?.collection_type)) - typePriority(text(a.collection?.collection_type));
        if (priority) return priority;
        const collectionOrder = Number(a.collection?.sort_order ?? 0) - Number(b.collection?.sort_order ?? 0);
        if (collectionOrder) return collectionOrder;
        return Number(a.link?.sort_order ?? 0) - Number(b.link?.sort_order ?? 0);
      });

      const selected = rows[0].collection;
      const type = text(selected.collection_type);
      const identities: Record<string, { label: string; icon: string; bg: string }> = {
        trend: { label: "ترندات", icon: "🔥", bg: "#7c3aed" },
        seasonal: { label: "موسمية", icon: "🌙", bg: "#a16207" },
        best_seller: { label: "الأفضل مبيعًا", icon: "🏆", bg: "#b7791f" },
        new_arrival: { label: "وصل حديثًا", icon: "🆕", bg: "#047857" },
        clearance: { label: "تصفية", icon: "🏷️", bg: "#dc2626" },
        flash_sale: { label: "عرض سريع", icon: "⚡", bg: "#ea580c" },
        custom: { label: "مجموعة", icon: "", bg: "#475467" },
      };
      const identity = identities[type] ?? identities.custom;
      const badgeText = text(selected.badge_text) || identity.label;

      items[productId] = {
        badge: badgeText
          ? {
              text: badgeText,
              bg: text(selected.badge_bg) || identity.bg,
              color: text(selected.badge_color) || "#ffffff",
              icon: text(selected.settings?.badgeIcon) || identity.icon,
            }
          : null,
        collection: {
          id: text(selected.id),
          slug: text(selected.slug) || text(selected.id),
          type,
          name: text(selected.name),
        },
      };
    }

    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("[product-marketing] failed", error);
    return NextResponse.json({ ok: false, error: "PRODUCT_MARKETING_FAILED" }, { status: 500 });
  }
}
