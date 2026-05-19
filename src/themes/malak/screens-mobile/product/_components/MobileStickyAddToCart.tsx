// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileStickyAddToCart.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type Props = {
  productId: string;
  variantId: string | null;
  price: number;
  compareAtPrice?: number | null;
  selectedOptionValueIds: string[];
  selectedOptions: Array<{ name: string; value: string }>;
  disabled?: boolean;
  allowFileUpload?: boolean;
  allowNote?: boolean;
  onOpenCart: () => void;
};

type UploadedImage = {
  url: string;
  name: string;
  type: string | null;
  size: number;
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

function formatPrice(n: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(
    Number(n || 0),
  );
}

function hasValidPrice(n: any) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0;
}

function clampQty(n: any) {
  const x = Number(n ?? 1);
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.floor(x));
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

function useBottomOffsetPx() {
  const [px, setPx] = useState(74);

  useEffect(() => {
    const findTabbarEl = () => {
      const byClass = document.querySelector(".mk-tabbar") as HTMLElement | null;
      if (byClass) return byClass;

      const byId = document.getElementById("dvxTabbar_70421");
      if (byId) return byId as HTMLElement;

      const any =
        (document.querySelector('[id^="dvxTabbar_"]') as HTMLElement | null) ??
        (document.querySelector('[data-dvx-tabbar="1"]') as HTMLElement | null);

      return any ?? null;
    };

    const measure = () => {
      const el = findTabbarEl();

      if (!el) {
        setPx(74);
        return;
      }

      const h = Math.max(0, Math.round(el.getBoundingClientRect().height || 0));
      setPx(h ? h + 8 : 74);
    };

    measure();

    const ro =
      "ResizeObserver" in window ? new ResizeObserver(() => measure()) : null;

    const el = findTabbarEl();
    if (el && ro) ro.observe(el);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    const t = window.setInterval(measure, 800);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      if (el && ro) ro.unobserve(el);
      if (ro) ro.disconnect();
    };
  }, []);

  return px;
}

export default function MobileStickyAddToCart({
  productId,
  variantId,
  price,
  compareAtPrice = null,
  selectedOptionValueIds,
  selectedOptions,
  disabled = false,
  allowFileUpload = false,
  allowNote = false,
  onOpenCart,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const [extrasOpen, setExtrasOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bottomOffsetPx = useBottomOffsetPx();

  const priceIsValid = hasValidPrice(price);
  const hasExtras = allowFileUpload || allowNote;
  const hasVariantChoices = selectedOptionValueIds.length > 0;
  const variantMissing = hasVariantChoices && !variantId;

  useEffect(() => {
    setQty(1);
    setMsg(null);
  }, [productId, variantId, selectedOptionValueIds.join("|")]);

  const canSubmit = useMemo(() => {
    if (!productId) return false;
    if (loading) return false;
    if (disabled) return false;
    if (variantMissing) return false;
    if (qty < 1) return false;
    return true;
  }, [productId, qty, loading, disabled, variantMissing]);

  function flash(message: string) {
    setMsg(message);
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

    const invalidType = picked.find((f) => !isAllowedImageFile(f));
    if (invalidType) {
      flash("مسموح فقط بصور JPG / PNG / WEBP");
      resetFileInput();
      return;
    }

    const tooLarge = picked.find((f) => Number(f.size || 0) > MAX_IMAGE_BYTES);
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

  async function addToCart() {
    if (variantMissing) {
      flash("اختر الخيارات أولاً");
      return;
    }

    if (!canSubmit) return;

    setLoading(true);
    setMsg(null);

    try {
      const uploadedImages: UploadedImage[] = [];

      if (allowFileUpload && attachedImages.length) {
        for (const file of attachedImages) {
          if (!isAllowedImageFile(file)) {
            throw new Error("IMAGES_ONLY");
          }

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

      const formData = new FormData();
      formData.append("product_id", productId);
      if (variantId) formData.append("variant_id", variantId);
      formData.append("qty", String(qty));

      for (const id of selectedOptionValueIds || []) {
        formData.append("selected_option_value_ids[]", String(id));
      }

      formData.append("selected_options", JSON.stringify(finalSelectedOptions));

      const res = await fetch("/api/cart/items", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        flash(json?.message || json?.error || "تعذر إضافة المنتج للسلة");
        return;
      }

      window.dispatchEvent(new CustomEvent("cart:changed"));

      setNote("");
      setNoteOpen(false);
      setExtrasOpen(false);
      setAttachedImages([]);
      resetFileInput();

      onOpenCart();
    } catch (e: any) {
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
        flash("تعذر إضافة المنتج للسلة");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="mksac-wrap"
      style={
        {
          "--mksac-bottom-offset": `${bottomOffsetPx}px`,
        } as CSSProperties
      }
    >
      <div className="mksac-card">
        {msg ? <div className="mksac-error">{msg}</div> : null}

        {hasExtras && extrasOpen ? (
          <div className="mksac-extrasPanel">
            <div className="mksac-extrasBtns">
              {allowFileUpload ? (
                <>
                  <button
                    type="button"
                    className="mksac-extraBtn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || attachedImages.length >= MAX_IMAGES}
                  >
                    إرفاق صور
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    className="mksac-fileInput"
                    onChange={(e) => handlePickImages(e.target.files)}
                  />
                </>
              ) : null}

              {allowNote ? (
                <button
                  type="button"
                  className="mksac-extraBtn"
                  onClick={() => setNoteOpen((v) => !v)}
                  disabled={loading}
                >
                  إضافة ملاحظة
                </button>
              ) : null}
            </div>

            {attachedImages.length ? (
              <div className="mksac-files">
                {attachedImages.map((file, index) => (
                  <span key={`${file.name}-${file.size}-${index}`}>
                    صورة {index + 1}
                  </span>
                ))}
              </div>
            ) : null}

            {allowNote && noteOpen ? (
              <textarea
                className="mksac-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اكتب ملاحظتك هنا"
                rows={2}
              />
            ) : null}
          </div>
        ) : null}

        <div
          className={`mksac-main ${
            hasExtras ? "mksac-main--withExtras" : "mksac-main--noExtras"
          }`}
        >
          {hasExtras ? (
            <button
              type="button"
              className={`mksac-more ${extrasOpen ? "mksac-more--active" : ""}`}
              onClick={() => setExtrasOpen((v) => !v)}
              aria-label="المرفقات والملاحظات"
            >
              <span className="mksac-moreIcon" aria-hidden="true">
                📎
              </span>
              <span className="mksac-moreText">مرفقات</span>
            </button>
          ) : null}

          <div className="mksac-qty">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={loading || qty <= 1}
              aria-label="نقص"
            >
              −
            </button>

            <span>{qty}</span>

            <button
              type="button"
              onClick={() => setQty((q) => clampQty(q + 1))}
              disabled={loading}
              aria-label="زيادة"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="mksac-submit"
            onClick={addToCart}
            disabled={!canSubmit}
          >
            <span>{loading ? "جارٍ الإضافة..." : "أضف للسلة"}</span>

            {priceIsValid ? <b>{formatPrice(price)} ر.س</b> : null}
          </button>
        </div>

        {priceIsValid && compareAtPrice && compareAtPrice > price ? (
          <div className="mksac-compare">
            بدلاً من {formatPrice(compareAtPrice)} ر.س
          </div>
        ) : null}
      </div>
    </div>
  );
}