// FILE: apps/storefront/src/themes/malak/screens/product/_components/ProductBreadcrumbs.tsx
"use client";

import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string | null;
};

type Props = {
  items: BreadcrumbItem[];
};

function cleanLabel(value: unknown) {
  return String(value ?? "").trim();
}

export default function ProductBreadcrumbs({ items }: Props) {
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      label: cleanLabel(item?.label),
      href: cleanLabel(item?.href),
    }))
    .filter((item) => item.label);

  if (cleanItems.length <= 1) return null;

  return (
    <nav dir="rtl" className="mk-pbreadcrumbs" aria-label="مسار المنتج">
      <ol className="mk-pbreadcrumbs__list">
        {cleanItems.map((item, index) => {
          const isLast = index === cleanItems.length - 1;
          const href = item.href && !isLast ? item.href : "";

          return (
            <li
              key={`${item.label}-${index}`}
              className={[
                "mk-pbreadcrumbs__item",
                isLast ? "is-current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {href ? (
                <Link href={href} className="mk-pbreadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <span className="mk-pbreadcrumbs__current">
                  {item.label}
                </span>
              )}

              {!isLast ? (
                <span className="mk-pbreadcrumbs__sep" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}