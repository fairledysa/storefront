// FILE: apps/storefront/src/themes/classic/sections/footer.tsx
import type { LayoutSection } from "@/theme-engine/layouts/load-page-layout";

export default function ClassicFooter({
  section,
}: {
  section: LayoutSection;
  store: any;
  theme: any;
}) {
  const p = section.props || {};
  const links = Array.isArray(p.links) ? p.links : [];
  return (
    <footer className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap gap-3 text-sm">
        {links.map((l: any, i: number) => (
          <a key={i} href={String(l.href || "#")} className="underline">
            {String(l.label || "Link")}
          </a>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500">
        © {new Date().getFullYear()} elyaia
      </div>
    </footer>
  );
}
