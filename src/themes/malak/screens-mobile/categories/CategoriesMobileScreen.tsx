"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/icon/Icon";
import { buildCategoryHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";
import {
  useCategoriesTree,
  type CategoryNode,
} from "../../app-shell/_hooks/useCategoriesTree";

type Props = {
  seoMode: SeoUrlMode;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function cleanText(value: unknown) {
  return s(value).replace(/\s+/g, " ");
}

function sortCategories(nodes: CategoryNode[] | undefined | null) {
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

function getChildren(node: CategoryNode | null | undefined) {
  return sortCategories(node?.children);
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

function categoryImage(node: CategoryNode | null | undefined): string {
  return s(node?.image?.url);
}

function categoryAlt(node: CategoryNode | null | undefined) {
  return s(node?.image?.alt) || cleanText(node?.name) || "القسم";
}

function firstLetter(node: CategoryNode | null | undefined) {
  const name = cleanText(node?.name);
  return name ? name.slice(0, 1) : "•";
}

function firstDescendantImage(node: CategoryNode | null | undefined): string {
  const children = getChildren(node);

  for (const child of children) {
    const direct = categoryImage(child);
    if (direct) return direct;

    const nested = firstDescendantImage(child);
    if (nested) return nested;
  }

  return "";
}

function imageForNode(node: CategoryNode | null | undefined): string {
  return categoryImage(node) || firstDescendantImage(node);
}

function collectImages(node: CategoryNode | null | undefined, limit = 5) {
  const out: Array<{ url: string; alt: string }> = [];
  const seen = new Set<string>();

  function push(n: CategoryNode | null | undefined) {
    if (!n || out.length >= limit) return;

    const url = categoryImage(n);
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push({
        url,
        alt: categoryAlt(n),
      });
    }

    for (const child of getChildren(n)) {
      if (out.length >= limit) return;
      push(child);
    }
  }

  push(node);

  return out;
}

function flattenCategories(nodes: CategoryNode[]) {
  const out: CategoryNode[] = [];

  function walk(list: CategoryNode[]) {
    for (const node of list) {
      out.push(node);
      walk(getChildren(node));
    }
  }

  walk(nodes);

  return out;
}

function CategoryVisual({
  node,
  size = "md",
}: {
  node: CategoryNode;
  size?: "sm" | "md" | "lg";
}) {
  const img = imageForNode(node);
  const name = categoryAlt(node);

  return (
    <span className={`mk-mcat__visual mk-mcat__visual--${size}`}>
      {img ? (
        <img
          src={img}
          alt={name}
          loading="lazy"
          decoding="async"
          className="mk-mcat__visualImg"
        />
      ) : (
        <span className="mk-mcat__visualFallback" aria-hidden="true">
          {firstLetter(node)}
        </span>
      )}
    </span>
  );
}

function SearchIcon() {
  return <Icon icon={"Search01" as any} size={19} />;
}

function ArrowIcon() {
  return <Icon icon={"ArrowLeft01" as any} size={16} />;
}

export default function CategoriesMobileScreen({ seoMode }: Props) {
  const { tree, loading, error } = useCategoriesTree({ maxDepth: 3 });

  const roots = useMemo(() => sortCategories(tree), [tree]);

  const [queryValue, setQueryValue] = useState("");
  const query = queryValue.trim().toLowerCase();

  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (!roots.length) return;

    const exists = roots.some((root) => String(root.id) === String(activeId));

    if (!activeId || !exists) {
      setActiveId(String(roots[0].id));
    }
  }, [roots, activeId]);

  const activeRoot = useMemo(() => {
    return (
      roots.find((root) => String(root.id) === String(activeId)) ??
      roots[0] ??
      null
    );
  }, [roots, activeId]);

  const activeChildren = useMemo(() => getChildren(activeRoot), [activeRoot]);

  const groups = useMemo(() => {
    return activeChildren
      .map((child) => ({
        node: child,
        children: getChildren(child),
      }))
      .filter((group) => group.children.length > 0);
  }, [activeChildren]);

  const searchResults = useMemo(() => {
    if (!query) return [];

    return flattenCategories(roots)
      .filter((node) => s(node.name).toLowerCase().includes(query))
      .slice(0, 40);
  }, [roots, query]);

  const heroImages = useMemo(() => collectImages(activeRoot, 5), [activeRoot]);

  if (loading) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <span className="mk-mcat__loader" />
          <strong>جاري تحميل الأقسام</strong>
          <span>نجهز لك القائمة الآن…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <strong>تعذر تحميل الأقسام</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!roots.length || !activeRoot) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <strong>لا توجد أقسام</strong>
          <span>لم يتم إضافة أقسام للمتجر حتى الآن.</span>
        </div>
      </div>
    );
  }

  const activeHref = hrefForCategory(activeRoot, seoMode);

  return (
    <div dir="rtl" className="mk-mcat">
      <div className="mk-mcat__searchBar">
        <label className="mk-mcat__search">
          <span className="mk-mcat__searchIcon" aria-hidden="true">
            <SearchIcon />
          </span>

          <input
            value={queryValue}
            onChange={(event) => setQueryValue(event.target.value)}
            className="mk-mcat__searchInput"
            placeholder="بحث..."
            autoComplete="off"
          />
        </label>
      </div>

      {query ? (
        <main className="mk-mcat__searchPage">
          <div className="mk-mcat__blockTitle">
            <strong>نتائج البحث</strong>
            <span>{searchResults.length} نتيجة</span>
          </div>

          {searchResults.length ? (
            <div className="mk-mcat__resultList">
              {searchResults.map((node) => (
                <Link
                  key={node.id}
                  href={hrefForCategory(node, seoMode)}
                  className="mk-mcat__result"
                >
                  <CategoryVisual node={node} size="sm" />

                  <span className="mk-mcat__resultText">
                    <strong>{node.name}</strong>
                    <small>اضغط لعرض منتجات القسم</small>
                  </span>

                  <span className="mk-mcat__resultArrow" aria-hidden="true">
                    <ArrowIcon />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mk-mcat__empty">
              <strong>لا توجد نتائج</strong>
              <span>جرّب كلمة بحث مختلفة.</span>
            </div>
          )}
        </main>
      ) : (
        <div className="mk-mcat__app">
          <aside className="mk-mcat__rail" aria-label="الأقسام الرئيسية">
            {roots.map((root) => {
              const isActive = String(root.id) === String(activeRoot.id);

              return (
                <button
                  key={root.id}
                  type="button"
                  className={[
                    "mk-mcat__railItem",
                    isActive ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveId(String(root.id))}
                >
                  <span>{root.name}</span>
                </button>
              );
            })}
          </aside>

          <main className="mk-mcat__content" aria-label="تفاصيل القسم">
            <Link href={activeHref} className="mk-mcat__hero">
              {heroImages.length ? (
                <span className="mk-mcat__heroImages">
                  {heroImages.slice(0, 4).map((image) => (
                    <img
                      key={image.url}
                      src={image.url}
                      alt={image.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </span>
              ) : (
                <span className="mk-mcat__heroFallback" aria-hidden="true">
                  {firstLetter(activeRoot)}
                </span>
              )}

              <span className="mk-mcat__heroText">
                <small>القسم الحالي</small>
                <strong>{activeRoot.name}</strong>
              </span>
            </Link>

            <section className="mk-mcat__section">
              <div className="mk-mcat__sectionHead">
                <strong>{activeRoot.name}</strong>

                <Link href={activeHref}>عرض الكل</Link>
              </div>

              {activeChildren.length ? (
                <div className="mk-mcat__iconGrid">
                  {activeChildren.map((child) => (
                    <Link
                      key={child.id}
                      href={hrefForCategory(child, seoMode)}
                      className="mk-mcat__iconCard"
                    >
                      <CategoryVisual node={child} size="md" />
                      <span>{child.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href={activeHref} className="mk-mcat__allProducts">
                  جميع المنتجات
                </Link>
              )}

              {activeChildren.length ? (
                <Link href={activeHref} className="mk-mcat__allProducts">
                  جميع المنتجات
                </Link>
              ) : null}
            </section>

            {groups.map((group) => (
              <section key={group.node.id} className="mk-mcat__group">
                <div className="mk-mcat__groupHead">
                  <strong>{group.node.name}</strong>

                  <Link href={hrefForCategory(group.node, seoMode)}>
                    عرض الكل
                  </Link>
                </div>

                <div className="mk-mcat__miniGrid">
                  {group.children.slice(0, 9).map((child) => (
                    <Link
                      key={child.id}
                      href={hrefForCategory(child, seoMode)}
                      className="mk-mcat__miniCard"
                    >
                      <CategoryVisual node={child} size="sm" />
                      <span>{child.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      )}
    </div>
  );
}