// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileEditOptionsSheet.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

function optionLabel(v: any) {
  return String(v?.display_value ?? v?.name ?? "").trim();
}

function readSpecialSelectedOption(
  item: CartItemEnriched | null,
  key: string,
): string | null {
  const raw = Array.isArray(item?.selected_options)
    ? item?.selected_options
    : [];

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

function readExistingAttachments(
  item: CartItemEnriched | null,
): ExistingAttachment[] {
  const out: ExistingAttachment[] = [];

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
    });
  }

  return out;
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
  const [px, setPx] = useState(0);

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
        setPx(0);
        return;
      }

      const h = Math.max(0, Math.round(el.getBoundingClientRect().height || 0));
      setPx(h ? h + 8 : 0);
    };

    measure();

    const ro =
      typeof window !== "undefined" && "ResizeObserver" in window
        ? new ResizeObserver(() => measure())
        : null;

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

function SkeletonText({
  width,
  height = 14,
}: {
  width: number | string;
  height?: number;
}) {
  return (
    <div
      aria-hidden
      className="mk-cart-skeleton-line"
      style={{ width, height }}
    />
  );
}

function NewFilePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="mk-cart-edit-attachment">
      <div className="mk-cart-edit-attachment__media">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={file.name} />
        ) : null}
      </div>

      <div className="mk-cart-edit-attachment__body">
        <div className="mk-cart-edit-attachment__name" title={file.name}>
          {file.name}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="mk-cart-edit-attachment__remove"
        >
          إزالة
        </button>
      </div>
    </div>
  );
}

export default function MobileEditOptionsSheet({
  open,
  onClose,
  item,
  onChanged,
  flash,
}: Props) {
  const options = ((item?.options || []) as ProductOption[]) ?? [];
  const variants = ((item?.variants || []) as ProductVariant[]) ?? [];
  const links = ((item?.variant_links || []) as VariantLink[]) ?? [];

  const [selectedByOption, setSelectedByOption] = useState<
    Record<string, string | null>
  >({});
  const [busy, setBusy] = useState(false);

  const [note, setNote] = useState("");
  const [existingAttachments, setExistingAttachments] = useState<
    ExistingAttachment[]
  >([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomOffsetPx = useBottomOffsetPx();

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    setVisible(false);

    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !item) return;

    setSelectedByOption(
      buildDefaultSelection(options, item.selected_option_value_ids || []),
    );
    setNote(readSpecialSelectedOption(item, "ملاحظة") || "");
    setExistingAttachments(readExistingAttachments(item));
    setNewFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [open, item, options]);

  const selectedValueIds = useMemo(
    () => Object.values(selectedByOption).filter(Boolean).map(String),
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

  const canResolveVariant = useMemo(() => {
    if (!variants.length) return true;

    const vid = resolveVariantIdFromSelection({
      variants,
      variant_links: links,
      selected_value_ids: selectedValueIds,
    });

    return Boolean(vid);
  }, [variants, links, selectedValueIds]);

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePickImages(filesList: FileList | null) {
    const picked = Array.from(filesList || []);
    if (!picked.length) return;

    const invalidType = picked.find((f) => !isAllowedImageFile(f));
    if (invalidType) {
      flash("مسموح فقط بصور JPG / PNG / WEBP", "error");
      resetFileInput();
      return;
    }

    const tooLarge = picked.find((f) => Number(f.size || 0) > MAX_IMAGE_BYTES);
    if (tooLarge) {
      flash("حجم كل صورة يجب ألا يتجاوز 7MB", "error");
      resetFileInput();
      return;
    }

    const totalCount =
      existingAttachments.length + newFiles.length + picked.length;

    if (totalCount > MAX_IMAGES) {
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
    if (!item) return;

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

      const variant_id = variants.length
        ? resolveVariantIdFromSelection({
            variants,
            variant_links: links,
            selected_value_ids: selectedValueIds,
          })
        : null;

      if (variants.length && !variant_id) {
        flash("الخيارات المختارة غير متوفرة.", "error");
        return;
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

        const name = String(opt.name ?? "").trim();
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
        cart_item_id: item.id,
        selected_option_value_ids: selectedValueIds,
        variant_id,
        selected_options,
      });

      const msg = res?.data?.notice?.message;

      if (msg) flash(msg, "info");
      else flash("تم تحديث المنتج", "info");

      window.dispatchEvent(new CustomEvent("cart:changed"));
      onChanged();
      onClose();
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

  if (!mounted || !item) return null;

  return (
    <div
      className={["mk-cart-sheet", visible ? "is-visible" : ""].join(" ")}
      style={
        {
          "--mk-cart-sheet-bottom": `${bottomOffsetPx}px`,
        } as CSSProperties
      }
    >
      <button
        type="button"
        onClick={busy ? undefined : onClose}
        aria-label="إغلاق"
        className="mk-cart-sheet__overlay"
      />

      <div dir="rtl" className="mk-cart-sheet__panel mk-cart-edit__panel">
        <div className="mk-cart-sheet__head">
          <div className="mk-cart-sheet__handleWrap">
            <div className="mk-cart-sheet__handle" />
          </div>

          <div className="mk-cart-sheet__titleRow">
            <div className="mk-cart-sheet__titleBox">
              <div className="mk-cart-sheet__title">تعديل المنتج</div>

              <div className="mk-cart-sheet__subtitle">
                {item.product?.name ?? "المنتج"}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="إغلاق"
              className="mk-cart-sheet__close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mk-cart-sheet__body">
          {options.length ? (
            <div className="mk-cart-edit-options">
              {options.map((opt) => {
                const optId = String(opt.id);
                const allowed = allowedByOption.get(optId);

                return (
                  <div key={optId} className="mk-cart-edit-section">
                    <div className="mk-cart-edit-section__title">
                      {opt.name}
                    </div>

                    <div className="mk-cart-edit-values">
                      {(opt.values || []).map((v) => {
                        const vId = String(v.id);
                        const active = selectedByOption[optId] === vId;
                        const disabled = allowed ? !allowed.has(vId) : false;

                        return (
                          <button
                            key={vId}
                            type="button"
                            disabled={disabled || busy}
                            onClick={() =>
                              setSelectedByOption((s) => ({
                                ...s,
                                [optId]: vId,
                              }))
                            }
                            className={[
                              "mk-cart-edit-value",
                              active ? "is-active" : "",
                            ].join(" ")}
                          >
                            {optionLabel(v)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {variants.length ? (
                <div
                  className={[
                    "mk-cart-edit-availability",
                    canResolveVariant
                      ? "mk-cart-edit-availability--ok"
                      : "mk-cart-edit-availability--bad",
                  ].join(" ")}
                >
                  {canResolveVariant
                    ? "التركيبة متوفرة ✅"
                    : "التركيبة غير متوفرة ❌"}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mk-cart-edit-section">
              <div className="mk-cart-edit-section__title">خيارات المنتج</div>

              <div className="mk-cart-edit-desc">
                لا توجد خيارات قابلة للتعديل لهذا المنتج.
              </div>
            </div>
          )}

          <div className="mk-cart-edit-section">
            <div className="mk-cart-edit-section__title">الملاحظة</div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="اكتب ملاحظتك هنا"
              className="mk-cart-edit-note"
            />
          </div>

          <div className="mk-cart-edit-section">
            <div className="mk-cart-edit-section__title">الصور المرفقة</div>

            <div className="mk-cart-edit-uploadRow">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  busy ||
                  existingAttachments.length + newFiles.length >= MAX_IMAGES
                }
                className="mk-cart-edit-uploadBtn"
              >
                رفع صور
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                className="mk-cart-edit-fileInput"
                onChange={(e) => handlePickImages(e.target.files)}
              />

              <div className="mk-cart-edit-uploadHint">
                حتى 4 صور — JPG / PNG / WEBP — كل صورة 7MB
              </div>
            </div>

            {busy && (existingAttachments.length || newFiles.length) ? (
              <div className="mk-cart-edit-uploadRow">
                <SkeletonText width="100%" height={8} />
              </div>
            ) : null}

            {existingAttachments.length || newFiles.length ? (
              <div className="mk-cart-edit-attachments">
                {existingAttachments.map((att) => (
                  <div
                    key={`existing-${att.index}`}
                    className="mk-cart-edit-attachment"
                  >
                    <div className="mk-cart-edit-attachment__media">
                      {isImageAttachment(att.type, att.url, att.name) &&
                      att.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={att.url}
                          alt={att.name || "attachment"}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="mk-cart-edit-attachment__empty">📎</div>
                      )}
                    </div>

                    <div className="mk-cart-edit-attachment__body">
                      <div
                        className="mk-cart-edit-attachment__name"
                        title={att.name || ""}
                      >
                        {att.name || `صورة ${att.index}`}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExistingAttachment(att.index)}
                        disabled={busy}
                        className="mk-cart-edit-attachment__remove"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                ))}

                {newFiles.map((file, idx) => (
                  <NewFilePreview
                    key={`new-${file.name}-${file.size}-${file.lastModified}-${idx}`}
                    file={file}
                    onRemove={() => removeNewFileAt(idx)}
                  />
                ))}
              </div>
            ) : (
              <div className="mk-cart-edit-desc">
                لا توجد صور مرفقة حالياً
              </div>
            )}
          </div>

          <div className="mk-cart-edit-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="mk-cart-edit-cancel"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={busy || (variants.length ? !canResolveVariant : false)}
              className="mk-cart-edit-save"
            >
              {busy ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}