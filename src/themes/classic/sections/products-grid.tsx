import Link from "next/link";
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";
import { getProductsForGrid } from "@/data/catalog/products";
import { getSeoUrlMode } from "@/data/store/settings";
import { productUrl } from "@/lib/seo/urls";

export default async function ClassicProductsGrid({
  section,
  store,
}: {
  section: LayoutSection;
  store: { id: string; slug: string; name: string };
  theme: any;
}) {
  const mode = await getSeoUrlMode(store.id);

  const p = section.props || {};
  const limit = Math.min(Math.max(Number(p.limit || 12), 1), 60);

  const items = await getProductsForGrid({
    store_id: store.id,
    limit,
  });

  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold">{p.title || "منتجات"}</h2>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border p-4 text-sm text-slate-600">
          ما فيه منتجات للعرض حالياً.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((prod) => (
            <Link
              key={prod.id}
              href={productUrl({
                mode,
                name: prod.name,
                short_url: prod.short_url ?? null,
                id_fallback: prod.id,
              })}
              className="rounded-xl border p-3 hover:bg-slate-50"
              title={prod.name}
            >
              <div className="text-sm font-medium">{prod.name}</div>
              {prod.description ? (
                <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {prod.description}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-500">بدون وصف</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
