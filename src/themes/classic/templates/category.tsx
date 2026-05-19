// FILE: apps/storefront/src/themes/classic/templates/category.tsx

import { getSeoUrlMode } from "@/data/store/settings";
import { productUrl } from "@/lib/seo/urls";

type StoreRow = { id: string; slug: string; name: string };

function toPublicNo(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default async function ClassicCategory({
  store,
  data,
}: {
  store: StoreRow;
  theme: any;
  sections: any[];
  data?: {
    category: {
      id: string;
      name: string;
      slug: string;
      short_url?: string | null;
      public_no?: number | string | null; // ✅ مهم: bigint ممكن يجي string
    };
    products: {
      id: string;
      name: string;
      description?: string | null;
      short_url?: string | null;
      public_no?: number | string | null; // ✅ مهم
    }[];
  };
}) {
  const mode = await getSeoUrlMode(store.id);

  const category = data?.category;
  const products = data?.products || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">{category?.name || "قسم"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {products.length
            ? `عدد المنتجات: ${products.length}`
            : "لا توجد منتجات في هذا القسم حالياً."}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">المنتجات</h2>

        {products.length === 0 ? (
          <div className="mt-4 rounded-xl border p-4 text-sm text-slate-600">
            اربط منتجات بهذا القسم عبر جدول <b>product_categories</b>.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const publicNo = toPublicNo(p.public_no);

              const href = productUrl({
                mode,
                name: p.name,
                short_url: p.short_url ?? null,
                public_no: publicNo, // ✅ صار رقم مضمون
                id_fallback: p.id,
              });

              // ✅ لو لأي سبب رجع "#"، نضمن رابط شغال بالـ public_no
              const finalHref =
                href === "#" && publicNo ? `/p${publicNo}` : href;

              return (
                <a
                  key={p.id}
                  href={finalHref}
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
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
