// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartHeader.tsx
"use client";

type Props = {
  loading: boolean;
  totalQty: number;
  isEmpty: boolean;
  onBack: () => void;
  onContinueShopping: () => void;
};

export default function MobileCartHeader({
  loading,
  totalQty,
  isEmpty,
  onBack,
  onContinueShopping,
}: Props) {
  return (
    <header className="mk-mcart-header">
      <div className="mk-mcart-header__top">
        <button
          type="button"
          onClick={onBack}
          className="mk-mcart-header__back"
          aria-label="رجوع"
        >
          →
        </button>

        <div className="mk-mcart-header__titleWrap">
          <div className="mk-mcart-header__eyebrow">سلة التسوق</div>

          <div className="mk-mcart-header__titleRow">
            <h1 className="mk-mcart-header__title">حقيبتك</h1>

            {totalQty > 0 ? (
              <span className="mk-mcart-header__badge">{totalQty}</span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onContinueShopping}
          className="mk-mcart-header__shop"
        >
          تسوق
        </button>
      </div>

      <div className="mk-mcart-header__desc">
        {loading
          ? "نجهز محتويات السلة..."
          : isEmpty
            ? "سلتك فارغة، ابدأ بإضافة منتجاتك المفضلة."
            : `${totalQty} قطعة جاهزة للمراجعة قبل إتمام الطلب.`}
      </div>
    </header>
  );
}