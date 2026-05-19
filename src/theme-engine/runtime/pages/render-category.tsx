// FILE: apps/storefront/src/theme-engine/runtime/pages/render-category.tsx
import Script from "next/script";
import { headers } from "next/headers";
import { resolveTheme } from "@/theme-engine/runtime/resolve-theme";
import { loadPageLayout } from "@/theme-engine/layouts/load-page-layout";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { renderTemplate } from "@/theme-engine/runtime/render-template";
import { THEME_KIND, type ThemeCode } from "@/theme-engine/types";
import { getSeoUrlMode } from "@/data/store/settings";

// ✅ malak screens
import CategoryScreen from "@/themes/malak/screens/category/CategoryScreen";
import CategoryMobileScreen from "@/themes/malak/screens-mobile/category/CategoryMobileScreen";

function detectDeviceFromUA(ua: string) {
  const s = String(ua || "").toLowerCase();
  const isMobile =
    s.includes("iphone") ||
    s.includes("android") ||
    s.includes("ipad") ||
    s.includes("ipod") ||
    s.includes("mobile");
  return isMobile ? ("mobile" as const) : ("desktop" as const);
}

export async function renderCategoryPage(args: {
  store: any;
  store_id: string;
  preview: boolean;
  data: { category: any; products: any[] };
}) {
  const theme = await resolveTheme({
    store_id: args.store_id,
    preview: args.preview,
  });

  const layout = await loadPageLayout({
    store_id: args.store_id,
    page_key: "category",
    preview: args.preview,
  });

  const custom = await loadCustomCode({
    store_id: args.store_id,
    preview: args.preview,
  });

  // ✅ إذا malak (app-shell) لازم نحقن شاشة القسم كـ children
  const kind = THEME_KIND[theme.code as ThemeCode] || "legacy";
  let injected: any = null;

  if (kind === "app-shell") {
    const h = await headers();
    const ua = h.get("user-agent") || "";
    const device = detectDeviceFromUA(ua);
    const seoMode = await getSeoUrlMode(args.store_id);

    injected =
      device === "mobile" ? (
        <CategoryMobileScreen data={args.data} mode={seoMode} />
      ) : (
        <CategoryScreen data={args.data} mode={seoMode} />
      );
  }

  return (
    <>
      {custom.css ? (
        <style
          id="store-custom-css"
          dangerouslySetInnerHTML={{ __html: custom.css }}
        />
      ) : null}

      {custom.scripts.map((s: any) => (
        <Script
          key={s.src}
          src={s.src}
          strategy={s.strategy || "afterInteractive"}
        />
      ))}

      {renderTemplate({
        template: "category",
        themeCode: theme.code,
        store: args.store,
        theme,
        sections: layout.sections,
        data: args.data,
        children: injected, // ✅ هذا اللي كان ناقص
      })}
    </>
  );
}
