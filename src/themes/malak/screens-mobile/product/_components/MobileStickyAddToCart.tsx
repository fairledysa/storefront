// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileStickyAddToCart.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  productId: string;
  productTitle?: string | null;
  productImageUrl?: string | null;
  variantId?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  currencyDecimals?: number | string | null;
  saleEnd?: string | null;
  showSaleCountdown?: boolean;
  selectedOptionValueIds?: string[];
  selectedOptions?: Array<{ name: string; value: string }>;
  disabled?: boolean;
  allowFileUpload?: boolean;
  allowNote?: boolean;
  enableToast?: boolean;
};

type UploadedImage = {
  url: string;
  name: string;
  type: string | null;
  size: number;
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

function s(value: any) {
  return String(value ?? "").trim();
}

function clampDecimals(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function formatPrice(n: number, decimalDigits = 0) {
  return new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(Number(n || 0));
}

function formatMoney(
  value: number,
  currencySymbol: string,
  decimalDigits: number,
) {
  const formatted = formatPrice(value, decimalDigits);
  const symbol = s(currencySymbol);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

function isAllowedImageFile(file: File) {
  const type = String(file.type || "").toLowerCase();

  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"
  );
}

async function uploadAttachmentToR2(file: File): Promise<UploadedImage> {
  const fd = new FormData();

  fd.append("kind", "product-attachment");
  fd.append("file", file, file.name);

  const res = await fetch("/api/uploads/r2/put", {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok || !json?.publicUrl) {
    throw new Error(json?.error || json?.message || "UPLOAD_FAILED");
  }

  return {
    url: String(json.publicUrl),
    name: String(json.fileName || file.name || ""),
    type: json.fileType ? String(json.fileType) : file.type || null,
    size: Number(json.fileSize || file.size || 0),
  };
}

export default function MobileStickyAddToCart({
  productId,
  productTitle = null,
  productImageUrl = null,
  variantId = null,
  price = null,
  compareAtPrice = null,
  currencyCode = null,
  currencySymbol = "",
  currencyDecimals = 0,
  selectedOptionValueIds = [],
  selectedOptions = [],
  disabled = false,
  allowFileUpload = false,
  allowNote = false,
  enableToast = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [note, setNote] = useState("");
  const [attachedImages, setAttachedImages] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadingTimerRef = useRef<number | null>(null);

  const safeCurrencyCode = s(currencyCode).toUpperCase();
  const safeCurrencySymbol = s(currencySymbol);
  const safeCurrencyDecimals = clampDecimals(currencyDecimals);

  const cleanProductTitle = s(productTitle) || "المنتج";
  const cleanProductImageUrl = s(productImageUrl);

  const hasOptions = (selectedOptionValueIds?.length ?? 0) > 0;
  const variantMissing = hasOptions && !variantId;
  const baseDisabled = disabled || variantMissing;

  const hasExtras = allowFileUpload || allowNote;
  const hasExtrasValue = Boolean(attachedImages.length || note.trim());

  const canBuy = useMemo(() => {
    if (loading) return false;
    if (baseDisabled) return false;
    return true;
  }, [loading, baseDisabled]);

  const clearLoadingTimer = useCallback(() => {
    if (!loadingTimerRef.current) return;

    window.clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = null;
  }, []);

  const stopLoading = useCallback(() => {
    clearLoadingTimer();
    setLoading(false);
  }, [clearLoadingTimer]);

  const armLoadingFallback = useCallback(
    (ms = 12000) => {
      clearLoadingTimer();

      loadingTimerRef.current = window.setTimeout(() => {
        loadingTimerRef.current = null;
        setLoading(false);
      }, ms);
    },
    [clearLoadingTimer],
  );

  useEffect(() => {
    const isSameProduct = (detail: any) => {
      const ids = [
        detail?.product_id,
        detail?.productId,
        detail?.id,
        detail?.product?.id,
        detail?.product?.product_id,
        detail?.product?.productId,
        detail?.item?.id,
        detail?.item?.product_id,
        detail?.item?.productId,
      ]
        .map((value) => s(value))
        .filter(Boolean);

      return ids.includes(s(productId));
    };

    const onDone = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (!isSameProduct(detail)) return;
      stopLoading();
    };

    const onError = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (!isSameProduct(detail)) return;
      stopLoading();
    };

    const onCartChanged = () => {
      stopLoading();
    };

    window.addEventListener("product:add-to-cart:done", onDone as EventListener);
    window.addEventListener(
      "product:add-to-cart:error",
      onError as EventListener,
    );
    window.addEventListener("cart:changed", onCartChanged as EventListener);

    return () => {
      window.removeEventListener(
        "product:add-to-cart:done",
        onDone as EventListener,
      );
      window.removeEventListener(
        "product:add-to-cart:error",
        onError as EventListener,
      );
      window.removeEventListener("cart:changed", onCartChanged as EventListener);
    };
  }, [productId, stopLoading]);

  useEffect(() => {
    return () => {
      clearLoadingTimer();
    };
  }, [clearLoadingTimer]);

  function flash(message: string) {
    if (!enableToast) return;

    window.dispatchEvent(
      new CustomEvent("toast", {
        detail: { message },
      }),
    );
  }

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePickImages(filesList: FileList | null) {
    const picked = Array.from(filesList || []);
    if (!picked.length) return;

    const invalidType = picked.find((file) => !isAllowedImageFile(file));
    if (invalidType) {
      flash("مسموح فقط بصور JPG / PNG / WEBP");
      resetFileInput();
      return;
    }

    const tooLarge = picked.find(
      (file) => Number(file.size || 0) > MAX_IMAGE_BYTES,
    );

    if (tooLarge) {
      flash("حجم كل صورة يجب ألا يتجاوز 7MB");
      resetFileInput();
      return;
    }

    setAttachedImages((prev) => {
      const merged = [...prev];

      for (const file of picked) {
        const exists = merged.some(
          (x) =>
            x.name === file.name &&
            x.size === file.size &&
            x.lastModified === file.lastModified,
        );

        if (!exists) merged.push(file);
      }

      if (merged.length > MAX_IMAGES) {
        flash("الحد الأقصى 4 صور فقط");
        return merged.slice(0, MAX_IMAGES);
      }

      return merged;
    });

    resetFileInput();
  }

  function removeImageAt(index: number) {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddToCart() {
    if (variantMissing) {
      flash("اختر الخيارات أولاً");
      return;
    }

    if (baseDisabled || loading) return;

    try {
      setLoading(true);

      const uploadedImages: UploadedImage[] = [];

      if (allowFileUpload && attachedImages.length) {
        for (const file of attachedImages) {
          if (!isAllowedImageFile(file)) throw new Error("IMAGES_ONLY");

          if (Number(file.size || 0) > MAX_IMAGE_BYTES) {
            throw new Error("IMAGE_TOO_LARGE");
          }
        }

        if (attachedImages.length > MAX_IMAGES) {
          throw new Error("TOO_MANY_IMAGES");
        }

        for (const file of attachedImages) {
          const uploaded = await uploadAttachmentToR2(file);
          uploadedImages.push(uploaded);
        }
      }

      const finalSelectedOptions: Array<{ name: string; value: string }> = [
        ...(selectedOptions || []),
      ];

      if (allowNote && note.trim()) {
        finalSelectedOptions.push({
          name: "ملاحظة",
          value: note.trim(),
        });
      }

      uploadedImages.forEach((img, index) => {
        const n = index + 1;

        finalSelectedOptions.push({
          name: `__attachment_${n}_name`,
          value: img.name,
        });

        finalSelectedOptions.push({
          name: `__attachment_${n}_type`,
          value: img.type || "image/*",
        });

        finalSelectedOptions.push({
          name: `__attachment_${n}_size`,
          value: String(img.size),
        });

        finalSelectedOptions.push({
          name: `__attachment_${n}_url`,
          value: img.url,
        });
      });

      const productPayload = {
        id: productId,
        product_id: productId,
        productId,

        name: cleanProductTitle,
        title: cleanProductTitle,

        image_url: cleanProductImageUrl,
        imageUrl: cleanProductImageUrl,

        price,
        unit_price: price,
        unitPrice: price,
        sale_price: price,
        salePrice: price,

        compare_at_price: compareAtPrice,
        compareAtPrice,

        currency: safeCurrencyCode,
        currency_code: safeCurrencyCode,
        currencyCode: safeCurrencyCode,

        currency_symbol: safeCurrencySymbol,
        currencySymbol: safeCurrencySymbol,
        symbol: safeCurrencySymbol,

        currency_decimals: safeCurrencyDecimals,
        currencyDecimals: safeCurrencyDecimals,
        decimal_digits: safeCurrencyDecimals,
        decimalDigits: safeCurrencyDecimals,
      };

      window.dispatchEvent(
        new CustomEvent("product:add-to-cart", {
          detail: {
            id: productId,
            product_id: productId,
            productId,

            title: cleanProductTitle,
            name: cleanProductTitle,

            imageUrl: cleanProductImageUrl,
            image_url: cleanProductImageUrl,

            price,
            unit_price: price,
            unitPrice: price,
            sale_price: price,
            salePrice: price,

            compare_at_price: compareAtPrice,
            compareAtPrice,

            currency: safeCurrencyCode,
            currency_code: safeCurrencyCode,
            currencyCode: safeCurrencyCode,

            currency_symbol: safeCurrencySymbol,
            currencySymbol: safeCurrencySymbol,
            symbol: safeCurrencySymbol,

            currency_decimals: safeCurrencyDecimals,
            currencyDecimals: safeCurrencyDecimals,
            decimal_digits: safeCurrencyDecimals,
            decimalDigits: safeCurrencyDecimals,

            qty,

            variant_id: variantId,
            variantId,

            selected_option_value_ids: selectedOptionValueIds || [],
            selectedOptionValueIds: selectedOptionValueIds || [],

            selected_options: finalSelectedOptions,
            selectedOptions: finalSelectedOptions,

            product: productPayload,

            item: {
              ...productPayload,
              qty,
            },

            quickView: false,
          },
        }),
      );

      armLoadingFallback();

      setNote("");
      setAttachedImages([]);
      setExtrasOpen(false);
      resetFileInput();
    } catch (e: any) {
      stopLoading();

      if (e?.message === "IMAGES_ONLY") {
        flash("مسموح فقط بصور JPG / PNG / WEBP");
      } else if (e?.message === "IMAGE_TOO_LARGE") {
        flash("حجم كل صورة يجب ألا يتجاوز 7MB");
      } else if (e?.message === "TOO_MANY_IMAGES") {
        flash("الحد الأقصى 4 صور فقط");
      } else if (
        e?.message === "ONLY_SUPPORTED_IMAGES_ALLOWED" ||
        e?.message === "ONLY_IMAGES_ALLOWED"
      ) {
        flash("مسموح فقط بصور JPG / PNG / WEBP");
      } else if (e?.message === "UPLOAD_FAILED") {
        flash("فشل رفع الصور");
      } else {
        flash("خطأ في الإضافة");
      }
    }
  }

  return (
    <div
      dir="rtl"
      className={[
        "mk-mcart",
        hasExtras ? "has-extras" : "",
        extrasOpen ? "is-extras-open" : "",
        hasExtrasValue ? "has-extras-value" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasExtras && extrasOpen ? (
        <div className="mk-mcart-extras">
          <div className="mk-mcart-extras__head">
            <div>
              <strong>المرفقات</strong>
              <span>اختياري قبل الإضافة للسلة</span>
            </div>

            <button
              type="button"
              onClick={() => setExtrasOpen(false)}
              className="mk-mcart-extras__close"
              aria-label="إغلاق المرفقات"
            >
              ×
            </button>
          </div>

          <div
            className={[
              "mk-mcart-extras__actions",
              allowFileUpload && allowNote
                ? "mk-mcart-extras__actions--two"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {allowFileUpload ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mk-mcart-extraBtn"
                disabled={loading}
              >
                <span>إرفاق صور</span>
                <b>{attachedImages.length ? attachedImages.length : "＋"}</b>
              </button>
            ) : null}

            {allowNote ? (
              <button
                type="button"
                onClick={() => setNote((value) => value)}
                className="mk-mcart-extraBtn"
                disabled={loading}
              >
                <span>ملاحظة</span>
                <b>{note.trim() ? "✓" : "＋"}</b>
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            className="mk-mcart-fileInput"
            onChange={(event) => handlePickImages(event.target.files)}
            disabled={loading}
          />

          {allowNote ? (
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="اكتب ملاحظتك هنا"
              rows={2}
              className="mk-mcart-note"
              disabled={loading}
            />
          ) : null}

          {allowFileUpload ? (
            <div className="mk-mcart-hint">
              حتى 4 صور بصيغة JPG / PNG / WEBP، الحد الأقصى لكل صورة 7MB
            </div>
          ) : null}

          {attachedImages.length ? (
            <div className="mk-mcart-files">
              {attachedImages.map((file, idx) => {
                const preview = URL.createObjectURL(file);

                return (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                    className="mk-mcart-file"
                  >
                    <img src={preview} alt={file.name} />

                    <button
                      type="button"
                      onClick={() => removeImageAt(idx)}
                      disabled={loading}
                      aria-label="إزالة الصورة"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mk-mcart-bar">
        <div className="mk-mcart-qty" aria-label="الكمية">
          <button
            type="button"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            disabled={loading}
            aria-label="تقليل الكمية"
          >
            −
          </button>

          <span>{qty}</span>

          <button
            type="button"
            onClick={() => setQty((value) => value + 1)}
            disabled={loading}
            aria-label="زيادة الكمية"
          >
            +
          </button>
        </div>

        {hasExtras ? (
          <button
            type="button"
            className="mk-mcart-extrasBtn"
            onClick={() => setExtrasOpen((value) => !value)}
            disabled={loading}
            aria-pressed={extrasOpen}
          >
            <span>{hasExtrasValue ? "تمت" : "مرفقات"}</span>
          </button>
        ) : null}

        <button
          type="button"
          disabled={!canBuy}
          aria-busy={loading ? "true" : "false"}
          data-loading={loading ? "true" : "false"}
          data-mk-cart-product-id={productId}
          data-disabled={baseDisabled ? "true" : "false"}
          data-mk-original-disabled={baseDisabled ? "true" : "false"}
          className={["mk-mcart-submit", loading ? "is-loading" : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => void handleAddToCart()}
        >
          <span className="mk-mcart-submit__label">
            {loading ? "جارٍ الإضافة..." : "أضف للسلة"}
          </span>

          {typeof price === "number" ? (
            <span className="mk-mcart-submit__price">
              {formatMoney(price, safeCurrencySymbol, safeCurrencyDecimals)}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}