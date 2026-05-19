// FILE: apps/storefront/src/themes/classic/templates/home.tsx
import { themeRegistry, type ThemeRuntime } from "@/theme-engine/registry";

type StoreRow = { id: string; slug: string; name: string };

export default function ClassicHome({
  store,
  theme,
  sections,
}: {
  store: StoreRow;
  theme: ThemeRuntime;
  sections: any[];
}) {
  const reg = themeRegistry.get("classic");

  const list = [...sections]
    .filter((s) => s?.enabled !== false)
    .sort((a, b) => Number(a?.sort ?? 0) - Number(b?.sort ?? 0));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6" dir="rtl">
      {list.map((section) => {
        const R = reg.sections[section.type];
        if (!R) return null;
        return (
          <div key={section.id} className="mb-6">
            <R section={section} store={store} theme={theme} />
          </div>
        );
      })}
    </main>
  );
}
