// apps/storefront/src/themes/classic/templates/home.tsx

import StoreHeader from "@/components/storefront/header";
import Footer from "@/themes/classic/sections/footer";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { loadPageLayout } from "@/theme-engine/layouts/load-page-layout";
import { themeRegistry } from "@/theme-engine/registry";

export default async function ClassicHome() {
  const ctx = await resolveStoreContext();
  const store = ctx.store;
  if (!store) return null;

  const reg = themeRegistry.get("classic");

  const row: any = await loadPageLayout({
    store_id: store.id,
    page_key: "home",
    preview: false,
  });

  const list: any[] = row?.layout ?? [];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <StoreHeader
        store={{
          id: store.id,
          slug: store.slug,
          name: store.name,
          logo_url: (store as any).logo_url,
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {list.map((section: any) => {
          const R = reg.sections?.[section.type];
          if (!R) return null;

          return (
            <div key={section.id ?? section.type} className="mb-6">
              <R section={section} store={store} theme={{ code: "classic" }} />
            </div>
          );
        })}
      </main>

      <Footer
        section={{ id: "footer", type: "footer" } as any}
        store={store}
        theme={{ code: "classic" }}
      />
    </div>
  );
}
