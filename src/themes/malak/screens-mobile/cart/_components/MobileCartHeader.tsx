// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartHeader.tsx
"use client";

type Props = {
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onBack: () => void;
  onContinueShopping: () => void;
};

export default function MobileCartHeader({
  title = "سلة التسوق",
  subtitle = "",
  refreshing = false,
  onBack,
  onContinueShopping,
}: Props) {
  return (
    <div className="mk-mobile-cart-header">
      <div className="mk-mobile-cart-header__row">
        {refreshing ? (
          <div className="mk-mobile-cart-header__loading" aria-hidden />
        ) : null}

        <button
          type="button"
          onClick={onContinueShopping}
          aria-label="متابعة التسوق"
          className="mk-mobile-cart-header__iconBtn mk-mobile-cart-header__shopBtn"
          title="متابعة التسوق"
        >
          🛍️
        </button>

        <div className="mk-mobile-cart-header__titleBox">
          <div className="mk-mobile-cart-header__title">{title}</div>

          {subtitle ? (
            <div className="mk-mobile-cart-header__subtitle">{subtitle}</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onBack}
          aria-label="رجوع"
          className="mk-mobile-cart-header__iconBtn mk-mobile-cart-header__backBtn"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}