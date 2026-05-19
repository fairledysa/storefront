// FILE: apps/storefront/src/themes/modern/sections/banner.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

export default function ModernBanner({
  section,
}: {
  section: LayoutSection;
  store: any;
  theme: any;
}) {
  const p = section.props || {};
  return (
    <section className="rounded-2xl border bg-white/70 backdrop-blur p-6">
      <div className="text-right">
        <p className="text-slate-800">{p.text || "Banner"}</p>
        {p.cta_label && p.cta_href ? (
          <a
            href={p.cta_href}
            className="mt-4 inline-flex rounded-2xl border px-5 py-2.5 text-sm"
          >
            {p.cta_label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
