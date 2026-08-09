// FILE: apps/storefront/src/theme-engine/runtime/pages/render-home.tsx

import Script from "next/script";

import { resolveTheme } from "@/theme-engine/runtime/resolve-theme";
import { loadPageLayout } from "@/theme-engine/layouts/load-page-layout";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { renderTemplate } from "@/theme-engine/runtime/render-template";

export async function renderHomePage(args: {
  store: any;
  store_id: string;
  preview: boolean;
  data?: Record<string, any>;
}) {
  const [theme, layout, custom] = await Promise.all([
    resolveTheme({
      store_id: args.store_id,
      preview: args.preview,
    }),
    loadPageLayout({
      store_id: args.store_id,
      page_key: "home",
      preview: args.preview,
    }),
    loadCustomCode({
      store_id: args.store_id,
      preview: args.preview,
    }),
  ]);

  return (
    <>
      {custom.css ? (
        <style
          id="store-custom-css"
          dangerouslySetInnerHTML={{ __html: custom.css }}
        />
      ) : null}

      {custom.scripts.map((scriptItem: any) => (
        <Script
          key={scriptItem.src}
          src={scriptItem.src}
          strategy={scriptItem.strategy || "afterInteractive"}
        />
      ))}

      {renderTemplate({
        template: "home",
        themeCode: theme.code,
        store: args.store,
        theme,
        sections: layout.sections,
        data: {
          ...(args.data || {}),
          route: "home",
        },
      })}
    </>
  );
}
