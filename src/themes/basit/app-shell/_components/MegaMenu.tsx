// FILE: apps/storefront/src/themes/basit/app-shell/_components/MegaMenu.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { SeoUrlMode } from "@/data/store/settings";
import type {
  MalakBootstrapCategory,
  MalakBootstrapMegaMenuCategorySettings,
  MalakBootstrapMegaMenuValue,
} from "../../bootstrap/types";

type Props = {
  categories: MalakBootstrapCategory[];
  megaMenu?: MalakBootstrapMegaMenuValue;
  showSide?: boolean;
  initialActiveId?: string | null;
  onNavigate?: () => void;
  seoMode?: SeoUrlMode;
};

type BalancedLane = {
  id: string;
  weight: number;
  items: MalakBootstrapCategory[];
};

const MAX_COLUMN_CHILDREN = 12;
const MAX_COLUMNS = 16;
const MAX_BANNERS = 6;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function cleanAlt(value: unknown) {
  return s(value)
    .replace(/\s+/g, " ")
    .replace(/[|]+/g, " ")
    .trim();
}

function normalizeHref(value: unknown) {
  const href = s(value);
  if (!href) return "";

  if (
    href === "#" ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("whatsapp:")
  ) {
    return href;
  }

  return `/${href}`;
}

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("whatsapp:")
  );
}

function sortCategories<T extends { sort_order?: number | null; name?: string }>(
  rows: T[],
) {
  return [...rows].sort((a, b) => {
    const ao = Number(a.sort_order ?? 0);
    const bo = Number(b.sort_order ?? 0);

    if (ao !== bo) return ao - bo;

    return s(a.name).localeCompare(s(b.name), "ar");
  });
}

function cleanCategories(
  categories: MalakBootstrapCategory[] | undefined | null,
) {
  if (!Array.isArray(categories)) return [];

  return sortCategories(
    categories.filter((category) => {
      return Boolean(category?.id) && Boolean(s(category?.name));
    }),
  );
}

function getChildren(category: MalakBootstrapCategory) {
  return cleanCategories(category.children);
}

function getCategorySettings(
  megaMenu: MalakBootstrapMegaMenuValue | undefined,
  categoryId: string,
): MalakBootstrapMegaMenuCategorySettings | null {
  const settings = megaMenu?.categories?.[categoryId];
  if (!settings?.enabled) return null;

  return settings;
}

function getActiveBanners(
  settings: MalakBootstrapMegaMenuCategorySettings | null,
) {
  if (!settings) return [];

  return [...(settings.banners || [])]
    .filter((banner) => banner.is_enabled && banner.image_url)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .slice(0, MAX_BANNERS);
}

function hasCategoryContent(args: {
  category: MalakBootstrapCategory;
  megaMenu?: MalakBootstrapMegaMenuValue;
}) {
  const children = getChildren(args.category);
  const settings = getCategorySettings(args.megaMenu, String(args.category.id));
  const banners = getActiveBanners(settings);

  return children.length > 0 || banners.length > 0;
}

function firstActiveCategory(
  categories: MalakBootstrapCategory[],
  initialActiveId?: string | null,
  megaMenu?: MalakBootstrapMegaMenuValue,
) {
  if (!Array.isArray(categories) || categories.length === 0) return null;

  if (initialActiveId) {
    const found = categories.find(
      (category) => String(category.id) === String(initialActiveId),
    );

    if (found) return found;
  }

  const withContent = categories.find((category) =>
    hasCategoryContent({
      category,
      megaMenu,
    }),
  );

  return withContent ?? categories[0] ?? null;
}

function getBannerModeClass(count: number) {
  if (count <= 0) return "";
  if (count === 1) return "mk-mega--one-banner";
  if (count === 2) return "mk-mega--two-banners";
  return "mk-mega--banner-grid";
}

function getContentDensityClass(columnsCount: number) {
  if (columnsCount <= 4) return "mk-mega--few-cols";
  if (columnsCount <= 8) return "mk-mega--normal-cols";
  return "mk-mega--many-cols";
}

function getLaneCount(args: { columnsCount: number; hasBanners: boolean }) {
  const count = Number(args.columnsCount || 0);

  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;

  if (args.hasBanners) {
    if (count <= 6) return 3;
    return 4;
  }

  if (count <= 4) return count;
  return 4;
}

function getCategoryWeight(category: MalakBootstrapCategory) {
  const children = getChildren(category);

  return 2 + Math.min(children.length, MAX_COLUMN_CHILDREN);
}

function buildBalancedLanes(
  categories: MalakBootstrapCategory[],
  laneCount: number,
): BalancedLane[] {
  const safeLaneCount = Math.max(1, Math.min(5, Number(laneCount || 1)));

  const lanes: BalancedLane[] = Array.from({ length: safeLaneCount }).map(
    (_, index) => ({
      id: `lane-${index + 1}`,
      weight: 0,
      items: [],
    }),
  );

  categories.forEach((category) => {
    const weight = getCategoryWeight(category);

    const targetLane = lanes.reduce((best, current) => {
      if (current.weight < best.weight) return current;
      return best;
    }, lanes[0]);

    targetLane.items.push(category);
    targetLane.weight += weight;
  });

  return lanes;
}

function CategoryThumb({ category }: { category: MalakBootstrapCategory }) {
  const imageUrl = s(category.image?.url);
  const categoryName = cleanAlt(category.name) || "القسم";

  return (
    <span className="mk-mega__thumb">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={categoryName}
          className="mk-mega__thumbImg"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="mk-mega__thumbFallback" aria-hidden="true">
          {categoryName.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

function getBannerAlt(args: {
  title?: string | null;
  categoryName?: string | null;
  index: number;
}) {
  const title = cleanAlt(args.title);
  if (title) return title;

  const categoryName = cleanAlt(args.categoryName);
  if (categoryName) return `عرض ${categoryName}`;

  return `عرض القائمة ${args.index + 1}`;
}

function LinkItem({
  href,
  children,
  className,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  className: string;
  onNavigate?: () => void;
}) {
  const finalHref = normalizeHref(href) || "#";

  if (finalHref === "#") {
    return (
      <span className={className} onClick={onNavigate}>
        {children}
      </span>
    );
  }

  if (isExternalHref(finalHref)) {
    return (
      <a
        href={finalHref}
        className={className}
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={finalHref}
      prefetch={false}
      className={className}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

function CategoryColumn({
  category,
  onNavigate,
}: {
  category: MalakBootstrapCategory;
  onNavigate?: () => void;
}) {
  const children = getChildren(category).slice(0, MAX_COLUMN_CHILDREN);

  return (
    <div
      className={[
        "mk-mega__col",
        children.length > 0 ? "mk-mega__col--hasChildren" : "mk-mega__col--leaf",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LinkItem
        href={category.href}
        className="mk-mega__titleLink"
        onNavigate={onNavigate}
      >
        <div className="mk-mega__titleRow">
          <span className="mk-mega__titleArrow" aria-hidden="true">
            ›
          </span>
          <span className="mk-mega__title">{category.name}</span>
        </div>
      </LinkItem>

      {children.length > 0 ? (
        <div className="mk-mega__links">
          {children.map((child) => (
            <LinkItem
              key={child.id}
              href={child.href}
              className="mk-mega__link"
              onNavigate={onNavigate}
            >
              {child.name}
            </LinkItem>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MegaBanners({
  settings,
  categoryName,
  onNavigate,
}: {
  settings: MalakBootstrapMegaMenuCategorySettings | null;
  categoryName?: string | null;
  onNavigate?: () => void;
}) {
  const banners = getActiveBanners(settings);

  if (!settings) return null;
  if (settings.layout !== "links_with_banners") return null;
  if (banners.length === 0) return null;

  return (
    <div className="mk-mega__banners" aria-label="عروض القائمة">
      {banners.map((banner, index) => (
        <LinkItem
          key={banner.id}
          href={banner.href || "#"}
          className="mk-mega__banner"
          onNavigate={onNavigate}
        >
          <img
            src={banner.image_url}
            alt={getBannerAlt({
              title: banner.title,
              categoryName,
              index,
            })}
            className="mk-mega__bannerImg"
            loading="lazy"
            decoding="async"
          />

          {banner.title ? (
            <span className="mk-mega__bannerTitle">{banner.title}</span>
          ) : null}
        </LinkItem>
      ))}
    </div>
  );
}

export default function MegaMenu({
  categories,
  megaMenu,
  showSide = true,
  initialActiveId = null,
  onNavigate,
}: Props) {
  const safeCategories = useMemo(() => {
    return cleanCategories(categories);
  }, [categories]);

  const firstCategory = useMemo(
    () => firstActiveCategory(safeCategories, initialActiveId, megaMenu),
    [safeCategories, initialActiveId, megaMenu],
  );

  const [activeId, setActiveId] = useState<string | null>(
    firstCategory?.id ? String(firstCategory.id) : null,
  );

  useEffect(() => {
    setActiveId(firstCategory?.id ? String(firstCategory.id) : null);
  }, [firstCategory?.id]);

  const activeCategory = useMemo(() => {
    if (!activeId) return firstCategory;

    return (
      safeCategories.find(
        (category) => String(category.id) === String(activeId),
      ) ?? firstCategory
    );
  }, [safeCategories, activeId, firstCategory]);

  const settings = useMemo(() => {
    if (!activeCategory) return null;
    return getCategorySettings(megaMenu, String(activeCategory.id));
  }, [activeCategory, megaMenu]);

  const banners = useMemo(() => getActiveBanners(settings), [settings]);

  const rootChildren = useMemo(() => {
    if (!activeCategory) return [];
    return getChildren(activeCategory);
  }, [activeCategory]);

  const sideRows = useMemo(() => {
    if (!showSide) return [];

    return safeCategories.map((category) => {
      const id = String(category.id);
      const categorySettings = getCategorySettings(megaMenu, id);

      const categoryHasContent = hasCategoryContent({
        category,
        megaMenu,
      });

      return {
        category,
        id,
        categorySettings,
        categoryHasContent,
      };
    });
  }, [safeCategories, showSide, megaMenu]);

  if (!activeCategory) return null;

  const hasBanners =
    Boolean(settings) &&
    settings?.layout === "links_with_banners" &&
    banners.length > 0;

  if (!showSide && rootChildren.length === 0 && !hasBanners) {
    return null;
  }

  const columns = rootChildren.slice(0, MAX_COLUMNS);
  const laneCount = getLaneCount({
    columnsCount: columns.length,
    hasBanners,
  });

  const lanes = buildBalancedLanes(columns, laneCount);
  const bannerModeClass = getBannerModeClass(banners.length);
  const densityClass = getContentDensityClass(columns.length);

  return (
    <div
      dir="rtl"
      className={[
        "mk-mega",
        hasBanners ? "mk-mega--with-banners" : "mk-mega--links-only",
        bannerModeClass,
        densityClass,
        !showSide ? "mk-mega--single-root" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--mk-mega-lanes": laneCount,
        } as CSSProperties
      }
    >
      <div className="mk-mega__inner">
        {showSide ? (
          <aside className="mk-mega__side" aria-label="الأقسام الرئيسية">
            {sideRows.map(
              ({ category, id, categorySettings, categoryHasContent }) => {
                const isActive = String(category.id) === String(activeCategory.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    className={[
                      "mk-mega__sideButton",
                      isActive ? "is-active" : "",
                      categorySettings ? "has-mega" : "",
                      categoryHasContent ? "has-content" : "is-empty",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => {
                      setActiveId((current) => (current === id ? current : id));
                    }}
                    onFocus={() => {
                      setActiveId((current) => (current === id ? current : id));
                    }}
                  >
                    <span className="mk-mega__sideButtonInner">
                      <span className="mk-mega__sideMain">
                        <CategoryThumb category={category} />
                        <span className="mk-mega__sideName">
                          {category.name}
                        </span>
                      </span>

                      {categoryHasContent ? (
                        <span className="mk-mega__sideArrow" aria-hidden="true">
                          ‹
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              },
            )}
          </aside>
        ) : null}

        <section className="mk-mega__content">
          <div className="mk-mega__head">
            <div className="mk-mega__headText">
              <LinkItem
                href={activeCategory.href}
                className="mk-mega__rootTitle"
                onNavigate={onNavigate}
              >
                {activeCategory.name}
              </LinkItem>

              <div className="mk-mega__rootHint">
                تصفح الفروع والعروض المرتبطة بهذا القسم
              </div>
            </div>

            <LinkItem
              href={activeCategory.href}
              className="mk-mega__viewAll"
              onNavigate={onNavigate}
            >
              عرض الكل
            </LinkItem>
          </div>

          <div
            className={[
              "mk-mega__body",
              hasBanners ? "mk-mega__body--withBanners" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="mk-mega__grid" aria-label="فروع القسم">
              {lanes.length > 0 && columns.length > 0 ? (
                lanes.map((lane) => (
                  <div className="mk-mega__lane" key={lane.id}>
                    {lane.items.map((category) => (
                      <CategoryColumn
                        key={category.id}
                        category={category}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="mk-mega__empty">لا توجد فروع لهذا القسم.</div>
              )}
            </div>

            {hasBanners ? (
              <MegaBanners
                settings={settings}
                categoryName={activeCategory.name}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}