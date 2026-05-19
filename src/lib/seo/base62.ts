// FILE: apps/storefront/src/lib/seo/base62.ts

const ALPH = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAP: Record<string, number> = Object.fromEntries(
  ALPH.split("").map((ch, i) => [ch, i]),
);

export function toBase62(num: number) {
  let n = Math.floor(num);
  if (!Number.isFinite(n) || n <= 0) return "";
  let out = "";
  while (n > 0) {
    out = ALPH[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}

export function fromBase62(input: string) {
  const s = String(input || "").trim();
  if (!s) return null;

  let n = 0;
  for (const ch of s) {
    const v = MAP[ch];
    if (v === undefined) return null; // حرف غير Base62
    n = n * 62 + v;
    if (!Number.isFinite(n) || n > Number.MAX_SAFE_INTEGER) return null;
  }

  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
