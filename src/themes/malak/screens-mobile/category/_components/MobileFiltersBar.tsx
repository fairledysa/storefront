// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileFiltersBar.tsx
"use client";

const FILTERS = ["ترتيب", "الماركات", "حالة البشرة", "مكياج"];

export default function MobileFiltersBar() {
  return (
    <div className="mk-mobile-filters">
      <div className="mk-mobile-filters__scroll">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            className="mk-mobile-filters__btn"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}