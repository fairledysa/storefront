import "server-only";

import { getProductsByIds } from "@/data/catalog/products";
import { getStoreDb } from "@/data/db/store-db.server";
import { getStoreOptions } from "@/data/store/options";
import type { BootstrapRequest } from "../bootstrap/bootstrap.types";
import { getMobileCommerceContext } from "../commerce-context.server";
import { loadMobileProductMarketingMap } from "../marketing/marketing.server";
import { buildMobileProductCard } from "../mobile-product-card.server";
import { buildMobileProductOptions } from "../product-options.server";
import { canShowPurchaseCount, loadProductSocialPolicy, loadProductSocialStats } from "../product-social.server";
import { resolveActiveMobileStoreApp } from "../store-app.server";

const s = (value: unknown) => String(value ?? "").trim();
const n = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const safeArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

export type MobileVideoFeedRequest = {
  cursor?: string | null;
  limit?: number;
  excludeProductId?: string | null;
};

export async function getMobileVideoFeed(
  input: BootstrapRequest,
  request: MobileVideoFeedRequest,
) {
  const app = await resolveActiveMobileStoreApp(input.publicAppId);
  const commerceContext = await getMobileCommerceContext(app, input);
  const storeOptions = await getStoreOptions(app.storeId);
  const db = (await getStoreDb(app.storeId)) as any;

  const limit = Math.min(Math.max(n(request.limit, 8), 1), 20);
  const offset = Math.max(n(request.cursor, 0), 0);
  const excludeProductId = s(request.excludeProductId);
  const fetchLimit = Math.min(limit * 5, 100);

  const mediaResult = await db
    .from("product_media")
    .select(
      "id,product_id,media_kind,original_url,thumbnail_url,video_url,upload_status,mux_playback_id,duration_seconds,aspect_ratio,width,height,sort_order,created_at",
    )
    .eq("store_id", app.storeId)
    .eq("media_kind", "video")
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true })
    .range(offset, offset + fetchLimit - 1);

  if (mediaResult.error) {
    throw mediaResult.error;
  }

  const uniqueMedia: any[] = [];
  const seenProductIds = new Set<string>();

  for (const media of safeArray(mediaResult.data)) {
    const productId = s(media.product_id);
    const url = s(media.video_url || media.original_url);
    if (!productId || !url || productId === excludeProductId || seenProductIds.has(productId)) continue;
    seenProductIds.add(productId);
    uniqueMedia.push(media);
    if (uniqueMedia.length >= limit) break;
  }

  const productIds = uniqueMedia.map((media) => s(media.product_id)).filter(Boolean);
  const rows = await getProductsByIds({ store_id: app.storeId, ids: productIds, limit: productIds.length || 1 });
  const rowById = new Map(rows.map((row: any) => [s(row.id), row]));

  const [policy, statsByProduct, marketingByProduct] = await Promise.all([
    loadProductSocialPolicy(app.storeId, storeOptions),
    loadProductSocialStats(app.storeId, rows),
    loadMobileProductMarketingMap({ storeId: app.storeId, productIds }),
  ]);

  const items = uniqueMedia.flatMap((media) => {
    const productId = s(media.product_id);
    const row = rowById.get(productId);
    if (!row) return [];

    const stats = statsByProduct.get(productId) ?? {
      rating: null,
      reviewCount: 0,
      soldQty: 0,
    };

    return [
      {
        id: `${productId}:${s(media.id)}`,
        video: {
          id: s(media.id),
          type: "video" as const,
          url: s(media.video_url || media.original_url),
          thumbnail_url: s(media.thumbnail_url) || null,
          upload_status: "ready" as const,
          mux_playback_id: s(media.mux_playback_id) || null,
          duration_seconds: Number.isFinite(Number(media.duration_seconds))
            ? Number(media.duration_seconds)
            : null,
          aspect_ratio: s(media.aspect_ratio) || null,
          width: Number.isFinite(Number(media.width)) ? Number(media.width) : null,
          height: Number.isFinite(Number(media.height)) ? Number(media.height) : null,
        },
        product: buildMobileProductCard(
          row,
          storeOptions,
          buildMobileProductOptions(row),
          {
            ...stats,
            showRating: policy.showRatingsOnApp,
            showPurchaseCount: canShowPurchaseCount(policy, row),
          },
          marketingByProduct.get(productId) ?? null,
          commerceContext,
        ),
      },
    ];
  });

  const consumed = safeArray(mediaResult.data).length;
  const hasMore = consumed === fetchLimit;

  return {
    config_version: app.configVersion,
    items,
    next_cursor: hasMore ? String(offset + consumed) : null,
    has_more: hasMore,
  };
}
