import { NextResponse } from "next/server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { loadMarketingCollection } from "@/data/marketing/marketing-collections.server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await resolveStoreContext();
    const storeId = String(ctx?.store?.id || "").trim();

    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "STORE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const collection = await loadMarketingCollection({
      storeId,
      slug,
      channel: "web",
    });

    if (!collection) {
      return NextResponse.json(
        { ok: false, error: "COLLECTION_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, collection });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String((error as any)?.message || error) },
      { status: 500 },
    );
  }
}
