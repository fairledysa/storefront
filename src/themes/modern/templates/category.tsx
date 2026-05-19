// FILE: apps/storefront/src/themes/modern/templates/category.tsx

import type { ThemeRuntime } from "@/theme-engine/registry";

type StoreRow = { id: string; slug: string; name: string };

export default function ClassicCategory({
  data,
}: {
  store: StoreRow;
  theme: ThemeRuntime;
  sections: any[];
  data?: {
    category: { id: string; name: string; slug: string };
    products: { id: string; name: string; description?: string | null }[];
  };
}) {
  const category = data?.category;
  const products = data?.products || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8" dir="rtl">
      <h1 className="mb-4 text-2xl font-semibold">{category?.name || "قسم"}</h1>

      {products.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">
          لا توجد منتجات في هذا القسم حالياً
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <a
              key={p.id}
              href={`/p/${p.id}`}
              className="rounded-xl border bg-white p-3 hover:bg-slate-50"
              title={p.name}
            >
              <div className="text-sm font-medium">{p.name}</div>
              {p.description ? (
                <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {p.description}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-500">بدون وصف</div>
              )}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
