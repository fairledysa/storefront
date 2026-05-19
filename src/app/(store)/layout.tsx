// FILE: apps/storefront/src/app/(store)/layout.tsx

import Script from "next/script";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { loadCustomCode } from "@/theme-engine/injectors/custom-code";
import { THEME_KIND, type ThemeCode } from "@/theme-engine/types";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await resolveStoreContext();
  const store = ctx.store;

  if (!store) return {};

  return {
    title: store.name,
    description: store.description || undefined,
    icons: { icon: store.favicon_url || "/favicon.ico" },
  };
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await resolveStoreContext();

  if (!ctx.store) return notFound();

  const activeCode = (ctx.theme?.theme_key || "classic") as ThemeCode;
  const kind = THEME_KIND[activeCode] || "legacy";
  const isAppShell = kind === "app-shell";

  const custom = await loadCustomCode({
    store_id: ctx.store.id,
    preview: false,
  });

  const CustomHead = (
    <>
      {custom.css ? (
        <style
          id="store-custom-css"
          dangerouslySetInnerHTML={{ __html: custom.css }}
        />
      ) : null}

      {custom.scripts.map((s) => (
        <Script
          key={s.src}
          src={s.src}
          strategy={s.strategy || "afterInteractive"}
        />
      ))}
    </>
  );

  if (isAppShell) {
    return (
      <>
        {CustomHead}
        {children}
      </>
    );
  }

  const { default: StorefrontHeader } =
    await import("@/components/storefront/header");

  return (
    <>
      {CustomHead}

      <div dir="rtl" className="min-h-screen bg-slate-50">
        <StorefrontHeader store={ctx.store as any} />

        {children}

        <footer className="border-t py-6 text-center text-sm text-slate-500">
          {ctx.store.name} © {new Date().getFullYear()}
        </footer>
      </div>
    </>
  );
}