// FILE: apps/storefront/src/themes/malak/screens-mobile/category/_components/MobileCategoryHeader.tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, SlidersHorizontal } from "lucide-react";

type Props = {
  title: string;
  onFilterClick?: () => void;
};

export default function MobileCategoryHeader({ title, onFilterClick }: Props) {
  const router = useRouter();

  return (
    <div className="mk-mobile-category-header">
      <div className="mk-mobile-category-header__row">
        <button
          type="button"
          onClick={() => router.back()}
          className="mk-mobile-category-header__btn"
          aria-label="رجوع"
        >
          <ChevronRight size={18} />
        </button>

        <h1 className="mk-mobile-category-header__title">{title}</h1>

        <button
          type="button"
          onClick={onFilterClick}
          className="mk-mobile-category-header__btn"
          aria-label="الفلاتر"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}