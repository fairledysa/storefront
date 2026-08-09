// FILE: apps/storefront/src/themes/basit/screens/cart/_components/CartItemsList.tsx
"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CartItemEnriched, CartSummaryMoney } from "./types";

const EditOptionsModal = dynamic(() => import("./EditOptionsModal"), {
  ssr: false,
  loading: () => null,
});

function s(value: any) {
  return String(value ?? "").trim();
}

function clampDecimals(value: any) {
  const n = Number(value ?? 2);
  if (!Number.isFinite(n)) return 2;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function formatMoney(
  value: any,
  currencySymbol: string,
  decimalDigits: number,
  ready: boolean,
) {
  if (!ready) return "—";

  const symbol = s(currencySymbol);
  if (!symbol) return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  const formatter = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  });

  return `${formatter.format(n)} ${symbol}`;
}

function readCurrencySymbol(summary: CartSummaryMoney | null) {
  const summaryAny: any = summary ?? null;

  const symbol = s(
    summaryAny?.currency_symbol ??
      summaryAny?.currencySymbol ??
      summaryAny?.symbol,
  );

  if (symbol) return symbol;

  const code = s(summaryAny?.currency).toUpperCase();

  // مهم: لا نعرض SAR كفولباك في الواجهة حتى لا يظهر ثم يتبدل
  if (code && code !== "SAR") return code;

  return "";
}
function firstPositiveNumber(...values: any[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function readCartItemUnitPrice(item: CartItemEnriched) {
  const itemAny: any = item ?? {};
  const qty = Math.max(1, Math.floor(Number(itemAny.qty ?? 1)));

  const unit = firstPositiveNumber(
    itemAny.unit_price,
    itemAny.unitPrice,
    itemAny.final_unit_price,
    itemAny.finalUnitPrice,
    itemAny.price,
  );

  if (unit !== null) return unit;

  const lineTotal = firstPositiveNumber(
    itemAny.line_total,
    itemAny.lineTotal,
    itemAny.total_price,
    itemAny.totalPrice,
  );

  if (lineTotal !== null) return lineTotal / qty;

  const productSale = firstPositiveNumber(item.product?.sale_price);
  if (productSale !== null) return productSale;

  return firstPositiveNumber(item.product?.price);
}

function readCartItemComparePrice(
  item: CartItemEnriched,
  unitPrice: number | null,
) {
  const itemAny: any = item ?? {};

  const directCompare = firstPositiveNumber(
    itemAny.compare_at_price,
    itemAny.compareAtPrice,
    itemAny.regular_unit_price,
    itemAny.regularUnitPrice,
  );

  if (
    directCompare !== null &&
    typeof unitPrice === "number" &&
    directCompare > unitPrice
  ) {
    return directCompare;
  }

  const productPrice = firstPositiveNumber(item.product?.price);
  const productSale = firstPositiveNumber(item.product?.sale_price);

  if (
    productPrice !== null &&
    productSale !== null &&
    productSale > 0 &&
    productPrice > productSale
  ) {
    return productPrice;
  }

  return null;
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
    limitReason: String(raw?.limit_reason ?? "none"),
  };
}

function readSpecialOfferAdjustment(item: CartItemEnriched) {
  const itemAny: any = item ?? {};
  const direct = itemAny.specialOfferAdjustment ?? itemAny.special_offer_adjustment;
  const list = Array.isArray(itemAny.specialOfferAdjustments)
    ? itemAny.specialOfferAdjustments
    : Array.isArray(itemAny.special_offer_adjustments)
      ? itemAny.special_offer_adjustments
      : [];

  const source = direct && typeof direct === "object" ? direct : list[0];
  if (!source || typeof source !== "object") return null;

  const discount = Number(
    source.discount ??
      itemAny.specialOfferDiscount ??
      itemAny.special_offer_discount ??
      0,
  );

  if (!Number.isFinite(discount) || discount <= 0) return null;

  return {
    label: s(source.label) || "هدية العرض",
    offerTitle: s(source.offerTitle ?? source.offer_title),
    discount,
  };
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
      optionName: String(x?.name ?? "").trim(),
      valueName: String(x?.value ?? "").trim(),
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
    const optName = String((opt as any)?.name ?? "").trim();
    const vals = Array.isArray((opt as any)?.values) ? (opt as any).values : [];

    const hit = vals.find((v: any) => selectedSet.has(String(v?.id)));
    if (!hit) continue;

    const valueName = String(hit?.display_value ?? hit?.name ?? "").trim();
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
  const hit = raw.find((x) => String(x?.name ?? "").trim() === key);
  const value = String(hit?.value ?? "").trim();

  return value || null;
}

function isImageAttachment(
  type: string | null,
  url: string | null,
  name: string | null,
) {
  const t = String(type ?? "").toLowerCase();
  const u = String(url ?? "").toLowerCase();
  const n = String(name ?? "").toLowerCase();

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

type AttachmentPreview = {
  url: string;
  isImage: boolean;
};

type QtyPending = {
  id: string;
  delta: number;
  key: number;
} | null;

type Props = {
  items: CartItemEnriched[];
  summary?: CartSummaryMoney | null;
  loading: boolean;
  busy: boolean;
  onInc: (cart_item_id: string, delta: number) => Promise<void> | void;
  onRemove: (cart_item_id: string) => Promise<void> | void;
  onReload?: () => void;
  flash?: (msg: string, kind?: "info" | "error") => void;
};

type CartItemRowProps = {
  item: CartItemEnriched;
  isRemoving: boolean;
  isTouched: boolean;
  qtyPending: QtyPending;
  currencySymbol: string;
  currencyDecimals: number;
  currencyReady: boolean;
  onEdit: (id: string) => void;
  onRemoveClick: (id: string) => void;
  onQtyChange: (id: string, delta: number) => void;
  onPreviewAttachment: (url: string | null, isImage: boolean) => void;
};

const CartItemRow = memo(function CartItemRow({
  item,
  isRemoving,
  isTouched,
  qtyPending,
  currencySymbol,
  currencyDecimals,
  currencyReady,
  onEdit,
  onRemoveClick,
  onQtyChange,
  onPreviewAttachment,
}: CartItemRowProps) {
  const itemId = String(item.id);
  const isQtyPending = qtyPending?.id === itemId;
  const isMinusPending = isQtyPending && Number(qtyPending?.delta) < 0;
  const isPlusPending = isQtyPending && Number(qtyPending?.delta) > 0;

  const view = useMemo(() => {
    const title = item.product?.name ?? "منتج";
    const img = item.product?.image_url ?? null;
    const productHref = buildProductHref(item);

        const qty = Math.max(1, Math.floor(Number(item.qty ?? 1)));
    const price = readCartItemUnitPrice(item);
    const compareAt = readCartItemComparePrice(item, price);
    const lineTotal =
      typeof price === "number" ? Number(price) * Number(qty) : null;

    const selectedPairs = buildSelectedOptionsLabel(item);
    const customerNote = readSpecialSelectedOption(item, "ملاحظة");
    const attachments = readAttachments(item);
    const specialOfferAdjustment = readSpecialOfferAdjustment(item);

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
      price,
      compareAt,
      qty,
      lineTotal,
      selectedPairs,
      customerNote,
      attachments,
      specialOfferAdjustment,
      hasEditableOptions,
      stockLimit,
      plusDisabled,
      plusTitle,
    };
  }, [item, isRemoving]);

  const priceText =
    typeof view.price === "number"
      ? formatMoney(view.price, currencySymbol, currencyDecimals, currencyReady)
      : null;

  const compareText =
    typeof view.compareAt === "number"
      ? formatMoney(
          view.compareAt,
          currencySymbol,
          currencyDecimals,
          currencyReady,
        )
      : null;

  const lineTotalText =
    typeof view.lineTotal === "number"
      ? formatMoney(
          view.lineTotal,
          currencySymbol,
          currencyDecimals,
          currencyReady,
        )
      : null;

  return (
    <div
      data-mk-cart-item-id={item.id}
      className={[
        "mk-dcart-item",
        "mk-dcart-item--pro",
        isRemoving ? "is-removing" : "",
        isTouched ? "is-touching" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isRemoving ? <div className="mk-dcart-item__busyLayer" /> : null}

      <a
        href={view.productHref}
        className="mk-dcart-item__imageBox mk-dcart-item__imageLink"
        aria-label={`عرض ${view.title}`}
      >
        {view.img ? (
          <img
            src={view.img}
            alt={view.title}
            loading="lazy"
            decoding="async"
            className="mk-dcart-item__image"
          />
        ) : (
          <div className="mk-dcart-item__imageEmpty">—</div>
        )}
      </a>

      <div className="mk-dcart-item__body mk-dcart-item__bodyPro">
        <div className="mk-dcart-item__contentPro">
          <div className="mk-dcart-item__main mk-dcart-item__mainPro">
            <div className="mk-dcart-item__titleRowInline">
              <a
                href={view.productHref}
                className="mk-dcart-item__title mk-dcart-item__titleLink"
                title={view.title}
              >
                {view.title}
              </a>

              {view.specialOfferAdjustment ? (
                <span className="mk-dcart-offerGiftBadge">
                  {view.specialOfferAdjustment.label}
                </span>
              ) : null}
            </div>

            <div className="mk-dcart-item__micro">
              <span>داخل السلة</span>
              {view.hasEditableOptions ? <span>قابل للتعديل</span> : null}
            </div>

            {view.specialOfferAdjustment?.offerTitle ? (
              <div className="mk-dcart-offerGiftNote">
                بسبب عرض: {view.specialOfferAdjustment.offerTitle}
              </div>
            ) : null}

            {view.selectedPairs.length ? (
              <div className="mk-dcart-options">
                {view.selectedPairs.map((x, idx) => (
                  <button
                    key={`${x.optionName}-${x.valueName}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (view.hasEditableOptions && !isRemoving) {
                        onEdit(itemId);
                      }
                    }}
                    disabled={isRemoving}
                    className={[
                      "mk-dcart-optionPill",
                      view.hasEditableOptions && !isRemoving
                        ? "is-clickable"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="mk-dcart-optionPill__name">
                      {x.optionName}
                    </span>
                    <span className="mk-dcart-optionPill__value">
                      {x.valueName}
                    </span>
                  </button>
                ))}
              </div>
            ) : view.hasEditableOptions ? (
              <button
                type="button"
                onClick={() => onEdit(itemId)}
                disabled={isRemoving}
                className="mk-dcart-editExtrasBtn"
              >
                تعديل الملاحظة / الصور
              </button>
            ) : null}

            {view.customerNote || view.attachments.length ? (
              <div className="mk-dcart-extrasCompact">
                {view.customerNote ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (view.hasEditableOptions && !isRemoving) {
                        onEdit(itemId);
                      }
                    }}
                    disabled={isRemoving}
                    className="mk-dcart-noteChip"
                  >
                    <span className="mk-dcart-noteChip__label">ملاحظة</span>
                    <span className="mk-dcart-noteChip__text">
                      {view.customerNote}
                    </span>
                  </button>
                ) : null}

                {view.attachments.length ? (
                  <div className="mk-dcart-attCompact">
                    <div className="mk-dcart-attCompact__label">
                      <span>الصور</span>
                      <strong>{view.attachments.length}</strong>
                    </div>

                    <div className="mk-dcart-attCompact__list">
                      {view.attachments.map((att) => {
                        const canPreview = Boolean(att.url);

                        return (
                          <div
                            key={`att-${itemId}-${att.index}`}
                            className="mk-dcart-attChip"
                          >
                            <button
                              type="button"
                              disabled={!canPreview || isRemoving}
                              onClick={() =>
                                onPreviewAttachment(att.url, att.isImage)
                              }
                              className="mk-dcart-attChip__preview"
                              aria-label={
                                att.isImage
                                  ? "عرض الصورة المرفقة"
                                  : "عرض المرفق"
                              }
                            >
                              <span className="mk-dcart-attChip__media">
                                {att.isImage && att.url ? (
                                  <img
                                    src={att.url}
                                    alt="الصورة المرفقة"
                                    loading="lazy"
                                    decoding="async"
                                    className="mk-dcart-attChip__img"
                                  />
                                ) : (
                                  <span className="mk-dcart-attChip__file">
                                    📎
                                  </span>
                                )}
                              </span>
                            </button>

                            <div className="mk-dcart-attChip__hoverCard">
                              <button
                                type="button"
                                disabled={!canPreview || isRemoving}
                                onClick={() =>
                                  onPreviewAttachment(att.url, att.isImage)
                                }
                                className="mk-dcart-attChip__hoverPreview"
                                aria-label={
                                  att.isImage
                                    ? "فتح الصورة المرفقة"
                                    : "فتح المرفق"
                                }
                              >
                                {att.isImage && att.url ? (
                                  <img
                                    src={att.url}
                                    alt="الصورة المرفقة"
                                    loading="lazy"
                                    decoding="async"
                                    className="mk-dcart-attChip__hoverImg"
                                  />
                                ) : (
                                  <span className="mk-dcart-attChip__hoverFile">
                                    📎
                                  </span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => onEdit(itemId)}
                                disabled={isRemoving}
                                className="mk-dcart-attChip__remove"
                              >
                                إزالة
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mk-dcart-item__sidePro">
            <div className="mk-dcart-item__actions">
              {view.hasEditableOptions ? (
                <button
                  type="button"
                  onClick={() => onEdit(itemId)}
                  disabled={isRemoving}
                  className="mk-dcart-item__editBtn"
                >
                  تعديل
                </button>
              ) : null}

              <button
                type="button"
                className="mk-dcart-removeBtn"
                disabled={isRemoving}
                onClick={() => onRemoveClick(itemId)}
              >
                {isRemoving ? "يحذف..." : "حذف"}
              </button>
            </div>

            <div className="mk-dcart-priceLine mk-dcart-priceLinePro">
              <div className="mk-dcart-price">
                {priceText ?? "غير متوفر"}
              </div>

              {compareText ? (
                <div className="mk-dcart-compare">{compareText}</div>
              ) : null}

              {lineTotalText ? (
                <div className="mk-dcart-lineTotal">
                  <span>المجموع</span>
                  <strong>{lineTotalText}</strong>
                </div>
              ) : null}
            </div>

            <div className="mk-dcart-qty">
              <button
                type="button"
                className="mk-dcart-qty__btn"
                disabled={isRemoving || view.qty <= 1}
                onClick={() => onQtyChange(itemId, -1)}
                aria-label="إنقاص الكمية"
                title="إنقاص الكمية"
              >
                {isMinusPending ? <TinySpinner /> : "−"}
              </button>

              <div className="mk-dcart-qty__value">{view.qty}</div>

              <button
                type="button"
                className="mk-dcart-qty__btn"
                disabled={view.plusDisabled}
                onClick={() => {
                  if (view.plusDisabled) return;
                  onQtyChange(itemId, 1);
                }}
                aria-label={view.plusTitle}
                title={view.plusTitle}
              >
                {isPlusPending ? <TinySpinner /> : "+"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function CartItemsList({
  items,
  summary,
  loading,
  busy,
  onInc,
  onRemove,
  onReload,
  flash,
}: Props) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [touchingId, setTouchingId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentPreview | null>(null);
  const [qtyPending, setQtyPending] = useState<QtyPending>(null);

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qtyPendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currencySymbol = useMemo(() => readCurrencySymbol(summary ?? null), [
    summary,
  ]);

  const currencyDecimals = useMemo(() => {
    const summaryAny: any = summary ?? null;

    return clampDecimals(
      summaryAny?.currency_decimals ?? summaryAny?.currencyDecimals,
    );
  }, [summary]);

  const currencyReady = Boolean(currencySymbol);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }

      if (qtyPendingTimerRef.current) {
        clearTimeout(qtyPendingTimerRef.current);
        qtyPendingTimerRef.current = null;
      }
    };
  }, []);

  const editingItem = useMemo(
    () => items.find((x) => String(x.id) === String(editingItemId)) ?? null,
    [items, editingItemId],
  );

  const touchItem = useCallback((id: string) => {
    setTouchingId(id);

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    touchTimerRef.current = setTimeout(() => {
      setTouchingId(null);
      touchTimerRef.current = null;
    }, 180);
  }, []);

  const showQtyPending = useCallback((id: string, delta: number) => {
    const key = Date.now();

    setQtyPending({ id, delta, key });

    if (qtyPendingTimerRef.current) {
      clearTimeout(qtyPendingTimerRef.current);
    }

    qtyPendingTimerRef.current = setTimeout(() => {
      setQtyPending((current) => {
        if (!current) return null;
        if (current.id === id && current.key === key) return null;
        return current;
      });

      qtyPendingTimerRef.current = null;
    }, 900);
  }, []);

  const openAttachmentPreview = useCallback(
    (url: string | null, isImage: boolean) => {
      if (!url) return;
      setPreviewAttachment({ url, isImage });
    },
    [],
  );

  const closeAttachmentPreview = useCallback(() => {
    setPreviewAttachment(null);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingItemId(id);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingItemId(null);
  }, []);

  const handleChangedEdit = useCallback(() => {
    onReload?.();
  }, [onReload]);

  const handleFlash = useCallback(
    (msg: string, kind?: "info" | "error") => {
      flash?.(msg, kind);
    },
    [flash],
  );

  const handleQtyChange = useCallback(
    (id: string, delta: number) => {
      touchItem(id);
      showQtyPending(id, delta);
      void onInc(id, delta);
    },
    [onInc, showQtyPending, touchItem],
  );

  const handleRemoveClick = useCallback(
    async (id: string) => {
      setRemovingId(id);

      try {
        await onRemove(id);
      } finally {
        setRemovingId(null);
      }
    },
    [onRemove],
  );

  if (loading) {
    return (
      <div className="mk-dcart-items">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mk-dcart-skeletonCard">
            <SkeletonBox width={104} height={122} radius={20} />

            <div className="mk-dcart-skeletonCard__body">
              <SkeletonBox width="58%" height={18} radius={999} />
              <div style={{ height: 10 }} />
              <SkeletonBox width="42%" height={13} radius={999} />
              <div style={{ height: 13 }} />
              <SkeletonBox width="76%" height={28} radius={999} />
              <div style={{ height: 10 }} />
              <SkeletonBox width="50%" height={30} radius={999} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mk-dcart-empty">
        <div className="mk-dcart-empty__icon">🛒</div>

        <div className="mk-dcart-empty__title">سلتك فارغة</div>

        <div className="mk-dcart-empty__text">
          أضف منتجاتك المفضلة وسيظهر ملخص الطلب هنا بشكل مرتب وسريع.
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={["mk-dcart-items", busy ? "is-busy" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {items.map((it) => (
          <CartItemRow
            key={it.id}
            item={it}
            isRemoving={String(removingId ?? "") === String(it.id)}
            isTouched={String(touchingId ?? "") === String(it.id)}
            qtyPending={qtyPending}
            currencySymbol={currencySymbol}
            currencyDecimals={currencyDecimals}
            currencyReady={currencyReady}
            onEdit={handleEdit}
            onRemoveClick={handleRemoveClick}
            onQtyChange={handleQtyChange}
            onPreviewAttachment={openAttachmentPreview}
          />
        ))}
      </div>

      {editingItem ? (
        <EditOptionsModal
          open
          item={editingItem}
          onClose={handleCloseEdit}
          onChanged={handleChangedEdit}
          flash={handleFlash}
        />
      ) : null}

      {previewAttachment ? (
        <div
          className="mk-dcart-attPreview"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الصورة المرفقة"
        >
          <button
            type="button"
            className="mk-dcart-attPreview__overlay"
            onClick={closeAttachmentPreview}
            aria-label="إغلاق المعاينة"
          />

          <div className="mk-dcart-attPreview__panel">
            <div className="mk-dcart-attPreview__head">
              <div>
                <div className="mk-dcart-attPreview__kicker">مرفق الطلب</div>
                <div className="mk-dcart-attPreview__title">
                  {previewAttachment.isImage ? "معاينة الصورة" : "معاينة المرفق"}
                </div>
              </div>

              <button
                type="button"
                className="mk-dcart-attPreview__close"
                onClick={closeAttachmentPreview}
              >
                إغلاق
              </button>
            </div>

            <div className="mk-dcart-attPreview__media">
              {previewAttachment.isImage ? (
                <img
                  src={previewAttachment.url}
                  alt="الصورة المرفقة"
                  className="mk-dcart-attPreview__img"
                />
              ) : (
                <div className="mk-dcart-attPreview__file">
                  <div className="mk-dcart-attPreview__fileIcon">📎</div>

                  <a
                    href={previewAttachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mk-dcart-attPreview__fileLink"
                  >
                    فتح المرفق
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TinySpinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
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

function SkeletonBox({
  width,
  height,
  radius,
}: {
  width: number | string;
  height: number;
  radius: number;
}) {
  return (
    <div
      className="mk-dcart-skeleton"
      style={{
        width,
        height,
        borderRadius: radius,
      }}
    />
  );
}
