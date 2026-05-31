// FILE: apps/storefront/src/app/(store)/api/cart/claim/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getOrdersDb } from "@/data/db/orders-db.server";
import { getCartSessionId, getStoreIdOrThrow } from "../../_cart/cart.server";

export const dynamic = "force-dynamic";

async function getUserIdOrNull(): Promise<string | null> {
  try {
    const jar = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => jar.get(name)?.value,
        },
      },
    );

    const { data } = await supabase.auth.getUser();
    return data?.user?.id ? String(data.user.id) : null;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const user_id = await getUserIdOrNull();

    if (!user_id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const store_id = await getStoreIdOrThrow();
    const session_id = await getCartSessionId();

    const sb: any = await getOrdersDb(store_id);

    // 1) سلة المستخدم المفتوحة إن وجدت
    const userCartR = await sb
      .from("carts")
      .select("id")
      .eq("store_id", store_id)
      .eq("user_id", user_id)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (userCartR.error) throw new Error(userCartR.error.message);

    // 2) سلة الجلسة المفتوحة إن وجدت
    const sessionCartR = await sb
      .from("carts")
      .select("id")
      .eq("store_id", store_id)
      .eq("session_id", session_id)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (sessionCartR.error) throw new Error(sessionCartR.error.message);

    const userCartId = userCartR.data?.id ? String(userCartR.data.id) : null;
    const sessionCartId = sessionCartR.data?.id
      ? String(sessionCartR.data.id)
      : null;

    // لا يوجد شيء لدمجه
    if (!sessionCartId && userCartId) {
      return NextResponse.json({ ok: true, merged: false });
    }

    // لا يوجد سلة مستخدم ولا سلة جلسة
    if (!sessionCartId && !userCartId) {
      return NextResponse.json({ ok: true, merged: false });
    }

    // يوجد سلة جلسة ولا يوجد سلة مستخدم => حوّلها للمستخدم
    if (sessionCartId && !userCartId) {
      const up = await sb
        .from("carts")
        .update({ user_id, session_id: null })
        .eq("id", sessionCartId);

      if (up.error) throw new Error(up.error.message);

      return NextResponse.json({ ok: true, merged: true, mode: "CLAIMED" });
    }

    // يوجد الاثنان => انقل عناصر سلة الجلسة لسلة المستخدم ثم اقفل سلة الجلسة
    if (sessionCartId && userCartId && sessionCartId !== userCartId) {
      const mv = await sb
        .from("cart_items")
        .update({ cart_id: userCartId })
        .eq("cart_id", sessionCartId);

      if (mv.error) throw new Error(mv.error.message);

      const close = await sb
        .from("carts")
        .update({ status: "merged", session_id: null })
        .eq("id", sessionCartId);

      if (close.error) throw new Error(close.error.message);

      return NextResponse.json({ ok: true, merged: true, mode: "MOVED_ITEMS" });
    }

    return NextResponse.json({ ok: true, merged: false });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}