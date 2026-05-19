"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";

type CartItem = { qty: number };

export default function CartIconButton() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    try {
      const r = await fetch("/api/cart", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const json = await r.json();
      const list = (json?.data?.items ?? []) as CartItem[];
      setItems(list);
    } catch {
      // تجاهل (لا نكسر الهيدر)
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();

    // ✅ تحديث فوري بعد الإضافة
    const onAdd = () => loadCart();
    window.addEventListener("cart:add", onAdd as any);
    return () => window.removeEventListener("cart:add", onAdd as any);
  }, []);

  const count = useMemo(() => {
    return items.reduce((sum, x) => sum + Number(x?.qty ?? 0), 0);
  }, [items]);

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white hover:bg-slate-50"
      aria-label="السلة"
      title="السلة"
    >
      <ShoppingCart className="h-5 w-5" />

      {!loading && count > 0 ? (
        <span className="absolute -left-1 -top-1 min-w-[18px] rounded-full bg-slate-900 px-1.5 py-0.5 text-center text-[11px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
