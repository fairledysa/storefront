// FILE: apps/storefront/src/themes/malak/screens-mobile/categories/CategoriesMobileScreen.tsx
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

type SearchResult = {
  id: string;
  title: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  path: string;
};

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

function getChildren(node: CategoryNode | null | undefined) {
  return cleanNodes(node?.children);
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

function collectSearchResults(args: {
  roots: CategoryNode[];
  query: string;
  seoMode: SeoUrlMode;
}) {
  const q = args.query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  function walk(node: CategoryNode, parents: string[]) {
    const title = s(node.name);
    const path = [...parents, title].filter(Boolean).join(" / ");

    if (title.toLowerCase().includes(q) || path.toLowerCase().includes(q)) {
      results.push({
        id: String(node.id),
        title,
        href: hrefForCategory(node, args.seoMode),
        imageUrl: getImageUrl(node),
        imageAlt: getImageAlt(node),
        path,
      });
    }

    getChildren(node).forEach((child) => walk(child, [...parents, title]));
  }

  args.roots.forEach((root) => walk(root, []));

  return results.slice(0, 40);
}

function CategoryImage({
  node,
  className,
}: {
  node: CategoryNode;
  className: string;
}) {
  const imageUrl = getImageUrl(node);

  if (!imageUrl) return null;

  return (
    <span className={className}>
      <img src={imageUrl} alt={getImageAlt(node)} loading="lazy" decoding="async" />
    </span>
  );
}

function SearchIcon() {
  return <Icon icon={"Search01" as any} size={19} />;
}

function ArrowIcon() {
  return <Icon icon={"ArrowLeft01" as any} size={15} />;
}

export default function CategoriesMobileScreen({ seoMode }: Props) {
  const { tree, loading, error } = useCategoriesTree({ maxDepth: 3 });

  const roots = useMemo(() => cleanNodes(tree), [tree]);
  const [activeId, setActiveId] = useState("");
  const [q, setQ] = useState("");

  const query = q.trim();

  useEffect(() => {
    if (!roots.length) {
      setActiveId("");
      return;
    }

    const exists = roots.some((root) => String(root.id) === String(activeId));
    if (!activeId || !exists) setActiveId(String(roots[0].id));
  }, [roots, activeId]);

  const activeRoot = useMemo(() => {
    if (!roots.length) return null;

    return (
      roots.find((root) => String(root.id) === String(activeId)) ?? roots[0]
    );
  }, [roots, activeId]);

  const directChildren = useMemo(() => getChildren(activeRoot), [activeRoot]);

  const childImages = useMemo(() => {
    return directChildren.filter((child) => getImageUrl(child)).slice(0, 3);
  }, [directChildren]);

  const groups = useMemo(() => {
    return directChildren
      .map((child) => ({
        node: child,
        items: getChildren(child),
      }))
      .filter((group) => group.items.length > 0);
  }, [directChildren]);

  const searchResults = useMemo(() => {
    return collectSearchResults({
      roots,
      query,
      seoMode,
    });
  }, [roots, query, seoMode]);

  if (loading) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <span className="mk-mcat__loader" />
          <strong>جاري تحميل الأقسام</strong>
          <small>لحظات ونجهز لك القائمة.</small>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <strong>تعذر تحميل الأقسام</strong>
          <small>{error}</small>
        </div>
      </div>
    );
  }

  if (!roots.length || !activeRoot) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <strong>لا توجد أقسام</strong>
          <small>لم يتم إضافة أقسام لهذا المتجر بعد.</small>
        </div>
      </div>
    );
  }

  const activeRootHref = hrefForCategory(activeRoot, seoMode);
  const activeRootImage = getImageUrl(activeRoot);

  return (
    <div dir="rtl" className="mk-mcat">
      <header className="mk-mcat__searchBar">
        <div className="mk-mcat__search">
          <span className="mk-mcat__searchIcon" aria-hidden="true">
            <SearchIcon />
          </span>

          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="mk-mcat__searchInput"
            placeholder="ابحث في الأقسام..."
            type="search"
          />

          {query ? (
            <button
              type="button"
              className="mk-mcat__searchClear"
              onClick={() => setQ("")}
              aria-label="مسح البحث"
            >
              ×
            </button>
          ) : null}
        </div>
      </header>

      {query ? (
        <main className="mk-mcat__searchPage">
          <div className="mk-mcat__searchHead">
            <strong>نتائج البحث</strong>
            <span>{searchResults.length} نتيجة</span>
          </div>

          {searchResults.length ? (
            <div className="mk-mcat__resultList">
              {searchResults.map((result) => (
                <Link
                  key={result.id}
                  href={result.href}
                  className={[
                    "mk-mcat__result",
                    result.imageUrl ? "has-image" : "is-text-only",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {result.imageUrl ? (
                    <span className="mk-mcat__resultMedia">
                      <img
                        src={result.imageUrl}
                        alt={result.imageAlt}
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                  ) : null}

                  <span className="mk-mcat__resultText">
                    <strong>{result.title}</strong>
                    <small>{result.path}</small>
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
              <small>جرّب اسم قسم آخر أو كلمة أقصر.</small>
            </div>
          )}
        </main>
      ) : (
        <main className="mk-mcat__app">
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

          <section className="mk-mcat__content" aria-label="تفاصيل القسم">
            <Link
              href={activeRootHref}
              className={[
                "mk-mcat__hero",
                activeRootImage ? "has-image" : "",
                !activeRootImage && childImages.length ? "has-collage" : "",
                !activeRootImage && !childImages.length ? "is-plain" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {activeRootImage ? (
                <img
                  className="mk-mcat__heroImg"
                  src={activeRootImage}
                  alt={getImageAlt(activeRoot)}
                  loading="eager"
                  decoding="async"
                />
              ) : childImages.length ? (
                <span className="mk-mcat__heroCollage" aria-hidden="true">
                  {childImages.map((child) => (
                    <img
                      key={child.id}
                      src={getImageUrl(child)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </span>
              ) : null}

              <span className="mk-mcat__heroShade" />

              <span className="mk-mcat__heroText">
                <small>القسم الحالي</small>
                <strong>{activeRoot.name}</strong>
              </span>
            </Link>

            <section className="mk-mcat__section">
              <div className="mk-mcat__sectionHead">
                <strong>{activeRoot.name}</strong>

                <Link href={activeRootHref} className="mk-mcat__viewAll">
                  عرض الكل
                </Link>
              </div>

              {directChildren.length ? (
                <div className="mk-mcat__quickGrid">
                  {directChildren.slice(0, 12).map((child) => {
                    const href = hrefForCategory(child, seoMode);
                    const imageUrl = getImageUrl(child);

                    return (
                      <Link
                        key={child.id}
                        href={href}
                        className={[
                          "mk-mcat__tile",
                          imageUrl ? "has-image" : "is-text-only",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <CategoryImage
                          node={child}
                          className="mk-mcat__tileMedia"
                        />

                        <span className="mk-mcat__tileTitle">{child.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Link href={activeRootHref} className="mk-mcat__singleLink">
                  <span>عرض منتجات {activeRoot.name}</span>
                  <ArrowIcon />
                </Link>
              )}

              {directChildren.length ? (
                <Link href={activeRootHref} className="mk-mcat__allProducts">
                  جميع المنتجات
                </Link>
              ) : null}
            </section>

            {groups.length ? (
              <div className="mk-mcat__groups">
                {groups.map((group) => {
                  const groupHref = hrefForCategory(group.node, seoMode);

                  return (
                    <section key={group.node.id} className="mk-mcat__groupCard">
                      <div className="mk-mcat__groupHead">
                        <strong>{group.node.name}</strong>

                        <Link href={groupHref}>عرض الكل</Link>
                      </div>

                      <div className="mk-mcat__chips">
                        {group.items.slice(0, 9).map((item) => {
                          const href = hrefForCategory(item, seoMode);
                          const imageUrl = getImageUrl(item);

                          return (
                            <Link
                              key={item.id}
                              href={href}
                              className={[
                                "mk-mcat__chip",
                                imageUrl ? "has-image" : "is-text-only",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <CategoryImage
                                node={item}
                                className="mk-mcat__chipMedia"
                              />

                              <span>{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}
          </section>
        </main>
      )}
    </div>
  );
}