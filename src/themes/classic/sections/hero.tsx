// FILE: apps/storefront/src/themes/classic/sections/hero.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

export default function ClassicHero({
  section,
}: {
  section: LayoutSection;
  store: any;
  theme: any;
}) {
  const p = section.props || {};
  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="text-right">
        <h1 className="text-2xl font-semibold">{p.title || "Hero"}</h1>
        {p.subtitle ? <p className="mt-2 text-slate-600">{p.subtitle}</p> : null}
        {p.cta_label && p.cta_href ? (
          <a
            href={p.cta_href}
            className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm font-medium"
          >
            {p.cta_label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
