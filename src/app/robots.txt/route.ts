// FILE: apps/storefront/src/app/robots.txt/route.ts

import { NextRequest } from "next/server";

import { getStoreDb } from "@/data/db/store-db.server";
import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROBOTS_SETTING_SLUGS = ["seo.robots_txt", "seo.robots", "robots.txt"];
const MAX_ROBOTS_SIZE = 5000;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return {};
}

function pickText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function resolveRequestOrigin(request: NextRequest) {
  const url = new URL(request.url);

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.host;

  const proto =
    request.headers.get("x-forwarded-proto") ||
    url.protocol.replace(":", "") ||
    "https";

  return `${proto}://${host}`.replace(/\/+$/, "");
}

function defaultRobotsContent(sitemapUrl: string) {
  return [
    `Sitemap: ${sitemapUrl}`,
    "User-agent: *",
    "Allow: /",
    "Disallow: /*?iframe",
    "Disallow: /*?currency=",
    "",
  ].join("\n");
}

function hasUnsafeRobotsContent(value: string) {
  const lower = value.toLowerCase();

  return (
    lower.includes("<script") ||
    lower.includes("</script") ||
    lower.includes("javascript:") ||
    lower.includes("<iframe") ||
    lower.includes("</iframe")
  );
}

function normalizeRobotsContent(rawContent: string, sitemapUrl: string) {
  const raw = String(rawContent ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .slice(0, MAX_ROBOTS_SIZE)
    .trim();

  if (!raw || hasUnsafeRobotsContent(raw)) {
    return defaultRobotsContent(sitemapUrl);
  }

  const lines = raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const bodyLines = lines.filter((line) => !/^sitemap\s*:/i.test(line));

  const body = bodyLines.join("\n").trim();

  if (!body) {
    return defaultRobotsContent(sitemapUrl);
  }

  return [`Sitemap: ${sitemapUrl}`, body, ""].join("\n");
}

async function loadRobotsContent(storeId: string) {
  const sb: any = await getStoreDb(storeId);

  const { data, error } = await sb
    .from("store_settings")
    .select("slug,value,updated_at,created_at")
    .eq("store_id", storeId)
    .in("slug", ROBOTS_SETTING_SLUGS)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || !data.length) {
    return "";
  }

  const value = data[0]?.value;

  if (typeof value === "string") {
    return value;
  }

  const obj = safeObject(value);

  return pickText(
    obj.content,
    obj.robots_txt,
    obj.robotsTxt,
    obj.robots,
    obj.value,
  );
}

export async function GET(request: NextRequest) {
  const origin = resolveRequestOrigin(request);
  const sitemapUrl = `${origin}/sitemap.xml`;

  let content = defaultRobotsContent(sitemapUrl);

  try {
    const ctx = await resolveStoreContext();
    const storeId = s((ctx.store as any)?.id);

    if (storeId) {
      const savedRobots = await loadRobotsContent(storeId);
      content = normalizeRobotsContent(savedRobots, sitemapUrl);
    }
  } catch (error) {
    console.error("[robots.txt] failed to load store robots config", error);
  }

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60",
    },
  });
}