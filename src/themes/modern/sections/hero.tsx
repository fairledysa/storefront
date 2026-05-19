// FILE: apps/storefront/src/themes/modern/sections/hero.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

export default function ModernHero({
  section,
}: {
  section: LayoutSection;
  store: any;
  theme: any;
}) {
  const p = section.props || {};
  return (
    <section className="rounded-2xl border bg-white/70 backdrop-blur p-7">
      <div className="text-right">
        <h1 className="text-3xl font-semibold">{p.title || "Hero"}</h1>
        {p.subtitle ? <p className="mt-2 text-slate-600">{p.subtitle}</p> : null}
        {p.cta_label && p.cta_href ? (
          <a
            href={p.cta_href}
            className="mt-5 inline-flex rounded-2xl border px-5 py-2.5 text-sm font-medium"
          >
            {p.cta_label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
