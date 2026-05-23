// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileEditOptionsSheet.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CartItemEnriched,
  ProductOption,
  ProductVariant,
  VariantLink,
} from "../../../screens/cart/_components/types";
import { apiPatchCartItem } from "../../../screens/cart/_components/cart-api";
import {
  buildDefaultSelection,
  computeAllowedValues,
  resolveVariantIdFromSelection,
} from "../../../screens/cart/_components/options-logic";

type Props = {
  open: boolean;
  onClose: () => void;
  item: CartItemEnriched | null;
  onChanged: () => void;
  flash: (msg: string, kind?: "info" | "error") => void;
};

type UploadedImage = {
  url: string;
  name: string;
  type: string | null;
  size: number;
};

type ExistingAttachment = {
  index: number;
  name: string | null;
  type: string | null;
  size: number | null;
  url: string | null;
};

type NewFilePreview = {
  file: File;
  url: string;
};

type ImagePreview = {
  url: string;
  name: string;
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const CLOSE_ANIMATION_MS = 260;

function s(value: any) {
  return String(value ?? "").trim();
}

function optionLabel(value: any) {
  return s(value?.display_value) || s(value?.displayValue) || s(value?.name);
}

function optionColor(value: any) {
  return s(value?.color) || s(value?.hex) || s(value?.hex_color);
}

function optionImage(value: any) {
  return (
    s(value?.image_url) ||
    s(value?.imageUrl) ||
    s(value?.image) ||
    s(value?.url)
  );
}

function readSpecialSelectedOption(
  item: CartItemEnriched | null,
  key: string,
): string | null {
  const raw = Array.isArray(item?.selected_options)
    ? item?.selected_options
    : [];

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

  return [u, n].some((value) =>
    [".png", ".jpg", ".jpeg", ".webp"].some((ext) => value.includes(ext)),
  );
}

function readExistingAttachments(
  item: CartItemEnriched | null,
): ExistingAttachment[] {
  const out: ExistingAttachment[] = [];

  for (let i = 1; i <= MAX_IMAGES; i++) {
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
    });
  }

  return out;
}

function isAllowedImageFile(file: File) {
  const type = s(file.type).toLowerCase();

  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"
  );
}

function formatFileSize(size: number | null) {
  const n = Number(size ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "";

  if (n < 1024 * 1024) return `${Math.ceil(n / 1024)}KB`;

  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

function getOptions(item: CartItemEnriched | null) {
  return ((item?.options || []) as ProductOption[]) ?? [];
}

function getVariants(item: CartItemEnriched | null) {
  return ((item?.variants || []) as ProductVariant[]) ?? [];
}

function getLinks(item: CartItemEnriched | null) {
  return ((item?.variant_links || []) as VariantLink[]) ?? [];
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

export default function MobileEditOptionsSheet({
  open,
  onClose,
  item,
  onChanged,
  flash,
}: Props) {
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const [renderItem, setRenderItem] = useState<CartItemEnriched | null>(item);

  const activeItem = item ?? renderItem;

  const options = useMemo(() => getOptions(activeItem), [activeItem?.options]);
  const variants = useMemo(
    () => getVariants(activeItem),
    [activeItem?.variants],
  );
  const links = useMemo(
    () => getLinks(activeItem),
    [activeItem?.variant_links],
  );

  const [selectedByOption, setSelectedByOption] = useState<
    Record<string, string | null>
  >({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [existingAttachments, setExistingAttachments] = useState<
    ExistingAttachment[]
  >([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<NewFilePreview[]>([]);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetKey = `${s(activeItem?.id)}:${s(activeItem?.variant_id)}:${s(
    (activeItem as any)?.updated_at,
  )}:${s(activeItem?.qty)}`;

  useEffect(() => {
    if (open && item) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setShouldRender(true);
      setClosing(false);
      setRenderItem(item);
      return;
    }

    if (!open && shouldRender) {
      setClosing(true);

      const timer = window.setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
        setRenderItem(null);
      }, CLOSE_ANIMATION_MS);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [open, item, shouldRender]);

  useEffect(() => {
    if (!shouldRender) return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!open || !activeItem) return;

    setSelectedByOption(
      buildDefaultSelection(options, activeItem.selected_option_value_ids || []),
    );
    setNote(readSpecialSelectedOption(activeItem, "ملاحظة") || "");
    setExistingAttachments(readExistingAttachments(activeItem));
    setNewFiles([]);
    setImagePreview(null);
    setBusy(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, activeItem, options, resetKey]);

  useEffect(() => {
    const previews = newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setNewFilePreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newFiles]);

  function closeWithMotion() {
    if (busy || closing) return;

    if (imagePreview) {
      setImagePreview(null);
      return;
    }

    setClosing(true);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      setClosing(false);
      setRenderItem(null);
      onClose();
    }, CLOSE_ANIMATION_MS);
  }

  useEffect(() => {
    if (!shouldRender) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (imagePreview) {
        setImagePreview(null);
        return;
      }

      closeWithMotion();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldRender, imagePreview, busy, closing]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const selectedValueIds = useMemo(
    () =>
      Object.values(selectedByOption)
        .filter((value): value is string => Boolean(value))
        .map(String),
    [selectedByOption],
  );

  const allowedByOption = useMemo(() => {
    if (!open) return new Map<string, Set<string>>();
    if (!options.length || !variants.length || !links.length) return new Map();

    return computeAllowedValues({
      options,
      variants,
      variant_links: links,
      selectedByOptionId: selectedByOption,
    });
  }, [open, options, variants, links, selectedByOption]);

  const resolvedVariantId = useMemo(() => {
    if (!variants.length) return null;

    return resolveVariantIdFromSelection({
      variants,
      variant_links: links,
      selected_value_ids: selectedValueIds,
    });
  }, [variants, links, selectedValueIds]);

  const canResolveVariant = !variants.length || Boolean(resolvedVariantId);
  const attachmentsCount = existingAttachments.length + newFiles.length;
  const productName = s(activeItem?.product?.name) || "المنتج";
  const productImage = s(activeItem?.product?.image_url);
  const hasVariantOptions = options.length > 0;

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openImagePreview(url: string | null, name?: string | null) {
    const cleanUrl = s(url);
    if (!cleanUrl) return;

    setImagePreview({
      url: cleanUrl,
      name: s(name) || "الصورة المرفقة",
    });
  }

  function handlePickImages(filesList: FileList | null) {
    const picked = Array.from(filesList || []);
    if (!picked.length) return;

    const invalidType = picked.find((file) => !isAllowedImageFile(file));
    if (invalidType) {
      flash("مسموح فقط بصور JPG / PNG / WEBP", "error");
      resetFileInput();
      return;
    }

    const tooLarge = picked.find(
      (file) => Number(file.size || 0) > MAX_IMAGE_BYTES,
    );

    if (tooLarge) {
      flash("حجم كل صورة يجب ألا يتجاوز 7MB", "error");
      resetFileInput();
      return;
    }

    if (attachmentsCount + picked.length > MAX_IMAGES) {
      flash("الحد الأقصى 4 صور فقط", "error");
      resetFileInput();
      return;
    }

    setNewFiles((prev) => {
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

      return merged;
    });

    resetFileInput();
  }

  function removeExistingAttachment(index: number) {
    setExistingAttachments((prev) => prev.filter((x) => x.index !== index));
  }

  function removeNewFileAt(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSave() {
    if (!activeItem) return;

    try {
      setBusy(true);

      if (existingAttachments.length + newFiles.length > MAX_IMAGES) {
        flash("الحد الأقصى 4 صور فقط", "error");
        return;
      }

      for (const file of newFiles) {
        if (!isAllowedImageFile(file)) {
          flash("مسموح فقط بصور JPG / PNG / WEBP", "error");
          return;
        }

        if (Number(file.size || 0) > MAX_IMAGE_BYTES) {
          flash("حجم كل صورة يجب ألا يتجاوز 7MB", "error");
          return;
        }
      }

      const variant_id = variants.length ? resolvedVariantId : null;

      if (variants.length && !variant_id) {
        flash("الخيارات المختارة غير متوفرة.", "error");
        return;
      }

      const uploadedNew: UploadedImage[] = [];

      for (const file of newFiles) {
        const uploaded = await uploadAttachmentToR2(file);
        uploadedNew.push(uploaded);
      }

      const finalAttachments: Array<{
        name: string;
        type: string | null;
        size: number;
        url: string;
      }> = [];

      for (const att of existingAttachments) {
        if (!att.url && !att.name) continue;

        finalAttachments.push({
          name: att.name || "image",
          type: att.type || "image/*",
          size: Number(att.size || 0),
          url: att.url || "",
        });
      }

      for (const att of uploadedNew) {
        finalAttachments.push({
          name: att.name,
          type: att.type,
          size: att.size,
          url: att.url,
        });
      }

      const selected_options: Array<{ name: string; value: string }> = [];

      for (const opt of options) {
        const optId = String(opt.id);
        const selectedId = selectedByOption[optId];

        if (!selectedId) continue;

        const value = (opt.values || []).find(
          (v) => String(v.id) === String(selectedId),
        );

        if (!value) continue;

        const name = s(opt.name);
        const label = optionLabel(value);

        if (!name || !label) continue;

        selected_options.push({ name, value: label });
      }

      if (note.trim()) {
        selected_options.push({ name: "ملاحظة", value: note.trim() });
      }

      finalAttachments.slice(0, MAX_IMAGES).forEach((att, index) => {
        const n = index + 1;

        selected_options.push({
          name: `__attachment_${n}_name`,
          value: att.name,
        });

        selected_options.push({
          name: `__attachment_${n}_type`,
          value: att.type || "image/*",
        });

        selected_options.push({
          name: `__attachment_${n}_size`,
          value: String(att.size),
        });

        selected_options.push({
          name: `__attachment_${n}_url`,
          value: att.url,
        });
      });

      const res: any = await apiPatchCartItem({
        op: "set_variant",
        cart_item_id: activeItem.id,
        selected_option_value_ids: selectedValueIds,
        variant_id,
        selected_options,
      });

      const msg = res?.data?.notice?.message;

      flash(msg || "تم تحديث المنتج", "info");

      window.dispatchEvent(new CustomEvent("cart:changed"));
      onChanged();
      closeWithMotion();
    } catch (e: any) {
      if (
        e?.message === "ONLY_SUPPORTED_IMAGES_ALLOWED" ||
        e?.message === "ONLY_IMAGES_ALLOWED"
      ) {
        flash("مسموح فقط بصور JPG / PNG / WEBP", "error");
      } else if (e?.message === "UPLOAD_FAILED") {
        flash("فشل رفع الصور", "error");
      } else {
        flash(e?.message ?? "تعذر تحديث المنتج", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!shouldRender || !activeItem) return null;

  return (
    <div
      className={["mk-mcart-edit", closing ? "is-closing" : ""]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="إغلاق"
        onClick={closeWithMotion}
        className="mk-mcart-edit__overlay"
      />

      <section className="mk-mcart-edit__sheet">
        <div className="mk-mcart-edit__handle" />

        <header className="mk-mcart-edit__head">
          <div className="mk-mcart-edit__product">
            <div className="mk-mcart-edit__thumb">
              {productImage ? (
                <img
                  src={productImage}
                  alt={productName}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="mk-mcart-edit__productText">
              <div className="mk-mcart-edit__eyebrow">تعديل المنتج</div>
              <div className="mk-mcart-edit__title" title={productName}>
                {productName}
              </div>
              <div className="mk-mcart-edit__meta">
                {activeItem.qty ? <span>الكمية {activeItem.qty}</span> : null}
                <span>
                  {attachmentsCount}/{MAX_IMAGES} صور
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeWithMotion}
            disabled={busy}
            aria-label="إغلاق"
            className="mk-mcart-edit__close"
          >
            ×
          </button>
        </header>

        <div className="mk-mcart-edit__body">
          {hasVariantOptions ? (
            <section className="mk-mcart-edit__group">
              <div className="mk-mcart-edit__groupHead">
                <div>
                  <div className="mk-mcart-edit__groupTitle">خيارات المنتج</div>
                  <div className="mk-mcart-edit__groupSub">
                    اختر التركيبة المناسبة قبل الحفظ.
                  </div>
                </div>

                <div
                  className={[
                    "mk-mcart-edit__status",
                    canResolveVariant ? "is-ok" : "is-bad",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {canResolveVariant ? "متوفر" : "غير متوفر"}
                </div>
              </div>

              <div className="mk-mcart-edit__options">
                {options.map((opt) => {
                  const optId = String(opt.id);
                  const allowed = allowedByOption.get(optId);

                  return (
                    <div key={optId} className="mk-mcart-edit__option">
                      <div className="mk-mcart-edit__optionName">
                        {opt.name}
                      </div>

                      <div className="mk-mcart-edit__values">
                        {(opt.values || []).map((value) => {
                          const valueId = String(value.id);
                          const active = selectedByOption[optId] === valueId;
                          const disabled = allowed
                            ? !allowed.has(valueId)
                            : false;

                          const label = optionLabel(value);
                          const color = optionColor(value);
                          const image = optionImage(value);

                          return (
                            <button
                              key={valueId}
                              type="button"
                              disabled={disabled || busy}
                              onClick={() =>
                                setSelectedByOption((current) => ({
                                  ...current,
                                  [optId]: valueId,
                                }))
                              }
                              className={[
                                "mk-mcart-edit__value",
                                active ? "is-active" : "",
                                disabled ? "is-unavailable" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              title={disabled ? `${label} - غير متوفر` : label}
                            >
                              {image ? (
                                <span className="mk-mcart-edit__valueImage">
                                  <img
                                    src={image}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </span>
                              ) : null}

                              {color ? (
                                <span
                                  className="mk-mcart-edit__valueColor"
                                  style={{ background: color }}
                                />
                              ) : null}

                              <span>{label}</span>

                              {active ? <strong>✓</strong> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="mk-mcart-edit__group">
            <div className="mk-mcart-edit__groupHead">
              <div>
                <div className="mk-mcart-edit__groupTitle">ملاحظة الطلب</div>
                <div className="mk-mcart-edit__groupSub">
                  اكتب أي تفاصيل يحتاجها المتجر لهذا المنتج.
                </div>
              </div>

              <div className="mk-mcart-edit__miniBadge">
                {note.trim() ? "مكتوبة" : "اختياري"}
              </div>
            </div>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="مثال: أرجو تغليف المنتج كهدية"
              className="mk-mcart-edit__textarea"
            />
          </section>

          <section className="mk-mcart-edit__group">
            <div className="mk-mcart-edit__groupHead">
              <div>
                <div className="mk-mcart-edit__groupTitle">الصور المرفقة</div>
                <div className="mk-mcart-edit__groupSub">
                  أرفق صور توضيحية عند الحاجة.
                </div>
              </div>

              <div className="mk-mcart-edit__miniBadge">
                {attachmentsCount}/{MAX_IMAGES}
              </div>
            </div>

            <div className="mk-mcart-edit__upload">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || attachmentsCount >= MAX_IMAGES}
                className="mk-mcart-edit__uploadBtn"
              >
                + رفع صور
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(event) => handlePickImages(event.target.files)}
              />

              <span>JPG / PNG / WEBP — حتى 4 صور</span>
            </div>

            {existingAttachments.length || newFiles.length ? (
              <div className="mk-mcart-edit__files">
                {existingAttachments.map((att) => {
                  const isImage = isImageAttachment(att.type, att.url, att.name);

                  return (
                    <div
                      key={`existing-${att.index}`}
                      className="mk-mcart-edit__file"
                    >
                      <button
                        type="button"
                        disabled={!isImage || !att.url}
                        onClick={() => openImagePreview(att.url, att.name)}
                        className="mk-mcart-edit__fileMedia"
                        aria-label="معاينة الصورة"
                      >
                        {isImage && att.url ? (
                          <img
                            src={att.url}
                            alt={att.name || "attachment"}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span>📎</span>
                        )}
                      </button>

                      <div className="mk-mcart-edit__fileFoot">
                        <span>{formatFileSize(att.size) || "صورة"}</span>

                        <button
                          type="button"
                          onClick={() => removeExistingAttachment(att.index)}
                          disabled={busy}
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  );
                })}

                {newFilePreviews.map((preview, index) => (
                  <div
                    key={`new-${preview.file.name}-${preview.file.size}-${preview.file.lastModified}-${index}`}
                    className="mk-mcart-edit__file"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openImagePreview(preview.url, preview.file.name)
                      }
                      className="mk-mcart-edit__fileMedia"
                      aria-label="معاينة الصورة"
                    >
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        loading="lazy"
                        decoding="async"
                      />
                    </button>

                    <div className="mk-mcart-edit__fileFoot">
                      <span>جديد · {formatFileSize(preview.file.size)}</span>

                      <button
                        type="button"
                        onClick={() => removeNewFileAt(index)}
                        disabled={busy}
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mk-mcart-edit__empty">
                لا توجد صور مرفقة حاليًا.
              </div>
            )}
          </section>
        </div>

        <footer className="mk-mcart-edit__actions">
          <button
            type="button"
            onClick={closeWithMotion}
            disabled={busy}
            className="mk-mcart-edit__cancel"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={busy || (variants.length ? !canResolveVariant : false)}
            className="mk-mcart-edit__save"
          >
            {busy ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </footer>
      </section>

      {imagePreview ? (
        <div className="mk-mcart-editPreview" role="dialog" aria-modal="true">
          <button
            type="button"
            className="mk-mcart-editPreview__overlay"
            onClick={() => setImagePreview(null)}
            aria-label="إغلاق"
          />

          <div className="mk-mcart-editPreview__panel">
            <div className="mk-mcart-editPreview__head">
              <div title={imagePreview.name}>{imagePreview.name}</div>

              <button
                type="button"
                onClick={() => setImagePreview(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="mk-mcart-editPreview__body">
              <img src={imagePreview.url} alt={imagePreview.name} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}