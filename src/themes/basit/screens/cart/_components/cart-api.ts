// FILE: apps/storefront/src/themes/basit/screens/cart/_components/cart-api.ts
"use client";

export async function apiGetCart() {
  const r = await fetch("/api/cart", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || "تعذر تحميل السلة");
  return json;
}

export async function apiPatchCartItem(body: any) {
  const r = await fetch("/api/cart/items", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || "تعذر تحديث السلة");
  return json;
}

export async function apiRemoveCartItem(cart_item_id: string) {
  const r = await fetch("/api/cart/items", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ cart_item_id }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || "تعذر حذف المنتج من السلة");
  return json;
}

export async function apiApplyCoupon(code: string) {
  const r = await fetch("/api/cart/coupon", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(json?.message || json?.error || "تعذر تطبيق الكوبون");
  return json;
}

export async function apiRemoveCoupon() {
  const r = await fetch("/api/cart/coupon", {
    method: "DELETE",
    credentials: "include",
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || "تعذر إزالة الكوبون");
  return json;
}
