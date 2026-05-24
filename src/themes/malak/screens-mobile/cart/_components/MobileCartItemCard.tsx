// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartItemCard.tsx
"use client";

import { memo, useMemo } from "react";
import type {
  CartItemEnriched,
  CartSummaryMoney,
} from "../../../screens/cart/_components/types";

type QtyPending = {
  id: string;
  delta: number;
  key: number;
} | null;

type Props = {
  item: CartItemEnriched;
  summary: CartSummaryMoney | null;
  isRemoving: boolean;
  isTouched: boolean;
  qtyPending: QtyPending;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onQtyChange: (id: string, delta: number) => void;
  onPreviewAttachment: (url: string | null, isImage: boolean) => void;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function parseMoneyNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function firstMoneyNumber(...values: any[]) {
  for (const value of values) {
    const n = parseMoneyNumber(value);
    if (n !== null) return n;
  }

  return null;
}

function clampDecimals(value: any) {
  const n = Number(value ?? 2);
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function readCurrencySymbol(summary: CartSummaryMoney | null) {
  const anySummary: any = summary ?? null;

  const symbol = s(
    anySummary?.currency_symbol ??
      anySummary?.currencySymbol ??
      anySummary?.symbol,
  );

  if (symbol) return symbol;

  const code = s(anySummary?.currency).toUpperCase();
  if (code && code !== "SAR") return code;

  return "";
}

function formatMoney(
  value: any,
  currencySymbol: string,
  decimalDigits: number,
  ready: boolean,
) {
  if (!ready) return "—";

  const n = parseMoneyNumber(value);
  if (n === null) return null;

  const symbol = s(currencySymbol);
  if (!symbol) return "—";

  const formatter = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  });

  return `${formatter.format(n)} ${symbol}`;
}

function readLineTotal(item: CartItemEnriched) {
  const itemAny: any = item ?? {};
  const pricingAny: any =
    itemAny.pricing ??
    itemAny.price_info ??
    itemAny.priceInfo ??
    itemAny.money ??
    {};

  return firstMoneyNumber(
    itemAny.line_total,
    itemAny.lineTotal,
    itemAny.final_line_total,
    itemAny.finalLineTotal,
    itemAny.total_price,
    itemAny.totalPrice,
    itemAny.row_total,
    itemAny.rowTotal,
    itemAny.item_total,
    itemAny.itemTotal,
    itemAny.subtotal,
    itemAny.total,
    itemAny.amount,
    pricingAny.line_total,
    pricingAny.lineTotal,
    pricingAny.total,
    pricingAny.subtotal,
    pricingAny.amount,
  );
}

function readCartItemUnitPrice(item: CartItemEnriched) {
  const itemAny: any = item ?? {};
  const productAny: any = item.product ?? {};
  const qty = Math.max(1, Math.floor(Number(itemAny.qty ?? 1)));

  const itemPricing: any =
    itemAny.pricing ??
    itemAny.price_info ??
    itemAny.priceInfo ??
    itemAny.money ??
    {};

  const productPricing: any =
    productAny.pricing ??
    productAny.price_info ??
    productAny.priceInfo ??
    productAny.money ??
    {};

  const directUnit = firstMoneyNumber(
    itemAny.unit_price,
    itemAny.unitPrice,
    itemAny.final_unit_price,
    itemAny.finalUnitPrice,
    itemAny.final_price,
    itemAny.finalPrice,
    itemAny.sale_price,
    itemAny.salePrice,
    itemAny.price,
    itemAny.current_price,
    itemAny.currentPrice,
    itemAny.price_amount,
    itemAny.priceAmount,

    itemPricing.unit_price,
    itemPricing.unitPrice,
    itemPricing.final_unit_price,
    itemPricing.finalUnitPrice,
    itemPricing.final_price,
    itemPricing.finalPrice,
    itemPricing.sale_price,
    itemPricing.salePrice,
    itemPricing.price,
    itemPricing.current_price,
    itemPricing.currentPrice,
    itemPricing.amount,

    productAny.sale_price,
    productAny.salePrice,
    productAny.final_price,
    productAny.finalPrice,
    productAny.current_price,
    productAny.currentPrice,
    productAny.price,
    productAny.price_amount,
    productAny.priceAmount,

    productPricing.sale_price,
    productPricing.salePrice,
    productPricing.final_price,
    productPricing.finalPrice,
    productPricing.current_price,
    productPricing.currentPrice,
    productPricing.price,
    productPricing.amount,
  );

  if (directUnit !== null) return directUnit;

  const lineTotal = readLineTotal(item);
  if (lineTotal !== null) return lineTotal / qty;

  return null;
}

function readCartItemComparePrice(
  item: CartItemEnriched,
  unitPrice: number | null,
) {
  const itemAny: any = item ?? {};
  const productAny: any = item.product ?? {};

  const itemPricing: any =
    itemAny.pricing ??
    itemAny.price_info ??
    itemAny.priceInfo ??
    itemAny.money ??
    {};

  const productPricing: any =
    productAny.pricing ??
    productAny.price_info ??
    productAny.priceInfo ??
    productAny.money ??
    {};

  const compare = firstMoneyNumber(
    itemAny.compare_at_price,
    itemAny.compareAtPrice,
    itemAny.regular_unit_price,
    itemAny.regularUnitPrice,
    itemAny.regular_price,
    itemAny.regularPrice,
    itemAny.original_price,
    itemAny.originalPrice,
    itemAny.old_price,
    itemAny.oldPrice,

    itemPricing.compare_at_price,
    itemPricing.compareAtPrice,
    itemPricing.regular_price,
    itemPricing.regularPrice,
    itemPricing.original_price,
    itemPricing.originalPrice,
    itemPricing.old_price,
    itemPricing.oldPrice,

    productAny.compare_at_price,
    productAny.compareAtPrice,
    productAny.regular_price,
    productAny.regularPrice,
    productAny.original_price,
    productAny.originalPrice,
    productAny.old_price,
    productAny.oldPrice,
    productAny.price,

    productPricing.compare_at_price,
    productPricing.compareAtPrice,
    productPricing.regular_price,
    productPricing.regularPrice,
    productPricing.original_price,
    productPricing.originalPrice,
    productPricing.old_price,
    productPricing.oldPrice,
  );

  if (compare !== null && unitPrice !== null && compare > unitPrice) {
    return compare;
  }

  return null;
}

function buildProductHref(item: CartItemEnriched) {
  const product: any = item.product ?? {};

  return (
    s(product.href) ||
    s(product.url) ||
    s(product.permalink) ||
    s(product.link) ||
    (product.public_no ? `/p${product.public_no}` : "") ||
    (product.publicNo ? `/p${product.publicNo}` : "") ||
    (item.product_id ? `/products/${item.product_id}` : "#")
  );
}

function buildSelectedOptionsLabel(item: CartItemEnriched) {
  const raw = Array.isArray(item.selected_options) ? item.selected_options : [];

  const visible = raw
    .map((x) => ({
      optionName: s(x?.name),
      valueName: s(x?.value),
    }))
    .filter((x) => x.optionName && x.valueName)
    .filter((x) => !x.optionName.startsWith("__"))
    .filter((x) => x.optionName !== "ملاحظة" && x.optionName !== "مرفق");

  if (visible.length) return visible;

  const selected = Array.isArray(item.selected_option_value_ids)
    ? item.selected_option_value_ids.map(String).filter(Boolean)
    : [];

  const options = Array.isArray(item.options) ? item.options : [];
  if (!selected.length || !options.length) return [];

  const selectedSet = new Set(selected);
  const out: { optionName: string; valueName: string }[] = [];

  for (const opt of options) {
    const optName = s((opt as any)?.name);
    const vals = Array.isArray((opt as any)?.values) ? (opt as any).values : [];

    const hit = vals.find((v: any) => selectedSet.has(String(v?.id)));
    if (!hit) continue;

    const valueName = s(hit?.display_value ?? hit?.name);
    if (!optName || !valueName) continue;

    out.push({ optionName: optName, valueName });
  }

  return out;
}

function readSpecialSelectedOption(
  item: CartItemEnriched,
  key: string,
): string | null {
  const raw = Array.isArray(item.selected_options) ? item.selected_options : [];
  const hit = raw.find((x) => s(x?.name) === key);
  const value = s(hit?.value);

  return value || null;
}

function isImageAttachment(
  type: string | null,
  url: string | null,
  name: string | null,
) {
  const t = s(type).toLowerCase();
  const u = s(url).toLowerCase();
  const n = s(name).toLowerCase();

  if (
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "image/webp"
  ) {
    return true;
  }

  return [u, n].some((x) =>
    [".png", ".jpg", ".jpeg", ".webp"].some((ext) => x.includes(ext)),
  );
}

function readAttachments(item: CartItemEnriched) {
  const out: Array<{
    index: number;
    name: string | null;
    type: string | null;
    size: number | null;
    url: string | null;
    isImage: boolean;
  }> = [];

  for (let i = 1; i <= 4; i++) {
    const name = readSpecialSelectedOption(item, `__attachment_${i}_name`);
    const type = readSpecialSelectedOption(item, `__attachment_${i}_type`);
    const sizeRaw = readSpecialSelectedOption(item, `__attachment_${i}_size`);
    const url = readSpecialSelectedOption(item, `__attachment_${i}_url`);

    if (!name && !url) continue;

    const sizeNum = Number(sizeRaw ?? 0);

    out.push({
      index: i,
      name: name || null,
      type: type || null,
      size: Number.isFinite(sizeNum) ? sizeNum : null,
      url: url || null,
      isImage: isImageAttachment(type || null, url || null, name || null),
    });
  }

  return out;
}

function readStockLimit(item: CartItemEnriched) {
  const raw: any = (item as any)?.stock_limit ?? null;
  const qty = Math.max(1, Math.floor(Number((item as any)?.qty ?? 1)));

  if (!raw || typeof raw !== "object") {
    return {
      maxQty: null as number | null,
      canIncrement: true,
      limitReason: "none",
    };
  }

  const maxQtyRaw = Number(raw?.max_qty);
  const maxQty = Number.isFinite(maxQtyRaw)
    ? Math.max(0, Math.floor(maxQtyRaw))
    : null;

  const canIncrement =
    maxQty === null
      ? Boolean(raw?.can_increment ?? true)
      : maxQty > 0 && qty < maxQty;

  return {
    maxQty,
    canIncrement,
    limitReason: s(raw?.limit_reason) || "none",
  };
}

const MobileCartItemCard = memo(function MobileCartItemCard({
  item,
  summary,
  isRemoving,
  isTouched,
  qtyPending,
  onEdit,
  onRemove,
  onQtyChange,
  onPreviewAttachment,
}: Props) {
  const itemId = String(item.id);
  const isQtyPending = qtyPending?.id === itemId;
  const isMinusPending = isQtyPending && Number(qtyPending?.delta) < 0;
  const isPlusPending = isQtyPending && Number(qtyPending?.delta) > 0;

  const currencySymbol = useMemo(() => readCurrencySymbol(summary), [summary]);

  const currencyDecimals = useMemo(() => {
    const summaryAny: any = summary ?? null;

    return clampDecimals(
      summaryAny?.currency_decimals ?? summaryAny?.currencyDecimals,
    );
  }, [summary]);

  const currencyReady = Boolean(currencySymbol);

  const view = useMemo(() => {
    const title = item.product?.name ?? "منتج";
    const img = item.product?.image_url ?? null;
    const productHref = buildProductHref(item);

    const qty = Math.max(1, Math.floor(Number(item.qty ?? 1)));
    const price = readCartItemUnitPrice(item);
    const compareAt = readCartItemComparePrice(item, price);
    const lineTotal = price !== null ? price * qty : readLineTotal(item);

    const selectedPairs = buildSelectedOptionsLabel(item);
    const customerNote = readSpecialSelectedOption(item, "ملاحظة");
    const attachments = readAttachments(item);

    const hasVariantOptions =
      Array.isArray(item.options) && item.options.length > 0;

    const hasEditableOptions =
      hasVariantOptions || Boolean(customerNote) || attachments.length > 0;

    const stockLimit = readStockLimit(item);

    const reachedMax =
      stockLimit.maxQty !== null && stockLimit.maxQty > 0
        ? qty >= stockLimit.maxQty
        : !stockLimit.canIncrement;

    const plusDisabled =
      isRemoving ||
      !stockLimit.canIncrement ||
      (stockLimit.maxQty !== null && qty >= stockLimit.maxQty);

    const plusTitle =
      plusDisabled && reachedMax
        ? stockLimit.limitReason === "max_per_order"
          ? "وصلت للحد الأقصى المسموح لهذا المنتج"
          : "وصلت للكمية المتاحة لهذا المنتج"
        : "زيادة الكمية";

    return {
      title,
      img,
      productHref,
      qty,
      price,
      compareAt,
      lineTotal,
      selectedPairs,
      customerNote,
      attachments,
      hasEditableOptions,
      plusDisabled,
      plusTitle,
    };
  }, [item, isRemoving]);

  const priceText =
    view.price !== null
      ? formatMoney(view.price, currencySymbol, currencyDecimals, currencyReady)
      : null;

  const compareText =
    view.compareAt !== null
      ? formatMoney(
          view.compareAt,
          currencySymbol,
          currencyDecimals,
          currencyReady,
        )
      : null;

  const lineTotalText =
    view.lineTotal !== null
      ? formatMoney(
          view.lineTotal,
          currencySymbol,
          currencyDecimals,
          currencyReady,
        )
      : null;

  const hasAnyMoney = Boolean(priceText || lineTotalText);

  return (
    <article
      data-mk-cart-item-id={item.id}
      className={[
        "mk-mcart-card",
        !hasAnyMoney ? "mk-mcart-card--priceMissing" : "",
        isRemoving ? "is-removing" : "",
        isTouched ? "is-touching" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isRemoving ? <div className="mk-mcart-card__busy" /> : null}

      <a
        href={view.productHref}
        className="mk-mcart-card__media"
        aria-label={`عرض ${view.title}`}
      >
        {view.img ? (
          <img
            src={view.img}
            alt={view.title}
            loading="lazy"
            decoding="async"
            className="mk-mcart-card__image"
          />
        ) : (
          <span className="mk-mcart-card__imageEmpty">—</span>
        )}
      </a>

      <div className="mk-mcart-card__body">
        <div className="mk-mcart-card__top">
          <a
            href={view.productHref}
            className="mk-mcart-card__title"
            title={view.title}
          >
            {view.title}
          </a>

          <button
            type="button"
            onClick={() => onRemove(itemId)}
            disabled={isRemoving}
            className="mk-mcart-card__remove"
            aria-label="حذف المنتج"
          >
            {isRemoving ? "..." : "حذف"}
          </button>
        </div>

        <div className="mk-mcart-card__metaRow">
          {view.selectedPairs.length ? (
            <button
              type="button"
              onClick={() => {
                if (view.hasEditableOptions && !isRemoving) onEdit(itemId);
              }}
              disabled={!view.hasEditableOptions || isRemoving}
              className="mk-mcart-card__options"
            >
              {view.selectedPairs.slice(0, 2).map((x, index) => (
                <span key={`${x.optionName}-${x.valueName}-${index}`}>
                  {x.optionName}: <strong>{x.valueName}</strong>
                </span>
              ))}

              {view.selectedPairs.length > 2 ? (
                <em>+{view.selectedPairs.length - 2}</em>
              ) : null}
            </button>
          ) : view.hasEditableOptions ? (
            <button
              type="button"
              onClick={() => onEdit(itemId)}
              disabled={isRemoving}
              className="mk-mcart-card__editInline"
            >
              تعديل الملاحظة / الصور
            </button>
          ) : null}

          {!hasAnyMoney ? (
            <span className="mk-mcart-card__statusPill">ضمن الملخص</span>
          ) : null}
        </div>

        {view.customerNote ? (
          <button
            type="button"
            onClick={() => onEdit(itemId)}
            disabled={isRemoving}
            className="mk-mcart-card__note"
          >
            <span>ملاحظة</span>
            <strong>{view.customerNote}</strong>
          </button>
        ) : null}

        {view.attachments.length ? (
          <div className="mk-mcart-card__attachments">
            <span className="mk-mcart-card__attachmentsLabel">
              {view.attachments.length} صور
            </span>

            <div className="mk-mcart-card__attachmentList">
              {view.attachments.map((att) => (
                <button
                  key={`att-${itemId}-${att.index}`}
                  type="button"
                  disabled={!att.url || isRemoving}
                  onClick={() => onPreviewAttachment(att.url, att.isImage)}
                  className="mk-mcart-card__attachment"
                  aria-label="معاينة المرفق"
                >
                  {att.isImage && att.url ? (
                    <img src={att.url} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span>📎</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mk-mcart-card__bottom">
          <div className="mk-mcart-card__priceBox">
            {priceText ? (
              <div className="mk-mcart-card__price">{priceText}</div>
            ) : lineTotalText ? (
              <div className="mk-mcart-card__price">{lineTotalText}</div>
            ) : (
              <div className="mk-mcart-card__priceMuted">مضاف للإجمالي</div>
            )}

            {compareText ? (
              <div className="mk-mcart-card__compare">{compareText}</div>
            ) : null}

            {lineTotalText && priceText && lineTotalText !== priceText ? (
              <div className="mk-mcart-card__lineTotal">
                المجموع <strong>{lineTotalText}</strong>
              </div>
            ) : null}
          </div>

          <div className="mk-mcart-qty">
            <button
              type="button"
              disabled={isRemoving || view.qty <= 1}
              onClick={() => onQtyChange(itemId, -1)}
              aria-label="إنقاص الكمية"
              className="mk-mcart-qty__btn"
            >
              {isMinusPending ? <TinySpinner /> : "−"}
            </button>

            <div className="mk-mcart-qty__value">{view.qty}</div>

            <button
              type="button"
              disabled={view.plusDisabled}
              onClick={() => {
                if (view.plusDisabled) return;
                onQtyChange(itemId, 1);
              }}
              aria-label={view.plusTitle}
              title={view.plusTitle}
              className="mk-mcart-qty__btn"
            >
              {isPlusPending ? <TinySpinner /> : "+"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

function TinySpinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="mk-mcart-spinner"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.22"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.7s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

export default MobileCartItemCard;