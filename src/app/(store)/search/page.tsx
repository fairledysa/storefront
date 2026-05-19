// FILE: apps/storefront/src/app/(store)/search/page.tsx

import { notFound } from "next/navigation";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { renderTemplate } from "@/theme-engine/runtime/render-template";
import type { ThemeCode } from "@/theme-engine/types";
import { loadSearchPage } from "@/data/pages/search.loader";

type SP = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeThemeCode(value: any): ThemeCode {
  const code = s(value);

  if (code === "malak") return "malak";
  if (code === "classic") return "classic";

  return "malak";
}

export default async function SearchPage(props: {
  searchParams?: Promise<SP> | SP;
}) {
  const ctx = await resolveStoreContext();
  if (!ctx.store) return notFound();

  const themeAny = ((ctx as any)?.theme || {}) as Record<string, any>;

  const themeCode = normalizeThemeCode(
    themeAny.theme_key ||
      themeAny.key ||
      themeAny.code ||
      themeAny.theme_code ||
      "malak",
  );

  if (themeCode !== "malak") return notFound();

  const spRaw = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : {};

  const q = firstParam(spRaw.q);
  const sort = firstParam(spRaw.sort);
  const preview = firstParam(spRaw.preview) === "1";

  const data = await loadSearchPage({
    store_id: ctx.store.id,
    q,
    sort,
    limit: 60,
  });

  return await renderTemplate({
    template: "cart",
    themeCode,
    store: {
      id: ctx.store.id,
      slug: ctx.store.slug,
      name: ctx.store.name,
      logo_url: ctx.store.logo_url ?? null,
      favicon_url: ctx.store.favicon_url ?? null,
    },
    theme: {
      code: themeCode,
      settings:
        themeAny.options && typeof themeAny.options === "object"
          ? themeAny.options
          : {},
    },
    sections: [],
    data: {
      ...data,
      route: "search",
      preview,
    },
    children: null,
  });
}