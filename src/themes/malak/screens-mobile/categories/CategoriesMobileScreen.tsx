// FILE: apps/storefront/src/themes/malak/screens-mobile/categories/CategoriesMobileScreen.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import Icon from "@/components/icon/Icon";
import { useCategoriesTree } from "../../app-shell/_hooks/useCategoriesTree";
import { buildCategoryHref } from "@/lib/seo/build-store-href";
import type { SeoUrlMode } from "@/data/store/settings";

type MainCat = {
  id: string;
  title: string;
  hero?: { image?: string; title?: string };
  node: any;
  groups: Array<{
    title: string;
    items: Array<{ id: string; title: string; node: any }>;
  }>;
};

function ChevronDown() {
  return <Icon icon={"ArrowDown01" as any} size={18} />;
}

function SearchIcon() {
  return <Icon icon={"Search01" as any} size={18} />;
}

function hrefForCategory(node: any, seoMode: SeoUrlMode) {
  return buildCategoryHref({
    mode: seoMode,
    slugNameAr: node?.name ?? "",
    slugNameEn: node?.name ?? "",
    publicNo: Number(node?.public_no ?? 0),
    shortCode: node?.short_url ?? null,
  });
}

type Props = { seoMode: SeoUrlMode };

export default function CategoriesMobileScreen({ seoMode }: Props) {
  const { tree, loading, error } = useCategoriesTree({ maxDepth: 3 });

  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const DATA: MainCat[] = useMemo(() => {
    const roots = Array.isArray(tree) ? tree : [];

    const mapped: MainCat[] = roots.map((root: any) => {
      const groups =
        Array.isArray(root?.children) && root.children.length
          ? root.children.map((child: any) => {
              const items =
                Array.isArray(child?.children) && child.children.length
                  ? child.children.map((g: any) => ({
                      id: String(g?.id),
                      title: String(g?.name ?? ""),
                      node: g,
                    }))
                  : [];

              return {
                title: String(child?.name ?? "جميع المنتجات"),
                items: items.length
                  ? items
                  : [{ id: String(child?.id), title: "عرض الكل", node: child }],
              };
            })
          : [
              {
                title: "جميع المنتجات",
                items: [
                  { id: String(root?.id), title: "عرض الكل", node: root },
                ],
              },
            ];

      return {
        id: String(root?.id),
        title: String(root?.name ?? ""),
        hero: root?.image?.url ? { image: root.image.url } : undefined,
        node: root,
        groups,
      };
    });

    if (!query) return mapped;

    return mapped
      .map((m) => {
        const railMatch = m.title.toLowerCase().includes(query);

        const filteredGroups = m.groups
          .map((g) => {
            const groupMatch = g.title.toLowerCase().includes(query);
            const filteredItems = g.items.filter((it) =>
              it.title.toLowerCase().includes(query),
            );

            if (groupMatch) return g;
            if (filteredItems.length) return { ...g, items: filteredItems };
            return null;
          })
          .filter(Boolean) as MainCat["groups"];

        if (railMatch) return m;
        if (filteredGroups.length) return { ...m, groups: filteredGroups };
        return null;
      })
      .filter(Boolean) as MainCat[];
  }, [tree, query]);

  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (!activeId && DATA[0]?.id) setActiveId(DATA[0].id);
  }, [DATA, activeId]);

  const active = useMemo(
    () => DATA.find((c) => c.id === activeId) ?? DATA[0],
    [DATA, activeId],
  );

  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const toggleKey = useCallback((key: string) => {
    setOpenKeys((s) => ({ ...s, [key]: !(s[key] ?? true) }));
  }, []);

  if (loading) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <div className="mk-mcat__stateText">جاري تحميل الأقسام…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <div className="mk-mcat__stateText mk-mcat__stateText--error">
            تعذر تحميل الأقسام
          </div>
          <div className="mk-mcat__stateSub">{error}</div>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div dir="rtl" className="mk-mcat">
        <div className="mk-mcat__state">
          <div className="mk-mcat__stateText">لا توجد أقسام</div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mk-mcat">
      <div className="mk-mcat__searchWrap">
        <div className="mk-mcat__search">
          <span className="mk-mcat__searchIcon" aria-hidden="true">
            <SearchIcon />
          </span>

          <input
            className="mk-mcat__searchInput"
            placeholder="بحث..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mk-mcat__body">
        <aside className="mk-mcat__rail" aria-label="الأقسام الرئيسية">
          {DATA.map((c) => {
            const isActive = c.id === activeId;
            const href = hrefForCategory(c.node, seoMode);

            return (
              <Link
                key={c.id}
                href={href}
                className={`mk-mcat__railItem ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveId(c.id);
                }}
              >
                {c.title}
              </Link>
            );
          })}
        </aside>

        <section className="mk-mcat__panel" aria-label="تفاصيل القسم">
          {active?.hero?.image ? (
            <div className="mk-mcat__hero">
              <img
                className="mk-mcat__heroImg"
                src={active.hero.image}
                alt={active.title}
              />
            </div>
          ) : null}

          <div className="mk-mcat__cards">
            {active?.groups?.map((g) => {
              const key = `${active.id}:${g.title}`;
              const isOpen = openKeys[key] ?? true;

              return (
                <div key={key} className="mk-mcat__group">
                  <a
                    href="#"
                    className="mk-mcat__groupHead"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleKey(key);
                    }}
                    aria-expanded={isOpen}
                    role="button"
                  >
                    <span className="mk-mcat__groupTitle">{g.title}</span>

                    <span
                      className={`mk-mcat__chev ${isOpen ? "is-open" : ""}`}
                      aria-hidden="true"
                    >
                      <ChevronDown />
                    </span>
                  </a>

                  {isOpen ? (
                    <div className="mk-mcat__groupBody">
                      {g.items?.length ? (
                        g.items.map((it) => {
                          const href = hrefForCategory(it.node, seoMode);

                          return (
                            <Link
                              key={it.id}
                              href={href}
                              className="mk-mcat__item"
                            >
                              <span>{it.title}</span>
                              <span
                                className="mk-mcat__itemArrow"
                                aria-hidden="true"
                              >
                                <Icon icon={"ArrowLeft01" as any} size={16} />
                              </span>
                            </Link>
                          );
                        })
                      ) : (
                        <div className="mk-mcat__empty">لا يوجد عناصر</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}