//apps/storefront/src/components/storefront/search-box.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: string; name: string; description?: string | null };

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const canSearch = q.trim().length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q.trim())}`,
          {
            signal: ac.signal,
          },
        );
        const json = await res.json();
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        // ignore abort
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, canSearch]);

  return (
    <div className="relative w-full max-w-sm">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => canSearch && setOpen(true)}
        placeholder="ابحث عن منتج..."
        className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
      />

      {open ? (
        <div className="absolute right-0 left-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border bg-white shadow">
          <div className="px-3 py-2 text-xs text-slate-500">
            {loading
              ? "جاري البحث..."
              : items.length
                ? "نتائج البحث"
                : "لا توجد نتائج"}
          </div>
          <div className="max-h-72 overflow-auto">
            {items.map((it) => (
              <a
                key={it.id}
                href={`/p/${it.id}`}
                className="block border-t px-3 py-2 hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-900">
                  {it.name}
                </div>
                {it.description ? (
                  <div className="mt-0.5 line-clamp-1 text-xs text-slate-600">
                    {it.description}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full border-t px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>
      ) : null}
    </div>
  );
}
