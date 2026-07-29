import { NextResponse } from "next/server";
import { getStoreDb } from "@/data/db/store-db.server";
import { BootstrapError } from "@/data/mobile/bootstrap/bootstrap.errors";
import { readMobileRequestContext } from "@/data/mobile/request-context";
import { resolveActiveMobileStoreApp } from "@/data/mobile/store-app.server";

export const dynamic = "force-dynamic";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Accept, Content-Type, Authorization, X-Store-App-Id, X-App-Version, X-App-Environment, X-Platform, Accept-Language, X-Timezone, X-Currency-Code, X-Request-Id"};
export async function OPTIONS(){return new Response(null,{status:204,headers:corsHeaders});}

function maskName(value: unknown) {
  const name = String(value ?? "عميل").trim() || "عميل";
  if (name.length <= 2) return `${name[0] ?? "ع"}***`;
  return `${name[0]}***${name[name.length - 1]}`;
}
function encodeCursor(createdAt: string, id: string) { return Buffer.from(JSON.stringify([createdAt,id])).toString("base64url"); }
function decodeCursor(value: string | null) {
  if (!value) return null;
  try { const parsed = JSON.parse(Buffer.from(value,"base64url").toString("utf8")); return Array.isArray(parsed) && parsed.length === 2 ? {createdAt:String(parsed[0]),id:String(parsed[1])} : null; } catch { return null; }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let requestId = request.headers.get("x-request-id") || "unknown";
  try {
    const mobileContext = readMobileRequestContext(request);
    requestId = mobileContext.requestId;
    const app = await resolveActiveMobileStoreApp(mobileContext.publicAppId);
    const { id: productId } = await context.params;
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));
    const cursor = decodeCursor(url.searchParams.get("cursor"));
    const db: any = await getStoreDb(app.storeId);

    let query = db.from("review_entries")
      .select("id,rating,title,body,author_name,is_verified_purchase,helpful_count,published_at,created_at,order_item_id")
      .eq("store_id", app.storeId)
      .eq("target_type", "product")
      .eq("target_id", productId)
      .eq("review_type", "review")
      .eq("status", "published")
      .not("rating", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    const reviewsR = await query;
    if (reviewsR.error) throw reviewsR.error;
    const rows = reviewsR.data ?? [];
    const pageRows = rows.slice(0, limit);
    const reviewIds = pageRows.map((row: any) => String(row.id));
    const mediaR = reviewIds.length ? await db.from("review_media").select("id,review_id,media_type,file_url,thumbnail_url,sort_order").eq("store_id", app.storeId).in("review_id", reviewIds).order("sort_order",{ascending:true}) : {data:[],error:null};
    if (mediaR.error) throw mediaR.error;
    const mediaByReview = new Map<string, any[]>();
    for (const media of mediaR.data ?? []) {
      const key = String((media as any).review_id);
      const list = mediaByReview.get(key) ?? [];
      list.push({id:String((media as any).id),type:(media as any).media_type === "video" ? "video" : "image",url:String((media as any).file_url ?? ""),thumbnail_url:(media as any).thumbnail_url ? String((media as any).thumbnail_url) : null});
      mediaByReview.set(key,list);
    }
    const orderItemIds = Array.from(new Set(pageRows.map((row: any) => row.order_item_id).filter(Boolean).map(String)));
    const orderItemsR = orderItemIds.length
      ? await db.from("order_items").select("id,selected_options").eq("store_id", app.storeId).in("id", orderItemIds)
      : { data: [], error: null };
    if (orderItemsR.error) throw orderItemsR.error;

    const optionTextByOrderItem = new Map<string, string>();
    for (const orderItem of orderItemsR.data ?? []) {
      const selectedOptions = Array.isArray((orderItem as any).selected_options)
        ? (orderItem as any).selected_options
        : [];
      const optionText = selectedOptions
        .map((option: any) => {
          const name = String(option?.name ?? option?.option_name ?? "").trim();
          const value = String(option?.value ?? option?.value_name ?? option?.label ?? "").trim();
          if (name && value) return `${name}: ${value}`;
          return value || name;
        })
        .filter(Boolean)
        .join(" / ");
      optionTextByOrderItem.set(String((orderItem as any).id), optionText);
    }

    const items = pageRows.map((row:any) => ({
      id: String(row.id),
      rating: Number(row.rating),
      title: row.title ? String(row.title) : null,
      body: String(row.body ?? ""),
      author_name: maskName(row.author_name),
      is_verified_purchase: row.is_verified_purchase === true,
      helpful_count: Math.max(0, Number(row.helpful_count ?? 0)),
      published_at: row.published_at ? String(row.published_at) : row.created_at ? String(row.created_at) : null,
      option_text: row.order_item_id ? optionTextByOrderItem.get(String(row.order_item_id)) ?? "" : "",
      fit: null,
      media: mediaByReview.get(String(row.id)) ?? [],
    }));
    const last = pageRows[pageRows.length - 1];
    const hasMore = rows.length > limit;
    const nextCursor = hasMore && last ? encodeCursor(String(last.created_at ?? last.published_at ?? ""), String(last.id)) : null;
    return NextResponse.json({items,next_cursor:nextCursor,has_more:hasMore},{headers:{...corsHeaders,"Cache-Control":"private, no-store","X-Request-Id":requestId}});
  } catch (error) {
    if (error instanceof BootstrapError || (error && typeof error === "object" && "status" in error)) {
      const value = error as BootstrapError & {status:number;code:string;publicMessage?:string};
      return NextResponse.json({error:{code:value.code,message:value.publicMessage ?? "Invalid mobile request.",requestId}},{status:value.status,headers:corsHeaders});
    }
    console.error("mobile product reviews failed", error);
    return NextResponse.json({error:{code:"MOBILE_PRODUCT_REVIEWS_FAILED",message:"Unable to load reviews.",requestId}},{status:500,headers:corsHeaders});
  }
}
