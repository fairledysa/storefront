//  apps/storefront/src/themes/basit/screens/account/page.tsx
import { notFound } from "next/navigation";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { renderTemplate } from "@/theme-engine/runtime/render-template";
import { getActiveThemeCode } from "@/theme-engine/get-active-theme";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const ctx = await resolveStoreContext();
  if (!ctx.store) return notFound();

  const themeCode = await getActiveThemeCode(ctx.store.id);

  return await renderTemplate({
    template: "account",
    themeCode,
    store: {
      id: ctx.store.id,
      slug: ctx.store.slug,
      name: ctx.store.name,
      logo_url: ctx.store.logo_url ?? null,
    },
    theme: {
      code: themeCode,
      settings: {},
    },
    sections: [],
    data: null,
    children: null,
  });
}