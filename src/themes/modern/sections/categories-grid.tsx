// FILE: apps/storefront/src/themes/modern/sections/categories-grid.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";
import { getCategoriesForGrid } from "@/data/catalog/categories";

export default async function ModernCategoriesGrid({
  section,
  store,
}: {
  section: LayoutSection;
  store: { id: string; slug: string; name: string };
  theme: any;
}) {
  const p = section.props || {};
  const limit = Number(p.limit || 12);
  const source = (p.source === "by_parent_slug" ? "by_parent_slug" : "top_level") as
    | "top_level"
    | "by_parent_slug";

  const items = await getCategoriesForGrid({
    store_id: store.id,
    limit,
    source,
    parent_slug: p.parent_slug,
  });

  return (
    <section className="rounded-2xl border bg-white/70 backdrop-blur p-6">
      <h2 className="text-lg font-semibold">{p.title || "الأقسام"}</h2>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-slate-600">
          ما فيه أقسام للعرض حالياً.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((c) => (
            <a
              key={c.id}
              href={`/c/${c.slug}`}
              className="rounded-2xl border bg-white px-3 py-3 text-sm hover:shadow-sm"
              title={c.name}
            >
              {c.name}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
