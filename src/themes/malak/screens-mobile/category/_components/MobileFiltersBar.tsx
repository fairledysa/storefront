// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileFiltersBar.tsx
"use client";

import Link from "next/link";

type FilterItem = {
  id?: string;
  label: string;
  href?: string | null;
};

type Props = {
  items?: FilterItem[];
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

export default function MobileFiltersBar({ items = [] }: Props) {
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: s(item.id) || s(item.href) || `${index}`,
      label: s(item.label),
      href: s(item.href) || "#",
    }))
    .filter((item) => item.label);

  if (!cleanItems.length) return null;

  return (
    <div className="mk-mobile-filters" dir="rtl">
      <div className="mk-mobile-filters__scroll">
        {cleanItems.map((item) => {
          if (item.href && item.href !== "#") {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="mk-mobile-filters__btn"
              >
                {item.label}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className="mk-mobile-filters__btn"
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}