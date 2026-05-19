// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartItemCard.tsx
"use client";

import { useMemo } from "react";
import type { CartItemEnriched } from "../../../screens/cart/_components/types";

function money(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;

  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
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

function readAttachmentsCount(item: CartItemEnriched) {
  let count = 0;

  for (let i = 1; i <= 4; i++) {
    const name = readSpecialSelectedOption(item, `__attachment_${i}_name`);
    const url = readSpecialSelectedOption(item, `__attachment_${i}_url`);

    if (name || url) count += 1;
  }

  return count;
}

type Props = {
  item: CartItemEnriched;
  busy: boolean;
  onInc: (cart_item_id: string, delta: number) => void;
  onRemove: (cart_item_id: string) => void;
  onEdit: (itemId: string) => void;
};

export default function MobileCartItemCard({
  item,
  busy,
  onInc,
  onRemove,
  onEdit,
}: Props) {
  const title = item.product?.name ?? "منتج";
  const img = item.product?.image_url ?? null;

  const salePrice = Number(item.product?.sale_price ?? 0);
  const basePrice = Number(item.product?.price ?? 0);

  const price =
    Number.isFinite(salePrice) && salePrice > 0
      ? salePrice
      : Number.isFinite(basePrice)
        ? basePrice
        : null;

  const compareAt = salePrice > 0 && basePrice > salePrice ? basePrice : null;
  const qty = Math.max(1, Number(item.qty ?? 1));
  const lineTotal =
    typeof price === "number" ? Number(price) * Number(qty) : null;

  const selectedPairs = useMemo(() => buildSelectedOptionsLabel(item), [item]);
  const customerNote = readSpecialSelectedOption(item, "ملاحظة");
  const attachmentsCount = readAttachmentsCount(item);

  return (
    <div className={`mk-mobile-cart-item ${busy ? "is-busy" : ""}`}>
      <div className="mk-mobile-cart-item__grid">
        <div className="mk-mobile-cart-item__imageBox">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={title}
              loading="lazy"
              decoding="async"
              className="mk-mobile-cart-item__image"
            />
          ) : (
            <div className="mk-mobile-cart-item__imageEmpty">صورة</div>
          )}

          {qty > 1 ? (
            <div className="mk-mobile-cart-item__qtyBadge">{qty}</div>
          ) : null}
        </div>

        <div className="mk-mobile-cart-item__body">
          <div className="mk-mobile-cart-item__titleRow">
            <div className="mk-mobile-cart-item__title">{title}</div>

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={busy}
              className="mk-mobile-cart-item__remove"
              aria-label="حذف"
            >
              ×
            </button>
          </div>

          {selectedPairs.length ? (
            <div className="mk-mobile-cart-item__options">
              {selectedPairs.slice(0, 3).map((x, idx) => (
                <button
                  key={`${x.optionName}-${x.valueName}-${idx}`}
                  type="button"
                  onClick={() => onEdit(item.id)}
                  disabled={busy}
                  className="mk-mobile-cart-item__option"
                >
                  {x.optionName}: {x.valueName}
                </button>
              ))}

              {selectedPairs.length > 3 ? (
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  disabled={busy}
                  className="mk-mobile-cart-item__optionMore"
                >
                  +{selectedPairs.length - 3}
                </button>
              ) : null}
            </div>
          ) : null}

          {customerNote || attachmentsCount > 0 ? (
            <button
              type="button"
              onClick={() => onEdit(item.id)}
              disabled={busy}
              className="mk-mobile-cart-item__noteBtn"
            >
              {customerNote ? (
                <div className="mk-mobile-cart-item__noteText">
                  ملاحظة: {customerNote}
                </div>
              ) : null}

              {attachmentsCount > 0 ? (
                <div className="mk-mobile-cart-item__attachmentText">
                  📎 {attachmentsCount} مرفق
                </div>
              ) : null}
            </button>
          ) : null}

          <div className="mk-mobile-cart-item__priceLine">
            <div className="mk-mobile-cart-item__price">
              {typeof price === "number" ? `${money(price)} ر.س` : "غير متوفر"}
            </div>

            {typeof compareAt === "number" ? (
              <div className="mk-mobile-cart-item__compare">
                {money(compareAt)} ر.س
              </div>
            ) : null}
          </div>

          {typeof lineTotal === "number" ? (
            <div className="mk-mobile-cart-item__lineTotal">
              الإجمالي: {money(lineTotal)} ر.س
            </div>
          ) : null}
        </div>
      </div>

      <div className="mk-mobile-cart-item__actions">
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          disabled={busy}
          className="mk-mobile-cart-item__edit"
        >
          تعديل الخيارات
        </button>

        <div className="mk-mobile-cart-item__stepper">
          <button
            type="button"
            className="mk-mobile-cart-item__stepBtn"
            disabled={busy || qty <= 1}
            onClick={() => onInc(item.id, -1)}
            aria-label="إنقاص الكمية"
          >
            −
          </button>

          <div className="mk-mobile-cart-item__stepValue">{qty}</div>

          <button
            type="button"
            className="mk-mobile-cart-item__stepBtn"
            disabled={busy}
            onClick={() => onInc(item.id, 1)}
            aria-label="زيادة الكمية"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}