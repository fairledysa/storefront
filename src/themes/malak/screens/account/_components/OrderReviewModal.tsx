// FILE: apps/storefront/src/themes/malak/screens/account/_components/OrderReviewModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import type { OrdersApiRow } from "./OrdersTable";

type StepKey = "store" | "products" | "shipping" | "done";

type ReviewRequests = {
  store: boolean;
  products: boolean;
  shipping: boolean;
};

type BootstrapMedia = {
  id?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  media_type?: "image" | "video";
  sort_order?: number;
};

type BootstrapItem = {
  order_item_id: string;
  product_id: string;
  name: string;
  review_id?: string | null;
  rating?: number | null;
  comment?: string | null;
  media?: BootstrapMedia[];
};

type ExistingReviewBlock = {
  id?: string | null;
  rating?: number | null;
  body?: string | null;
  comment?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BootstrapState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      orderId: string;
      status: string;
      items: BootstrapItem[];
      allowAttachImages: boolean;
      maxReviewImages: number;
      reviewRequests: ReviewRequests;
      alreadyReviewed: boolean;
      canEdit: boolean;
      canDelete: boolean;
      editDeleteEnabled: boolean;
      editUntil: string | null;
      editPeriodDays: number;
      allowContactSupport: boolean;
      contactSupportRequested: boolean;
      supportMessage: string;
    };

type ProductDraftMedia = {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  media_type: "image";
  sort_order: number;
  uploading?: boolean;
  error?: string | null;
};

type ProductDraft = {
  review_id?: string | null;
  order_item_id: string;
  product_id: string;
  name: string;
  rating: number;
  comment: string;
  media: ProductDraftMedia[];
};

const DEFAULT_MAX_REVIEW_IMAGES = 5;

const DEFAULT_REVIEW_REQUESTS: ReviewRequests = {
  store: true,
  products: true,
  shipping: true,
};

const ALLOWED_UPLOAD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function clampComment(v: string, max = 120) {
  return String(v ?? "").slice(0, max);
}

function getOrderNo(order: OrdersApiRow | null) {
  if (!order) return "";
  return String(order.order_number || order.public_no || "").trim();
}

function makeUploadId() {
  return `review-media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) {
      return false;
    }
  }

  return fallback;
}

function normalizeReviewRequests(raw: any, productCount: number): ReviewRequests {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return {
    store: readBool(
      source.store ?? source.store_review ?? source.testimonialsEnabled,
      DEFAULT_REVIEW_REQUESTS.store,
    ),
    products:
      productCount > 0 &&
      readBool(
        source.products ?? source.product_reviews ?? source.productsEnabled,
        DEFAULT_REVIEW_REQUESTS.products,
      ),
    shipping: readBool(
      source.shipping ?? source.shipping_review ?? source.shippingEnabled,
      DEFAULT_REVIEW_REQUESTS.shipping,
    ),
  };
}

function getEnabledReviewSteps(
  requests: ReviewRequests,
  productCount: number,
): Exclude<StepKey, "done">[] {
  const steps: Exclude<StepKey, "done">[] = [];

  if (requests.store) steps.push("store");
  if (requests.products && productCount > 0) steps.push("products");
  if (requests.shipping) steps.push("shipping");

  return steps;
}

function stepMessage(step: Exclude<StepKey, "done">) {
  if (step === "store") return "قيّم المتجر.";
  if (step === "products") return "الآن قيّم المنتجات.";
  return "الآن قيّم الشحن.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString("ar-SA-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeMedia(raw: any): ProductDraftMedia[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((m: any, index: number) => ({
      id: s(m?.id) || makeUploadId(),
      file_url: s(m?.file_url || m?.fileUrl || m?.url),
      thumbnail_url: s(m?.thumbnail_url || m?.thumbnailUrl) || null,
      alt_text: s(m?.alt_text || m?.altText) || null,
      media_type: "image" as const,
      sort_order: Number.isFinite(Number(m?.sort_order))
        ? Number(m.sort_order)
        : index,
      uploading: false,
      error: null,
    }))
    .filter((m) => Boolean(m.file_url));
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    background: "rgba(0,0,0,0.52)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    overflowY: "auto",
  },

  card: {
    width: "min(94vw, 560px)",
    maxHeight: "calc(100dvh - 48px)",
    background: "#fff",
    borderRadius: 28,
    border: "1px solid rgba(17,24,39,0.08)",
    boxShadow: "0 32px 90px rgba(0,0,0,0.24)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  head: {
    flex: "0 0 auto",
    padding: "18px 20px",
    borderBottom: "1px solid rgba(17,24,39,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: 900,
    color: "#111827",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(17,24,39,0.10)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    flex: "0 0 auto",
  },

  body: {
    flex: "1 1 auto",
    minHeight: 0,
    padding: 24,
    overflowY: "auto",
  },

  notice: {
    borderRadius: 16,
    padding: "12px 14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.8,
    marginBottom: 16,
    textAlign: "center",
  },

  noticeGreen: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#047857",
  },

  noticeAmber: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
  },

  stepWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  centerText: {
    textAlign: "center",
  },

  iconGold: {
    width: 84,
    height: 84,
    borderRadius: "9999px",
    background: "#f8f3ea",
    border: "1px solid #eadfca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    fontSize: 30,
  },

  stepTitle: {
    fontSize: 22,
    fontWeight: 900,
    color: "#111827",
  },

  stepDesc: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.9,
  },

  stepHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#9ca3af",
  },

  textarea: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "14px 16px",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    lineHeight: 1.8,
  },

  textareaReadonly: {
    background: "#f9fafb",
    color: "#475569",
  },

  uploadBox: {
    border: "1px dashed #d8c6a2",
    borderRadius: 18,
    padding: 14,
    background: "#fffaf1",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  uploadHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  uploadTitle: {
    fontSize: 13,
    fontWeight: 900,
    color: "#111827",
  },

  uploadHint: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.7,
  },

  uploadBtn: {
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #d8c6a2",
    background: "#fff",
    color: "#111827",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  },

  uploadBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 8,
  },

  mediaItem: {
    position: "relative",
    aspectRatio: "1 / 1",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(17,24,39,0.10)",
    background: "#fff",
  },

  mediaImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  mediaState: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    padding: 6,
    textAlign: "center",
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  removeMediaBtn: {
    position: "absolute",
    top: 5,
    insetInlineStart: 5,
    width: 22,
    height: 22,
    borderRadius: 999,
    border: "none",
    background: "rgba(17,24,39,0.82)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: "22px",
    padding: 0,
  },

  supportBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 14,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  supportToggle: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    cursor: "pointer",
    userSelect: "none",
  },

  supportCheck: {
    width: 18,
    height: 18,
    marginTop: 3,
    accentColor: "#111827",
    flex: "0 0 auto",
  },

  supportTitle: {
    fontSize: 13,
    fontWeight: 900,
    color: "#111827",
  },

  supportHint: {
    display: "block",
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.7,
  },

  supportTextarea: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    lineHeight: 1.8,
    background: "#fff",
  },

  deleteBtn: {
    marginTop: 10,
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: {
    flex: "0 0 auto",
    padding: "0 24px 22px",
    display: "flex",
    justifyContent: "center",
    gap: 8,
  },

  msg: {
    marginTop: 16,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 1.7,
  },
};

export default function OrderReviewModal({
  open,
  order,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  order: OrdersApiRow | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<StepKey>("store");

  const [bootstrap, setBootstrap] = useState<BootstrapState>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const [storeRating, setStoreRating] = useState<number>(0);
  const [storeComment, setStoreComment] = useState("");

  const [productIndex, setProductIndex] = useState(0);
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([]);

  const [shippingRating, setShippingRating] = useState<number>(0);
  const [shippingComment, setShippingComment] = useState("");

  const [contactSupport, setContactSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !order) {
      setStep("store");
      setBootstrap({ kind: "idle" });
      setSubmitting(false);
      setDeleting(false);
      setSubmitMsg("");
      setStoreRating(0);
      setStoreComment("");
      setProductIndex(0);
      setProductDrafts([]);
      setShippingRating(0);
      setShippingComment("");
      setContactSupport(false);
      setSupportMessage("");
      return;
    }

    const currentOrderNo = getOrderNo(order);
    let alive = true;

    async function loadBootstrap() {
      try {
        if (!currentOrderNo) {
          setBootstrap({
            kind: "error",
            message: "رقم الطلب غير موجود",
          });
          return;
        }

        setBootstrap({ kind: "loading" });
        setSubmitMsg("");

        const res = await fetch(
          `/api/account/orders/${encodeURIComponent(currentOrderNo)}/review`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          },
        );

        const json = await res.json().catch(() => ({}));

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setBootstrap({
            kind: "error",
            message: s(json?.error) || "تعذر تحميل بيانات التقييم",
          });
          return;
        }

        const itemsRaw = Array.isArray(json?.items) ? json.items : [];
        const seenProductIds = new Set<string>();

        const drafts: ProductDraft[] = itemsRaw
          .map((x: BootstrapItem) => ({
            review_id: s(x?.review_id) || null,
            order_item_id: s(x?.order_item_id),
            product_id: s(x?.product_id),
            name: s(x?.name) || "منتج",
            rating: Number(x?.rating ?? 0),
            comment: s(x?.comment),
            media: normalizeMedia(x?.media),
          }))
          .filter((item: ProductDraft) => {
            if (!item.order_item_id || !item.product_id) return false;
            if (seenProductIds.has(item.product_id)) return false;

            seenProductIds.add(item.product_id);
            return true;
          });

        const storeReview = json?.store_review as ExistingReviewBlock | null;
        const shippingReview =
          json?.shipping_review as ExistingReviewBlock | null;

        const reviewRequests = normalizeReviewRequests(
          json?.review_requests,
          drafts.length,
        );

        const firstStep = getEnabledReviewSteps(
          reviewRequests,
          drafts.length,
        )[0];

        if (!firstStep) {
          setBootstrap({
            kind: "error",
            message: "لا توجد أنواع تقييم مفعلة لهذا الطلب.",
          });
          return;
        }

        setStoreRating(Number(storeReview?.rating ?? 0));
        setStoreComment(s(storeReview?.body ?? storeReview?.comment));

        setShippingRating(Number(shippingReview?.rating ?? 0));
        setShippingComment(s(shippingReview?.comment ?? shippingReview?.body));

        setContactSupport(Boolean(json?.contact_support_requested));
        setSupportMessage(s(json?.support_message));

        setProductDrafts(drafts);
        setProductIndex(0);
        setStep(firstStep);

        setBootstrap({
          kind: "ready",
          orderId: s(json?.order_id),
          status: s(json?.status),
          allowAttachImages: Boolean(json?.allow_attach_images),
          maxReviewImages:
            Number(json?.max_review_images ?? DEFAULT_MAX_REVIEW_IMAGES) ||
            DEFAULT_MAX_REVIEW_IMAGES,
          reviewRequests,
          alreadyReviewed: Boolean(json?.already_reviewed),
          canEdit: Boolean(json?.can_edit),
          canDelete: Boolean(json?.can_delete),
          editDeleteEnabled: Boolean(json?.edit_delete_enabled),
          editUntil: s(json?.edit_until) || null,
          editPeriodDays: Number(json?.edit_period_days ?? 1) || 1,
          allowContactSupport: Boolean(json?.allow_contact_support),
          contactSupportRequested: Boolean(json?.contact_support_requested),
          supportMessage: s(json?.support_message),
          items: drafts.map((x) => ({
            order_item_id: x.order_item_id,
            product_id: x.product_id,
            name: x.name,
            rating: x.rating,
            comment: x.comment,
            media: x.media,
          })),
        });
      } catch (e: any) {
        if (!alive) return;

        setBootstrap({
          kind: "error",
          message: s(e?.message) || "تعذر تحميل بيانات التقييم",
        });
      }
    }

    void loadBootstrap();

    return () => {
      alive = false;
    };
  }, [open, order]);

  const title = useMemo(() => {
    const no = getOrderNo(order);
    return no ? `تقييم الطلب #${no}` : "تقييم الطلب";
  }, [order]);

  const currentProduct =
    step === "products" && productDrafts.length
      ? productDrafts[productIndex] ?? null
      : null;

  const productRemaining = Math.max(productDrafts.length - productIndex - 1, 0);

  const reviewRequests =
    bootstrap.kind === "ready"
      ? bootstrap.reviewRequests
      : DEFAULT_REVIEW_REQUESTS;

  const alreadyReviewed =
    bootstrap.kind === "ready" ? bootstrap.alreadyReviewed : false;

  const canEditExisting =
    bootstrap.kind === "ready" ? bootstrap.canEdit : false;

  const canDeleteExisting =
    bootstrap.kind === "ready" ? bootstrap.canDelete : false;

  const editDeleteEnabled =
    bootstrap.kind === "ready" ? bootstrap.editDeleteEnabled : false;

  const allowContactSupport =
    bootstrap.kind === "ready" ? bootstrap.allowContactSupport : false;

  const readonlyReview = alreadyReviewed && !canEditExisting;

  const enabledSteps = getEnabledReviewSteps(
    reviewRequests,
    productDrafts.length,
  );

  const allowAttachImages =
    bootstrap.kind === "ready" ? bootstrap.allowAttachImages : false;

  const maxReviewImages =
    bootstrap.kind === "ready"
      ? Math.max(1, bootstrap.maxReviewImages || DEFAULT_MAX_REVIEW_IMAGES)
      : DEFAULT_MAX_REVIEW_IMAGES;

  const currentProductUploading = Boolean(
    currentProduct?.media?.some((item) => item.uploading),
  );

  function getNextStep(current: Exclude<StepKey, "done">) {
    const currentIndex = enabledSteps.indexOf(current);
    if (currentIndex < 0) return null;

    return enabledSteps[currentIndex + 1] ?? null;
  }

  function isLastStep(current: Exclude<StepKey, "done">) {
    return enabledSteps[enabledSteps.length - 1] === current;
  }

  function renderStars(
    value: number,
    onChange: (n: number) => void,
    disabled = false,
  ) {
    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          direction: "ltr",
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onChange(n);
            }}
            style={{
              border: "none",
              background: "transparent",
              cursor: disabled ? "default" : "pointer",
              fontSize: 34,
              lineHeight: 1,
              color: n <= value ? "#d4af6a" : "#d1d5db",
              opacity: disabled ? 0.85 : 1,
            }}
            aria-label={`تقييم ${n}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  function actionButtonStyle(active: boolean): CSSProperties {
    return {
      height: 48,
      border: "none",
      borderRadius: 14,
      background: active ? "#cbb794" : "#d1d5db",
      color: "#111827",
      fontWeight: 900,
      cursor: active ? "pointer" : "not-allowed",
    };
  }

  function updateCurrentProduct(patch: Partial<ProductDraft>) {
    if (readonlyReview) return;

    setProductDrafts((prev) =>
      prev.map((item, idx) =>
        idx === productIndex
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  async function uploadReviewImage(file: File, productName: string) {
    const form = new FormData();
    form.append("kind", "review-media");
    form.append("file", file);

    const res = await fetch("/api/uploads/r2/put", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok || !json?.publicUrl) {
      throw new Error(s(json?.message) || s(json?.error) || "تعذر رفع الصورة");
    }

    return {
      file_url: String(json.publicUrl),
      thumbnail_url: String(json.publicUrl),
      alt_text: productName ? `صورة تقييم ${productName}` : "صورة تقييم المنتج",
    };
  }

  async function handleProductImageFiles(filesValue: FileList | null) {
    if (readonlyReview) return;
    if (!currentProduct || !allowAttachImages) return;

    const index = productIndex;
    const product = productDrafts[index];
    if (!product) return;

    const existingCount = product.media.filter((item) => !item.error).length;
    const remaining = Math.max(maxReviewImages - existingCount, 0);

    if (remaining <= 0) {
      setSubmitMsg(`يمكنك إرفاق ${maxReviewImages} صور كحد أقصى.`);
      return;
    }

    const files = Array.from(filesValue || [])
      .filter((file) => ALLOWED_UPLOAD_IMAGE_TYPES.has(file.type))
      .slice(0, remaining);

    if (!files.length) {
      setSubmitMsg("الملفات المسموحة: JPG أو PNG أو WEBP فقط.");
      return;
    }

    const tempItems: ProductDraftMedia[] = files.map((file, fileIndex) => ({
      id: makeUploadId(),
      file_url: "",
      thumbnail_url: null,
      alt_text: file.name || null,
      media_type: "image",
      sort_order: existingCount + fileIndex,
      uploading: true,
      error: null,
    }));

    setProductDrafts((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              media: [...item.media, ...tempItems],
            }
          : item,
      ),
    );

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const temp = tempItems[i];

      try {
        const uploaded = await uploadReviewImage(file, product.name);

        setProductDrafts((prev) =>
          prev.map((item, idx) => {
            if (idx !== index) return item;

            return {
              ...item,
              media: item.media.map((mediaItem) =>
                mediaItem.id === temp.id
                  ? {
                      ...mediaItem,
                      file_url: uploaded.file_url,
                      thumbnail_url: uploaded.thumbnail_url,
                      alt_text: uploaded.alt_text,
                      uploading: false,
                      error: null,
                    }
                  : mediaItem,
              ),
            };
          }),
        );
      } catch (e: any) {
        setProductDrafts((prev) =>
          prev.map((item, idx) => {
            if (idx !== index) return item;

            return {
              ...item,
              media: item.media.map((mediaItem) =>
                mediaItem.id === temp.id
                  ? {
                      ...mediaItem,
                      uploading: false,
                      error: s(e?.message) || "فشل رفع الصورة",
                    }
                  : mediaItem,
              ),
            };
          }),
        );
      }
    }
  }

  function removeCurrentProductMedia(mediaId: string) {
    if (readonlyReview) return;
    if (!allowAttachImages) return;

    setProductDrafts((prev) =>
      prev.map((item, idx) =>
        idx === productIndex
          ? {
              ...item,
              media: item.media.filter((mediaItem) => mediaItem.id !== mediaId),
            }
          : item,
      ),
    );
  }

  function renderSupportContactBox() {
    if (!allowContactSupport) return null;
    if (readonlyReview && !contactSupport) return null;

    return (
      <div style={styles.supportBox}>
        <label
          style={{
            ...styles.supportToggle,
            cursor: readonlyReview ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={contactSupport}
            disabled={readonlyReview}
            onChange={(e) => setContactSupport(e.currentTarget.checked)}
            style={styles.supportCheck}
          />

          <span>
            <span style={styles.supportTitle}>
              أرغب أن يتواصل معي فريق خدمة العملاء
            </span>

            <span style={styles.supportHint}>
              فعّل هذا الخيار إذا كان عندك ملاحظة تحتاج متابعة من المتجر.
            </span>
          </span>
        </label>

        {contactSupport ? (
          <textarea
            value={supportMessage}
            disabled={readonlyReview}
            onChange={(e) => setSupportMessage(clampComment(e.target.value, 200))}
            placeholder="اكتب ملاحظتك لفريق خدمة العملاء"
            rows={3}
            maxLength={200}
            style={{
              ...styles.supportTextarea,
              ...(readonlyReview ? styles.textareaReadonly : {}),
            }}
          />
        ) : null}
      </div>
    );
  }

  function nextFromStore() {
    if (!readonlyReview && !storeRating) return;

    const next = getNextStep("store");

    if (!next) {
      if (readonlyReview) {
        onClose();
        return;
      }

      void submitAll();
      return;
    }

    setStep(next);
    setSubmitMsg(readonlyReview ? "" : `تم تقييم المتجر، ${stepMessage(next)}`);
  }

  function nextFromProducts() {
    if (!readonlyReview && !currentProduct?.rating) return;

    if (!readonlyReview && currentProductUploading) {
      setSubmitMsg("انتظر حتى يكتمل رفع الصور.");
      return;
    }

    if (productIndex < productDrafts.length - 1) {
      setProductIndex((x) => x + 1);
      setSubmitMsg(
        readonlyReview ? "" : "تم حفظ تقييم المنتج، أكمل تقييم بقية المنتجات.",
      );
      return;
    }

    const next = getNextStep("products");

    if (!next) {
      if (readonlyReview) {
        onClose();
        return;
      }

      void submitAll();
      return;
    }

    setStep(next);
    setSubmitMsg(readonlyReview ? "" : `تم تقييم المنتجات، ${stepMessage(next)}`);
  }

  async function submitAll() {
    if (readonlyReview) return;
    if (!order) return;
    if (submitting || deleting) return;

    if (reviewRequests.store && !storeRating) {
      setSubmitMsg("اختر تقييم المتجر أولًا.");
      return;
    }

    if (reviewRequests.products && productDrafts.length > 0) {
      const missingIndex = productDrafts.findIndex((item) => !item.rating);

      if (missingIndex >= 0) {
        setProductIndex(missingIndex);
        setStep("products");
        setSubmitMsg("اختر تقييم المنتج أولًا.");
        return;
      }
    }

    if (reviewRequests.shipping && !shippingRating) {
      setStep("shipping");
      setSubmitMsg("اختر تقييم الشحن أولًا.");
      return;
    }

    const anyUploading = productDrafts.some((product) =>
      product.media.some((media) => media.uploading),
    );

    if (anyUploading) {
      setSubmitMsg("انتظر حتى يكتمل رفع الصور.");
      return;
    }

    const orderNo = getOrderNo(order);
    if (!orderNo) {
      setSubmitMsg("رقم الطلب غير موجود.");
      return;
    }

    setSubmitting(true);
    setSubmitMsg("");

    try {
      const payload = {
        store_rating: reviewRequests.store ? storeRating : 0,
        store_comment: reviewRequests.store ? s(storeComment) : "",
        products: reviewRequests.products
          ? productDrafts
              .filter((x) => x.rating >= 1)
              .map((x) => ({
                order_item_id: x.order_item_id,
                product_id: x.product_id,
                rating: x.rating,
                comment: s(x.comment),
                media: x.media
                  .filter((m) => m.file_url && !m.uploading && !m.error)
                  .slice(0, maxReviewImages)
                  .map((m, index) => ({
                    file_url: m.file_url,
                    thumbnail_url: m.thumbnail_url,
                    alt_text: m.alt_text,
                    media_type: "image",
                    sort_order: index,
                  })),
              }))
          : [],
        shipping_rating: reviewRequests.shipping ? shippingRating : 0,
        shipping_comment: reviewRequests.shipping ? s(shippingComment) : "",
        contact_support: allowContactSupport ? contactSupport : false,
        support_message: allowContactSupport ? s(supportMessage) : "",
      };

      const res = await fetch(
        `/api/account/orders/${encodeURIComponent(orderNo)}/review`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(s(json?.message) || s(json?.error) || "تعذر إرسال التقييم");
      }

      setStep("done");
      setSubmitMsg(
        alreadyReviewed
          ? "تم حفظ تعديل التقييم بنجاح."
          : "تم إرسال التقييم بنجاح.",
      );
      onSubmitted?.();
    } catch (e: any) {
      setSubmitMsg(s(e?.message) || "تعذر إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReview() {
    if (!order) return;
    if (!alreadyReviewed) return;
    if (!canDeleteExisting) return;
    if (deleting || submitting) return;

    const ok = window.confirm(
      "هل تريد حذف تقييم هذا الطلب؟ لا يمكن التراجع عن الحذف.",
    );

    if (!ok) return;

    const orderNo = getOrderNo(order);
    if (!orderNo) {
      setSubmitMsg("رقم الطلب غير موجود.");
      return;
    }

    setDeleting(true);
    setSubmitMsg("");

    try {
      const res = await fetch(
        `/api/account/orders/${encodeURIComponent(orderNo)}/review`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(
          s(json?.message) || s(json?.error) || "تعذر حذف التقييم",
        );
      }

      onSubmitted?.();
      onClose();
    } catch (e: any) {
      setSubmitMsg(s(e?.message) || "تعذر حذف التقييم");
    } finally {
      setDeleting(false);
    }
  }

  if (!mounted || !open || !order) return null;

  const footerSteps = enabledSteps.length
    ? enabledSteps
    : (["store", "products", "shipping"] as Exclude<StepKey, "done">[]);

  const editUntilText =
    bootstrap.kind === "ready" ? formatDateTime(bootstrap.editUntil) : "";

  const editPeriodDays =
    bootstrap.kind === "ready" ? Number(bootstrap.editPeriodDays || 1) : 1;

  return createPortal(
    <div onClick={onClose} style={styles.overlay}>
      <div dir="rtl" onClick={(e) => e.stopPropagation()} style={styles.card}>
        <div style={styles.head}>
          <div>
            <div style={styles.title}>{title}</div>
            <div style={styles.subtitle}>
              {alreadyReviewed
                ? "عرض تقييمك السابق لهذا الطلب"
                : "شاركنا تقييمك لتجربتك مع الطلب"}
            </div>
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          {bootstrap.kind === "ready" && alreadyReviewed ? (
            <div
              style={{
                ...styles.notice,
                ...(readonlyReview ? styles.noticeAmber : styles.noticeGreen),
              }}
            >
              <div>
                {readonlyReview
                  ? !editDeleteEnabled
                    ? "يمكنك عرض تقييمك فقط، لأن تعديل أو حذف التقييم غير مفعل من المتجر."
                    : `يمكنك عرض تقييمك فقط، انتهت مهلة التعديل بعد مرور ${editPeriodDays} يوم.`
                  : `يمكنك تعديل أو حذف تقييمك خلال ${editPeriodDays} يوم من إرساله${
                      editUntilText ? `، متاح حتى ${editUntilText}` : ""
                    }.`}
              </div>

              {canDeleteExisting ? (
                <button
                  type="button"
                  onClick={deleteReview}
                  disabled={deleting || submitting}
                  style={{
                    ...styles.deleteBtn,
                    cursor: deleting || submitting ? "not-allowed" : "pointer",
                    opacity: deleting || submitting ? 0.65 : 1,
                  }}
                >
                  {deleting ? "جاري الحذف..." : "حذف التقييم"}
                </button>
              ) : null}
            </div>
          ) : null}

          {bootstrap.kind === "loading" ? (
            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "#6b7280",
                padding: "24px 0",
              }}
            >
              جاري تحميل التقييم...
            </div>
          ) : bootstrap.kind === "error" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "9999px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  color: "#991b1b",
                  fontWeight: 950,
                }}
              >
                !
              </div>

              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  تعذر فتح التقييم
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: "#6b7280",
                    lineHeight: 1.9,
                  }}
                >
                  {bootstrap.message}
                </div>
              </div>
            </div>
          ) : step === "store" ? (
            <div style={styles.stepWrap}>
              <div style={styles.iconGold}>🏪</div>

              <div style={styles.centerText}>
                <div style={styles.stepTitle}>تقييم المتجر</div>
                <div style={styles.stepDesc}>
                  كيف كانت تجربتك مع المتجر في هذا الطلب؟
                </div>
              </div>

              {renderStars(storeRating, setStoreRating, readonlyReview)}

              <textarea
                value={storeComment}
                disabled={readonlyReview}
                onChange={(e) => setStoreComment(clampComment(e.target.value))}
                placeholder="اكتب رأيك عن تجربتك مع المتجر"
                rows={4}
                maxLength={120}
                style={{
                  ...styles.textarea,
                  ...(readonlyReview ? styles.textareaReadonly : {}),
                }}
              />

              {isLastStep("store") ? renderSupportContactBox() : null}

              <button
                type="button"
                onClick={nextFromStore}
                disabled={!readonlyReview && (!storeRating || submitting)}
                style={actionButtonStyle(
                  readonlyReview || (Boolean(storeRating) && !submitting),
                )}
              >
                {readonlyReview
                  ? isLastStep("store")
                    ? "إغلاق"
                    : "التالي"
                  : submitting
                    ? "جاري الحفظ..."
                    : isLastStep("store")
                      ? alreadyReviewed
                        ? "حفظ التعديلات"
                        : "إرسال التقييم"
                      : "إرسال تقييم المتجر"}
              </button>
            </div>
          ) : null}

          {step === "products" && currentProduct ? (
            <div style={styles.stepWrap}>
              <div style={styles.iconGold}>🛍️</div>

              <div style={styles.centerText}>
                <div style={styles.stepTitle}>تقييم المنتج</div>

                <div style={styles.stepDesc}>{currentProduct.name}</div>

                <div style={styles.stepHint}>
                  المنتج {productIndex + 1} من {productDrafts.length}
                </div>
              </div>

              {renderStars(
                currentProduct.rating,
                (n) => updateCurrentProduct({ rating: n }),
                readonlyReview,
              )}

              <textarea
                value={currentProduct.comment}
                disabled={readonlyReview}
                onChange={(e) =>
                  updateCurrentProduct({
                    comment: clampComment(e.target.value),
                  })
                }
                placeholder="اكتب رأيك عن هذا المنتج"
                rows={4}
                maxLength={120}
                style={{
                  ...styles.textarea,
                  ...(readonlyReview ? styles.textareaReadonly : {}),
                }}
              />

              {allowAttachImages || currentProduct.media.length ? (
                <div style={styles.uploadBox}>
                  <div style={styles.uploadHead}>
                    <div>
                      <div style={styles.uploadTitle}>صور المنتج المستلم</div>
                      <div style={styles.uploadHint}>
                        {readonlyReview
                          ? "الصور التي أرفقتها مع تقييم المنتج."
                          : allowAttachImages
                            ? "اختياري، يمكنك إرفاق صور المنتج بعد وصوله."
                            : "عرض صور التقييم فقط."}
                      </div>
                    </div>

                    {!readonlyReview && allowAttachImages ? (
                      <label
                        style={{
                          ...styles.uploadBtn,
                          ...((currentProduct.media.filter((m) => !m.error)
                            .length >= maxReviewImages ||
                            currentProductUploading) &&
                            styles.uploadBtnDisabled),
                        }}
                      >
                        إرفاق صورة
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          disabled={
                            currentProduct.media.filter((m) => !m.error)
                              .length >= maxReviewImages ||
                            currentProductUploading
                          }
                          onChange={(e) => {
                            void handleProductImageFiles(e.currentTarget.files);
                            e.currentTarget.value = "";
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    ) : null}
                  </div>

                  {currentProduct.media.length ? (
                    <div style={styles.mediaGrid}>
                      {currentProduct.media.map((media) => (
                        <div key={media.id} style={styles.mediaItem}>
                          {media.file_url && !media.uploading ? (
                            <img
                              src={media.file_url}
                              alt={media.alt_text || "صورة تقييم المنتج"}
                              style={styles.mediaImg}
                            />
                          ) : (
                            <div
                              style={{
                                ...styles.mediaState,
                                color: media.error ? "#991b1b" : "#6b7280",
                              }}
                            >
                              {media.error ? media.error : "جاري الرفع..."}
                            </div>
                          )}

                          {!readonlyReview && allowAttachImages ? (
                            <button
                              type="button"
                              onClick={() => removeCurrentProductMedia(media.id)}
                              style={styles.removeMediaBtn}
                              aria-label="حذف الصورة"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {productRemaining === 0 && isLastStep("products")
                ? renderSupportContactBox()
                : null}

              <button
                type="button"
                onClick={nextFromProducts}
                disabled={
                  !readonlyReview &&
                  (!currentProduct.rating || currentProductUploading || submitting)
                }
                style={actionButtonStyle(
                  readonlyReview ||
                    (Boolean(currentProduct.rating) &&
                      !currentProductUploading &&
                      !submitting),
                )}
              >
                {readonlyReview
                  ? productRemaining > 0
                    ? "التالي"
                    : isLastStep("products")
                      ? "إغلاق"
                      : "التالي"
                  : currentProductUploading
                    ? "جاري رفع الصور..."
                    : submitting
                      ? "جاري الحفظ..."
                      : productRemaining > 0
                        ? "إرسال وتقييم المنتج التالي"
                        : isLastStep("products")
                          ? alreadyReviewed
                            ? "حفظ التعديلات"
                            : "إرسال التقييم"
                          : "إرسال تقييم المنتجات"}
              </button>
            </div>
          ) : null}

          {step === "shipping" ? (
            <div style={styles.stepWrap}>
              <div style={styles.iconGold}>🚚</div>

              <div style={styles.centerText}>
                <div style={styles.stepTitle}>تقييم الشحن</div>
                <div style={styles.stepDesc}>
                  كيف كانت تجربتك مع الشحن والتوصيل؟
                </div>
              </div>

              {renderStars(shippingRating, setShippingRating, readonlyReview)}

              <textarea
                value={shippingComment}
                disabled={readonlyReview}
                onChange={(e) =>
                  setShippingComment(clampComment(e.target.value))
                }
                placeholder="اكتب رأيك عن تجربة الشحن"
                rows={4}
                maxLength={120}
                style={{
                  ...styles.textarea,
                  ...(readonlyReview ? styles.textareaReadonly : {}),
                }}
              />

              {isLastStep("shipping") ? renderSupportContactBox() : null}

              <button
                type="button"
                onClick={readonlyReview ? onClose : submitAll}
                disabled={!readonlyReview && (submitting || !shippingRating)}
                style={actionButtonStyle(
                  readonlyReview || (!submitting && Boolean(shippingRating)),
                )}
              >
                {readonlyReview
                  ? "إغلاق"
                  : submitting
                    ? "جاري الحفظ..."
                    : alreadyReviewed
                      ? "حفظ التعديلات"
                      : "إرسال التقييم"}
              </button>
            </div>
          ) : null}

          {step === "done" ? (
            <div style={styles.stepWrap}>
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "9999px",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  fontSize: 34,
                  color: "#047857",
                  fontWeight: 950,
                }}
              >
                ✓
              </div>

              <div style={styles.centerText}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#111827",
                  }}
                >
                  شكرًا لك
                </div>

                <div style={styles.stepDesc}>
                  {alreadyReviewed
                    ? "تم حفظ تعديل التقييم بنجاح."
                    : "تم إرسال تقييم الطلب بنجاح."}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 48,
                  border: "none",
                  borderRadius: 14,
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                إغلاق
              </button>
            </div>
          ) : null}

          {submitMsg ? <div style={styles.msg}>{submitMsg}</div> : null}
        </div>

        <div style={styles.footer}>
          {footerSteps.map((k, idx) => {
            const active =
              step === k || (step === "done" && idx === footerSteps.length - 1);

            return (
              <div
                key={k}
                style={{
                  width: 44,
                  height: 6,
                  borderRadius: 999,
                  background: active ? "#cbb794" : "#e5e7eb",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}