// FILE: apps/storefront/src/themes/modern/sections/products-grid.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

export default function ModernProductsGrid({
  section,
}: {
  section: LayoutSection;
  store: any;
  theme: any;
}) {
  const p = section.props || {};
  const limit = Number(p.limit || 12);

  return (
    <section className="rounded-2xl border bg-white/70 backdrop-blur p-6">
      <h2 className="text-lg font-semibold">{p.title || "منتجات"}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-3">
            <div className="text-sm font-medium">منتج {i + 1}</div>
            <div className="mt-1 text-xs text-slate-600">وصف بسيط</div>
          </div>
        ))}
      </div>
    </section>
  );
}
