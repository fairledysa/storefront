//apps/storefront/src/app/(store)/manifest.webmanifest/route.ts
import { NextResponse } from "next/server";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { supabaseAdmin } from "@/data/store/supabase.server";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  return fallback;
}

async function loadPwaSettings(storeId: string) {
  const sb: any = supabaseAdmin();

  const { data } = await sb
    .from("store_settings")
    .select("value,updated_at,created_at")
    .eq("store_id", storeId)
    .eq("slug", "app/pwa")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return safeObject(data?.value);
}

export async function GET() {
  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return NextResponse.json(
      { error: "STORE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const store = ctx.store as any;
  const raw = await loadPwaSettings(store.id);

  const icon = safeObject(raw.icon);

  const appName = s(raw.app_name) || s(store.name) || "Store";
  const shortName = (s(raw.short_name) || appName).slice(0, 18);

  const themeColor = s(raw.theme_color) || "#0D3B45";
  const backgroundColor = s(raw.background_color) || "#FFFFFF";

  const fallbackIcon =
    s(icon.source) ||
    s(icon.pwa_512) ||
    s(store.favicon_url) ||
    s(store.logo_url) ||
    "/favicon.ico";

  const icon192 = s(icon.pwa_192) || fallbackIcon;
  const icon512 = s(icon.pwa_512) || fallbackIcon;
  const maskable512 = s(icon.maskable_512) || icon512;

  const manifest = {
    id: "/",
    name: appName,
    short_name: shortName,
    description: s(store.description) || appName,
    lang: s(raw.language) || "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: maskable512,
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
    prefer_related_applications: false,
    enabled: bool(raw.enabled, false),
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}