// FILE: apps/storefront/src/app/(store)/[...slug]/_routing/parse-slug.tsx

export type RouteDecision =
  | { type: "home" }
  | { type: "named_category"; publicNo: number; slugName: string }
  | { type: "named_product"; publicNo: number; slugName: string }
  | { type: "short_category"; code: string } // ✅ NEW
  | { type: "short"; code: string }
  | { type: "unknown" };

export function parseSlug(slug: string[]): RouteDecision {
  if (!slug || slug.length === 0) return { type: "home" };

  // ✅ short category: /category/CODE
  if (slug.length === 2) {
    const seg0 = decodeURIComponent(slug[0] || "");
    const seg1 = decodeURIComponent(slug[1] || "");

    if (seg0 === "category" && seg1) {
      return { type: "short_category", code: seg1 };
    }

    // named routes: /{any}/c123 أو /{any}/p123
    const slugName = seg0;
    const codeSeg = seg1;
    const kind = codeSeg.slice(0, 1);
    const publicNo = Number(codeSeg.slice(1));

    if (Number.isFinite(publicNo) && publicNo > 0) {
      if (kind === "c") return { type: "named_category", publicNo, slugName };
      if (kind === "p") return { type: "named_product", publicNo, slugName };
    }

    return { type: "unknown" };
  }

  // short route: /CODE
  if (slug.length === 1) {
    const code = decodeURIComponent(slug[0] || "");
    return { type: "short", code };
  }

  return { type: "unknown" };
}
