// FILE: apps/storefront/src/themes/basit/index.tsx
"use client";

import type { ReactNode } from "react";

import "./styles/index.css";

import { adaptTheme } from "./adapter";
import AppShell from "./app-shell/AppShell";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "./bootstrap/types";

type BasitThemeProps = {
  ctx: {
    store: {
      id: string;
      name: string;
      logo_url?: string | null;
    };

    theme: {
      key: string;
      version_id: string;
      options: Record<string, any>;
    };

    device: "mobile" | "desktop";

    /**
     * بعض الراوتات القديمة لا تمرر seoMode.
     * نخليه اختياري هنا عشان ما يطيح build،
     * والراوت المركزي الجديد يمرره بشكل صحيح.
     */
    seoMode?: SeoUrlMode;

    data?: any;
    bootstrap?: MalakBootstrap;

    /**
     * رقم السلة من السيرفر.
     * هذا خاص بالعميل، لذلك لا يدخل داخل bootstrap العام.
     */
    initialCartCount?: number;
  };

  children?: ReactNode;
};

export default function BasitTheme({ ctx, children }: BasitThemeProps) {
  const seoMode: SeoUrlMode = ctx.seoMode ?? "named_ar";

  const adapted = adaptTheme({
    store: ctx.store,
    theme: ctx.theme,
    device: ctx.device,
  });

  return (
    <AppShell
      theme={adapted}
      seoMode={seoMode}
      data={ctx.data}
      bootstrap={ctx.bootstrap}
      initialCartCount={ctx.initialCartCount ?? 0}
    >
      {children}
    </AppShell>
  );
}
