import { NextRequest, NextResponse } from "next/server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getStoreDb } from "@/data/db/store-db.server";

export const dynamic = "force-dynamic";
const ALLOWED = new Set(["popup_impression","popup_open","popup_close","popup_click","popup_primary_action","popup_secondary_action","popup_form_submit","popup_coupon_copy","popup_add_to_cart","popup_checkout_start","popup_conversion","popup_error"]);
function s(value: unknown) { return String(value ?? "").trim(); }

export async function POST(request: NextRequest) {
  try {
    const context = await resolveStoreContext();
    const storeId = context.store?.id;
    if (!storeId) return NextResponse.json({ ok: false }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const popupId = s(body?.popupId); const eventType = s(body?.eventType);
    if (!popupId || !ALLOWED.has(eventType)) return NextResponse.json({ ok: false }, { status: 400 });
    const db: any = await getStoreDb(storeId);
    const { error } = await db.from("marketing_popup_events").insert({
      store_id: storeId, popup_id: popupId, session_id: s(body?.sessionId) || null,
      event_type: eventType, page_type: s(body?.pageType) || null,
      page_reference_id: s(body?.pageReferenceId) || null, device_type: s(body?.deviceType) || null,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });
    if (error) throw error;
    if (eventType === "popup_impression" || eventType === "popup_close" || eventType === "popup_primary_action") {
      const column = eventType === "popup_impression" ? "impressions" : eventType === "popup_close" ? "closes" : "clicks";
      const { data: row } = await db.from("marketing_popups").select(column).eq("id", popupId).eq("store_id", storeId).maybeSingle();
      await db.from("marketing_popups").update({ [column]: Number(row?.[column] ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", popupId).eq("store_id", storeId);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[marketing-popups] event failed", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
