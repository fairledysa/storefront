// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductInfo.tsx
"use client";

import ProductCountdown from "@/themes/malak/components/product-countdown/ProductCountdown";

type Props = {
  name: string;
  price: number;
  compareAtPrice: number | null;
  brand?: string | null;
  subtitle?: string | null;
  promotionTitle?: string | null;
  saleEnd?: string | null;
  showSaleCountdown?: boolean;
  options: any[];
  selectedOptionValueIds: string[];
  allowedByOption?: Map<string, Set<string>>;
  onSelectOption: (optionId: string, valueId: string) => void;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(
    Number(n || 0),
  );
}

function hasValidPrice(n: any) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0;
}

function calcDiscount(price: number, compareAt?: number | null) {
  if (!hasValidPrice(price)) return null;
  if (!compareAt || compareAt <= price) return null;

  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct > 0 ? pct : null;
}

function hasRealDiscount(price?: number | null, compareAt?: number | null) {
  return (
    typeof price === "number" &&
    typeof compareAt === "number" &&
    price > 0 &&
    compareAt > price
  );
}

export default function MobileProductInfo({
  name,
  price,
  compareAtPrice,
  brand = null,
  subtitle = null,
  promotionTitle = null,
  saleEnd = null,
  showSaleCountdown = false,
  options,
  selectedOptionValueIds,
  allowedByOption = new Map<string, Set<string>>(),
  onSelectOption,
}: Props) {
  const priceIsValid = hasValidPrice(price);
  const discount = calcDiscount(price, compareAtPrice);
  const selectedSet = new Set((selectedOptionValueIds ?? []).map(String));

  const shouldShowCompare =
    priceIsValid && compareAtPrice != null && compareAtPrice > price;

  const shouldShowCountdown =
    hasRealDiscount(price, compareAtPrice) &&
    Boolean(saleEnd) &&
    Boolean(showSaleCountdown);

  return (
    <section className="mkmpi-wrap" dir="rtl">
      <div className="mkmpi-main">
        <div className="mkmpi-head">
          <div className="mkmpi-titleBox">
            <h1 className="mkmpi-title">{name}</h1>

            {subtitle ? <div className="mkmpi-subtitle">{subtitle}</div> : null}
          </div>

          <div
            className={`mkmpi-priceBox ${
              !priceIsValid ? "mkmpi-priceBox--empty" : ""
            }`}
          >
            <div className="mkmpi-price" dir="rtl">
              {priceIsValid ? (
                <>
                  <span>{formatPrice(price)}</span>
                  <span className="mkmpi-currency">ر.س</span>
                </>
              ) : (
                <span className="mkmpi-priceDash">—</span>
              )}
            </div>

            {shouldShowCompare ? (
              <div className="mkmpi-compareLine" dir="rtl">
                <span className="mkmpi-compare">
                  {formatPrice(Number(compareAtPrice))} ر.س
                </span>

                {discount ? (
                  <span className="mkmpi-discount">-{discount}%</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {brand || promotionTitle ? (
          <div className="mkmpi-pills">
            {brand ? <span className="mkmpi-pill">{brand}</span> : null}

            {promotionTitle ? (
              <span className="mkmpi-pill mkmpi-pill--green">
                {promotionTitle}
              </span>
            ) : null}
          </div>
        ) : null}

        {shouldShowCountdown && saleEnd ? (
          <div className="mkmpi-countdown">
            <ProductCountdown target={saleEnd} />
          </div>
        ) : null}

        {Array.isArray(options) && options.length > 0 ? (
          <div className="mkmpi-options">
            {options.map((opt: any) => {
              const optId = String(opt?.id ?? "");
              const optName = String(opt?.name ?? "").trim();
              const vals = Array.isArray(opt?.values) ? opt.values : [];

              if (!optId || !optName || vals.length === 0) return null;

              const allowed = allowedByOption.get(optId);
              const selectedValue = vals.find((v: any) =>
                selectedSet.has(String(v?.id ?? "")),
              );

              const selectedLabel = String(
                selectedValue?.display_value ?? selectedValue?.name ?? "",
              ).trim();

              return (
                <div key={optId} className="mkmpi-optionGroup">
                  <div className="mkmpi-optionHead">
                    <span className="mkmpi-optionName">{optName}</span>

                    {selectedLabel ? (
                      <span className="mkmpi-optionSelected">
                        {selectedLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="mkmpi-values">
                    {vals.map((v: any) => {
                      const vid = String(v?.id ?? "");
                      const label = String(
                        v?.display_value ?? v?.name ?? "",
                      ).trim();

                      if (!vid || !label) return null;

                      const active = selectedSet.has(vid);
                      const disabled = allowed ? !allowed.has(vid) : false;

                      return (
                        <button
                          key={vid}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            onSelectOption(optId, vid);
                          }}
                          className={`mkmpi-value ${
                            active ? "mkmpi-value--active" : ""
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}