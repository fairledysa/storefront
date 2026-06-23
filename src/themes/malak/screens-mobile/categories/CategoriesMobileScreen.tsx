// FILE: apps/storefront/src/themes/malak/screens-mobile/categories/CategoriesMobileScreen.tsx
"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import Icon from "@/components/icon/Icon";
import { buildCategoryHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";

import MobileProductsGrid from "../category/_components/MobileProductsGrid";
import {
  useCategoriesTree,
  type CategoryNode,
} from "../../app-shell/_hooks/useCategoriesTree";

type Props = {
  data?: any;
  mode?: SeoUrlMode;
  seoMode?: SeoUrlMode;
};

type SortKey = "" | "latest" | "popular" | "price_asc" | "price_desc";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "", label: "التوصية" },
  { value: "latest", label: "الأحدث" },
  { value: "popular", label: "الأكثر طلبًا" },
  { value: "price_asc", label: "السعر ↑" },
  { value: "price_desc", label: "السعر ↓" },
];

const subscribeToHydration = () => () => {};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function cleanNodes(nodes: CategoryNode[] | undefined | null): CategoryNode[] {
  if (!Array.isArray(nodes)) return [];

  return [...nodes]
    .filter((node) => Boolean(node?.id) && Boolean(s(node?.name)))
    .sort((a, b) => {
      const ao = Number(a?.sort_order ?? 0);
      const bo = Number(b?.sort_order ?? 0);

      if (ao !== bo) return ao - bo;

      return s(a?.name).localeCompare(s(b?.name), "ar");
    });
}

function getImageUrl(node: CategoryNode | null | undefined) {
  return s(node?.image?.url);
}

function getImageAlt(node: CategoryNode | null | undefined) {
  return s(node?.image?.alt) || s(node?.name) || "القسم";
}

function hrefForCategory(node: CategoryNode, seoMode: SeoUrlMode) {
  return buildCategoryHref({
    mode: seoMode,
    slugNameAr: node?.name ?? "",
    slugNameEn: node?.slug ?? node?.name ?? "",
    publicNo: Number(node?.public_no ?? 0),
    shortCode: node?.short_url ?? null,
  });
}

function normalizeMode(value: any): SeoUrlMode {
  const mode = s(value);

  if (mode === "short" || mode === "named_ar" || mode === "named_en") {
    return mode;
  }

  return "named_ar";
}

function normalizeSort(value: unknown): SortKey {
  const text = s(value).toLowerCase();

  if (text === "latest" || text === "newest" || text === "new") {
    return "latest";
  }

  if (text === "popular" || text === "best_selling" || text === "best-selling") {
    return "popular";
  }

  if (text === "price_asc" || text === "price-asc" || text === "low_price") {
    return "price_asc";
  }

  if (text === "price_desc" || text === "price-desc" || text === "high_price") {
    return "price_desc";
  }

  return "";
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function openSmartSearch() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("mk:search:open"));
}

function SearchIcon() {
  return <Icon icon={"Search01" as any} size={19} />;
}

export default function CategoriesMobileScreen({ data, mode, seoMode }: Props) {
  const activeMode = normalizeMode(mode ?? seoMode);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { tree, loading, error } = useCategoriesTree({ maxDepth: 6 });

  /*
   * أثناء SSR وأول hydration نرجع false في الطرفين،
   * وبعد hydration يصبح true بدون setState داخل useEffect.
   */
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const roots = useMemo(() => cleanNodes(tree), [tree]);
  const visibleRoots = hasHydrated ? roots : [];
  const showRootSkeleton =
    !hasHydrated || (loading && visibleRoots.length === 0);

  const searchParamsText = searchParams.toString();
  const activeSort = normalizeSort(searchParams.get("sort"));
  const products = Array.isArray(data?.products) ? data.products : [];

  const setSort = (value: SortKey) => {
    const params = new URLSearchParams(searchParamsText);

    if (value) params.set("sort", value);
    else params.delete("sort");

    startTransition(() => {
      router.replace(buildUrl(pathname, params), { scroll: false });
    });
  };

  return (
    <div dir="rtl" className="mk-mcat mk-mcat--catalog">
      <header className="mk-mcat__searchBar">
        <button
          type="button"
          className="mk-mcat__smartSearch"
          onClick={openSmartSearch}
          aria-label="فتح البحث"
        >
          <span className="mk-mcat__searchIcon" aria-hidden="true">
            <SearchIcon />
          </span>

          <span>ابحثي عن منتج أو قسم</span>
          <small>فتح</small>
        </button>
      </header>

      <nav className="mk-mcat__rootStrip" aria-label="الأقسام الرئيسية">
        <span className="mk-mcat__rootChip is-active">
          <span className="mk-mcat__rootChipMedia">#</span>
          <strong>كل الأقسام</strong>
        </span>

        {visibleRoots.map((root) => {
          const imageUrl = getImageUrl(root);
          const name = s(root.name);

          return (
            <Link
              key={s(root.id) || name}
              href={hrefForCategory(root, activeMode)}
              className="mk-mcat__rootChip"
            >
              <span className="mk-mcat__rootChipMedia">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={getImageAlt(root)}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span>{name.slice(0, 1)}</span>
                )}
              </span>

              <strong>{name}</strong>
            </Link>
          );
        })}

        {showRootSkeleton
          ? Array.from({ length: 4 }).map((_, index) => (
              <span
                key={`root-skeleton-${index}`}
                className="mk-mcat__rootChipSkeleton"
              />
            ))
          : null}
      </nav>

      {hasHydrated && error && !visibleRoots.length ? (
        <div className="mk-mcat__inlineNote">{error}</div>
      ) : null}

      <section className="mk-mcat__catalogTools" aria-label="ترتيب المنتجات">
        <div className="mk-mcat__sortRail" role="group">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value || "recommended"}
              type="button"
              className={activeSort === option.value ? "is-active" : ""}
              onClick={() => setSort(option.value)}
              disabled={isPending}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isPending ? <span>جاري التحديث…</span> : null}
      </section>

      {products.length ? (
        <MobileProductsGrid
          products={products}
          mode={activeMode}
          data={data}
          currencies={data?.bootstrap?.currencies}
          tax={data?.bootstrap?.tax}
          categoryId="__all__"
          searchParamsText={searchParamsText}
          pageInfo={data?.pagination}
        />
      ) : (
        <div className="mk-mcat__productsEmpty">
          لا توجد منتجات متاحة للعرض الآن.
        </div>
      )}
    </div>
  );
}
