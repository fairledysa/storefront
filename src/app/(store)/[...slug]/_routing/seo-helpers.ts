// FILE: apps/storefront/src/app/(store)/[...slug]/_routing/seo-helpers.ts
import { headers } from "next/headers";

export function safeText(input?: string | null) {
  if (!input) return "";
  return String(input).trim().replace(/\s+/g, " ");
}

export function buildKeywords(parts: Array<string | null | undefined>) {
  const words = parts
    .map((x) => safeText(x))
    .filter(Boolean)
    .join(" ")
    .split(/[\s،,|/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const w of words) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;

    seen.add(k);
    out.push(w);

    if (out.length >= 40) break;
  }

  return out.length ? out.join(",") : undefined;
}

function firstHeaderValue(value?: string | null) {
  return String(value ?? "")
    .split(",")[0]
    .trim();
}

function cleanProto(value?: string | null) {
  const proto = firstHeaderValue(value).toLowerCase();

  if (proto === "https") return "https";
  if (proto === "http") return "http";

  return "";
}

function cleanHost(value?: string | null) {
  return firstHeaderValue(value)
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "")
    .trim();
}

// ✅ origin آمن للـ canonical / OG / Twitter
export async function getRequestOriginSafe() {
  const h = await headers();

  const host =
    cleanHost(h.get("x-forwarded-host")) ||
    cleanHost(h.get("host")) ||
    cleanHost(process.env.NEXT_PUBLIC_DEV_HOST) ||
    "localhost:3003";

  const proto =
    cleanProto(h.get("x-forwarded-proto")) ||
    cleanProto(process.env.NEXT_PUBLIC_DEV_PROTOCOL) ||
    "http";

  return `${proto}://${host}`;
}

// ✅ نفس cleanShortCode تمامًا
export function cleanShortCode(mode: string, raw?: string | null) {
  const v = String(raw || "").trim();
  if (!v) return null;

  if (mode !== "short") return v;

  // allowed short code: a-z A-Z 0-9 - _
  if (/^[A-Za-z0-9_-]{1,32}$/.test(v)) return v;

  return null;
}