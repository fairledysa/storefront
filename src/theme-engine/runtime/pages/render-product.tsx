// FILE: apps/storefront/src/theme-engine/runtime/pages/render-product.ts
import Script from "next/script";

import { resolveTheme } from "@/theme-engine/runtime/resolve-theme";
import { loadPageLayout } from "@/theme-engine/layouts/load-page-layout";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { renderTemplate } from "@/theme-engine/runtime/render-template";

import { getSeoUrlMode, type SeoUrlMode } from "@/data/store/settings";

function normalizeMode(v: any): SeoUrlMode {
  const m = String(v ?? "").trim();
  if (m === "short" || m === "named_ar" || m === "named_en") return m;
  return "named_ar";
}

export async function renderProductPage(args: {
  store: any;
  store_id: string;
  preview: boolean;
  data: { product: any };
}) {
  const theme = await resolveTheme({
    store_id: args.store_id,
    preview: args.preview,
  });

  const layout = await loadPageLayout({
    store_id: args.store_id,
    page_key: "product",
    preview: args.preview,
  });

  const custom = await loadCustomCode({
    store_id: args.store_id,
    preview: args.preview,
  });

  // ✅ نجيب وضع الروابط من السيرفر ونحقنه داخل data بدل ما نضيف prop جديد لـ renderTemplate
  const mode = normalizeMode(await getSeoUrlMode(args.store_id));

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
        template: "product",
        themeCode: theme.code,
        store: args.store,
        theme,
        sections: layout.sections,
        // ✅ نحط mode هنا داخل data
        data: { ...args.data, mode },
      })}
    </>
  );
}
