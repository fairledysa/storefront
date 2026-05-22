// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileCategoryHeader.tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, SlidersHorizontal } from "lucide-react";

type Props = {
  title: string;
  onFilterClick?: () => void;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

export default function MobileCategoryHeader({ title, onFilterClick }: Props) {
  const router = useRouter();
  const safeTitle = s(title) || "القسم";

  return (
    <div className="mk-mobile-category-header" dir="rtl">
      <div className="mk-mobile-category-header__row">
        <button
          type="button"
          onClick={() => router.back()}
          className="mk-mobile-category-header__btn"
          aria-label="رجوع"
        >
          <ChevronRight size={18} />
        </button>

        <h1 className="mk-mobile-category-header__title">{safeTitle}</h1>

        {onFilterClick ? (
          <button
            type="button"
            onClick={onFilterClick}
            className="mk-mobile-category-header__btn"
            aria-label="الأقسام الفرعية"
          >
            <SlidersHorizontal size={18} />
          </button>
        ) : (
          <span
            className="mk-mobile-category-header__btn mk-mobile-category-header__btn--ghost"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}