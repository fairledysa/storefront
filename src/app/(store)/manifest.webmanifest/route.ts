// FILE: apps/storefront/src/app/(store)/manifest.webmanifest/route.ts

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { supabaseAdmin } from "@/data/store/supabase.server";

export const dynamic = "force-dynamic";

const PWA_SETTING_SLUGS = ["app/pwa", "store.pwa", "pwa"];

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

function normalizeUrl(value: unknown) {
  const url = s(value);

  if (!url) return "";
  if (url.startsWith("http://")) return url;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;

  return `/${url}`;
}

function cleanColor(value: unknown, fallback: string) {
  const color = s(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

async function loadPwaSettings(storeId: string) {
  const sb: any = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,updated_at,created_at")
    .eq("store_id", storeId)
    .in("slug", PWA_SETTING_SLUGS)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || !data.length) {
    return {};
  }

  return safeObject(data[0]?.value);
}

export async function GET() {
  const ctx = await resolveStoreContext();

  if (!ctx.store) {
    return new Response(JSON.stringify({ error: "STORE_NOT_FOUND" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const store = ctx.store as any;
  const raw = await loadPwaSettings(String(store.id));

  const icon = safeObject(raw.icon);

  const appName = s(raw.app_name) || s(store.name) || "Store";
  const shortName = (s(raw.short_name) || appName).slice(0, 18);

  const themeColor = cleanColor(raw.theme_color, "#0D3B45");
  const backgroundColor = cleanColor(raw.background_color, "#FFFFFF");

  const iconSource = normalizeUrl(
    icon.source ||
      icon.pwa_512 ||
      icon.pwa_192 ||
      icon.apple_180 ||
      icon.maskable_512 ||
      store.favicon_url ||
      store.logo_url ||
      "/favicon.ico",
  );

  const maskableIcon = normalizeUrl(icon.maskable_512 || iconSource);

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
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      {
        src: iconSource,
        sizes: "1024x1024",
        purpose: "any",
      },
      {
        src: maskableIcon,
        sizes: "1024x1024",
        purpose: "maskable",
      },
    ],
    prefer_related_applications: false,
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}