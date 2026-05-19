// FILE: apps/storefront/src/themes/classic/sections/banner.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

export default function ClassicBanner({ section }: { section: LayoutSection; store: any; theme: any }) {
  const p = section.props || {};
  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="text-right">
        <p className="text-slate-800">{p.text || "Banner"}</p>
        {p.cta_label && p.cta_href ? (
          <a href={p.cta_href} className="mt-3 inline-flex rounded-xl border px-4 py-2 text-sm">
            {p.cta_label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
