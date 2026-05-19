// apps/storefront/src/scripts/backfill-short-urls.ts
import { supabaseAdmin } from "@/data/store/supabase.server";

// Base62 (0-9a-zA-Z)
const ALPH = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toBase62(num: number) {
  let n = Math.floor(num);
  if (!Number.isFinite(n) || n <= 0) return "";
  let out = "";
  while (n > 0) {
    out = ALPH[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}

async function urlExists(
  sb: any,
  table: "category_metadata" | "product_metadata",
  url: string,
) {
  const r = await sb.from(table).select("url").eq("url", url).limit(1);
  return (r.data?.length ?? 0) > 0;
}

async function generateUniqueUrl(
  sb: any,
  table: "category_metadata" | "product_metadata",
  publicNo: number,
) {
  const base = toBase62(publicNo);
  if (!base) throw new Error(`Invalid public_no: ${publicNo}`);

  // جرّب base ثم base + لاحقة بسيطة عند التصادم
  if (!(await urlExists(sb, table, base))) return base;

  for (let i = 1; i < 62; i++) {
    const candidate = `${base}${ALPH[i]}`;
    if (!(await urlExists(sb, table, candidate))) return candidate;
  }

  // احتياط إضافي
  for (let i = 1; i < 999; i++) {
    const candidate = `${base}${i}`;
    if (!(await urlExists(sb, table, candidate))) return candidate;
  }

  throw new Error(
    `Could not resolve collision for public_no=${publicNo} on table=${table}`,
  );
}

async function main() {
  const sb = supabaseAdmin() as any;

  const STORE_ID = process.env.DEV_STORE_ID || process.env.STORE_ID || ""; // تقدر تحطها نصًا هنا إذا تبي

  if (!STORE_ID) {
    throw new Error("Set DEV_STORE_ID (or STORE_ID) env var.");
  }

  // =========================
  // 1) Categories: fill NULL short_url
  // =========================
  const cats = await sb
    .from("categories")
    .select("id, store_id, public_no, category_metadata(url)")
    .eq("store_id", STORE_ID);

  if (cats.error) throw cats.error;

  const catRows = (cats.data || []) as any[];

  for (const c of catRows) {
    const current = c.category_metadata?.url ?? null;
    const publicNo = typeof c.public_no === "number" ? c.public_no : null;

    if (current || !publicNo) continue;

    const code = await generateUniqueUrl(sb, "category_metadata", publicNo);

    const up = await sb
      .from("category_metadata")
      .upsert({ category_id: c.id, url: code }, { onConflict: "category_id" });

    if (up.error) throw up.error;

    console.log("[category] set short_url:", c.id, publicNo, code);
  }

  // =========================
  // 2) Products: fill NULL short_url
  // =========================
  const prods = await sb
    .from("products")
    .select("id, store_id, public_no, product_metadata(url)")
    .eq("store_id", STORE_ID);

  if (prods.error) throw prods.error;

  const prodRows = (prods.data || []) as any[];

  for (const p of prodRows) {
    const current = p.product_metadata?.url ?? null;
    const publicNo = typeof p.public_no === "number" ? p.public_no : null;

    // لا نلمس الموجود (حتى لو كان عربي زي "مسار")
    if (current || !publicNo) continue;

    const code = await generateUniqueUrl(sb, "product_metadata", publicNo);

    const up = await sb
      .from("product_metadata")
      .upsert({ product_id: p.id, url: code }, { onConflict: "product_id" });

    if (up.error) throw up.error;

    console.log("[product] set short_url:", p.id, publicNo, code);
  }

  console.log("DONE ✅");
}

main().catch((e) => {
  console.error("FAILED ❌", e);
  process.exit(1);
});
