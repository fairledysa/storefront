//apps/storefront/src/themes/malak/screens-mobile/category/CategoryMobileScreen.tsx
"use client";

import { useState } from "react";
import MobileCategoryHeader from "./_components/MobileCategoryHeader";
import MobileFiltersBar from "./_components/MobileFiltersBar";
import MobileProductsGrid from "./_components/MobileProductsGrid";
import type { SeoUrlMode } from "@/data/store/settings";

type Props = {
  data: any;
  mode: SeoUrlMode;
};

export default function CategoryMobileScreen({ data, mode }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  if (!data || !data.category) {
    return <div className="p-4 text-center text-red-600">تعذر تحميل القسم</div>;
  }

  const products = Array.isArray(data.products) ? data.products : [];

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-24">
      <MobileCategoryHeader
        title={String(data.category.name ?? "")}
        onFilterClick={() => setFiltersOpen((v) => !v)}
      />

      <MobileFiltersBar />

      {products.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
          لا توجد منتجات في هذا القسم
        </div>
      ) : (
        <MobileProductsGrid products={products} mode={mode} />
      )}

      {filtersOpen ? (
        <div
          className="fixed inset-0 z-[70] bg-black/30"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-center text-sm font-black text-slate-900">
              الفلاتر
            </div>

            <div className="space-y-2">
              <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                ترتيب
              </button>
              <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                الماركات
              </button>
              <button className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                السعر
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}