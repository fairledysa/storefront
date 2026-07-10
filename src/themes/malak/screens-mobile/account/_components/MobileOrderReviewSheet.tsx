// FILE: apps/storefront/src/themes/malak/screens-mobile/account/_components/MobileOrderReviewSheet.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { OrdersApiRow } from "../../../screens/account/_components/OrdersTable";

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
    if (["true", "1", "yes", "on", "enabled", "active"].includes(v)) return true;
    if (["false", "0", "no", "off", "disabled", "inactive"].includes(v)) return false;
  }

  return fallback;
}

function normalizeReviewRequests(raw: any, productCount: number): ReviewRequests {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

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

function reviewStatusLabel(status?: string | null) {
  const key = s(status).toLowerCase();
  const map: Record<string, string> = {
    pending: "بانتظار النشر",
    published: "منشور",
    approved: "منشور",
    rejected: "مرفوض",
    hidden: "مخفي",
  };

  return map[key] || "بانتظار النشر";
}

export default function MobileOrderReviewSheet({
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
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<StepKey>("store");

  const [bootstrap, setBootstrap] = useState<BootstrapState>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const [storeRating, setStoreRating] = useState<number>(0);
  const [storeComment, setStoreComment] = useState("");
  const [storeStatus, setStoreStatus] = useState("");
  const [storeCreatedAt, setStoreCreatedAt] = useState("");

  const [productIndex, setProductIndex] = useState(0);
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([]);

  const [shippingRating, setShippingRating] = useState<number>(0);
  const [shippingComment, setShippingComment] = useState("");
  const [shippingStatus, setShippingStatus] = useState("");
  const [shippingCreatedAt, setShippingCreatedAt] = useState("");

  const [contactSupport, setContactSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

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
    if (!open || !order) {
      setStep("store");
      setBootstrap({ kind: "idle" });
      setSubmitting(false);
      setDeleting(false);
      setConfirmDelete(false);
      setSubmitMsg("");
      setStoreRating(0);
      setStoreComment("");
      setStoreStatus("");
      setStoreCreatedAt("");
      setProductIndex(0);
      setProductDrafts([]);
      setShippingRating(0);
      setShippingComment("");
      setShippingStatus("");
      setShippingCreatedAt("");
      setContactSupport(false);
      setSupportMessage("");
      return;
    }

    const currentOrderNo = getOrderNo(order);
    let alive = true;

    async function loadBootstrap() {
      try {
        if (!currentOrderNo) {
          setBootstrap({ kind: "error", message: "رقم الطلب غير موجود" });
          return;
        }

        setBootstrap({ kind: "loading" });
        setSubmitMsg("");

        const res = await fetch(
          `/api/account/orders/${encodeURIComponent(currentOrderNo)}/review`,
          { method: "GET", cache: "no-store", credentials: "include" },
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
        const shippingReview = json?.shipping_review as ExistingReviewBlock | null;
        const reviewRequests = normalizeReviewRequests(json?.review_requests, drafts.length);
        const firstStep = getEnabledReviewSteps(reviewRequests, drafts.length)[0];

        if (!firstStep) {
          setBootstrap({
            kind: "error",
            message: "لا توجد أنواع تقييم مفعلة لهذا الطلب.",
          });
          return;
        }

        setStoreRating(Number(storeReview?.rating ?? 0));
        setStoreComment(s(storeReview?.body ?? storeReview?.comment));
        setStoreStatus(s(storeReview?.status));
        setStoreCreatedAt(s(storeReview?.created_at));

        setShippingRating(Number(shippingReview?.rating ?? 0));
        setShippingComment(s(shippingReview?.comment ?? shippingReview?.body));
        setShippingStatus(s(shippingReview?.status));
        setShippingCreatedAt(s(shippingReview?.created_at));

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
  const reviewRequests = bootstrap.kind === "ready" ? bootstrap.reviewRequests : DEFAULT_REVIEW_REQUESTS;
  const alreadyReviewed = bootstrap.kind === "ready" ? bootstrap.alreadyReviewed : false;
  const canEditExisting = bootstrap.kind === "ready" ? bootstrap.canEdit : false;
  const canDeleteExisting = bootstrap.kind === "ready" ? bootstrap.canDelete : false;
  const editDeleteEnabled = bootstrap.kind === "ready" ? bootstrap.editDeleteEnabled : false;
  const allowContactSupport = bootstrap.kind === "ready" ? bootstrap.allowContactSupport : false;
  const readonlyReview = alreadyReviewed && !canEditExisting;
  const allowAttachImages = bootstrap.kind === "ready" ? bootstrap.allowAttachImages : false;
  const maxReviewImages =
    bootstrap.kind === "ready"
      ? Math.max(1, bootstrap.maxReviewImages || DEFAULT_MAX_REVIEW_IMAGES)
      : DEFAULT_MAX_REVIEW_IMAGES;
  const enabledSteps = getEnabledReviewSteps(reviewRequests, productDrafts.length);
  const currentProductUploading = Boolean(currentProduct?.media?.some((item) => item.uploading));
  const editUntilText = bootstrap.kind === "ready" ? formatDateTime(bootstrap.editUntil) : "";
  const editPeriodDays = bootstrap.kind === "ready" ? Number(bootstrap.editPeriodDays || 1) : 1;

  function getNextStep(current: Exclude<StepKey, "done">) {
    const currentIndex = enabledSteps.indexOf(current);
    if (currentIndex < 0) return null;
    return enabledSteps[currentIndex + 1] ?? null;
  }

  function isLastStep(current: Exclude<StepKey, "done">) {
    return enabledSteps[enabledSteps.length - 1] === current;
  }

  function updateCurrentProduct(patch: Partial<ProductDraft>) {
    if (readonlyReview) return;

    setProductDrafts((prev) =>
      prev.map((item, idx) => (idx === productIndex ? { ...item, ...patch } : item)),
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
    if (readonlyReview || !currentProduct || !allowAttachImages) return;

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
        idx === index ? { ...item, media: [...item.media, ...tempItems] } : item,
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
    if (readonlyReview || !allowAttachImages) return;

    setProductDrafts((prev) =>
      prev.map((item, idx) =>
        idx === productIndex
          ? { ...item, media: item.media.filter((mediaItem) => mediaItem.id !== mediaId) }
          : item,
      ),
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
    if (readonlyReview || !order || submitting || deleting) return;

    if (reviewRequests.store && !storeRating) {
      setSubmitMsg("اختر تقييم المتجر أولًا.");
      setStep("store");
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
          headers: { "Content-Type": "application/json" },
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
    if (!order || !alreadyReviewed || !canDeleteExisting || deleting || submitting) return;

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
        { method: "DELETE", credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(s(json?.message) || s(json?.error) || "تعذر حذف التقييم");
      }

      onSubmitted?.();
      onClose();
    } catch (e: any) {
      setSubmitMsg(s(e?.message) || "تعذر حذف التقييم");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!mounted || !order) return null;

  const footerSteps = enabledSteps.length
    ? enabledSteps
    : (["store", "products", "shipping"] as Exclude<StepKey, "done">[]);

  return (
    <div
      dir="rtl"
      className={`mk-moreview ${visible ? "is-visible" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="mk-moreview__overlay"
      />

      <div className="mk-moreview__sheet">
        <div className="mk-moreview__handleWrap">
          <div className="mk-moreview__handle" />
        </div>

        <div className="mk-moreview__head">
          <div>
            <div className="mk-moreview__title">{title}</div>
            <div className="mk-moreview__subtitle">
              {alreadyReviewed
                ? "عرض تقييمك السابق لهذا الطلب"
                : "شاركنا تقييمك لتجربتك مع الطلب"}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mk-moreview__close"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="mk-moreview__body">
          {bootstrap.kind === "ready" && alreadyReviewed ? (
            <div
              className={[
                "mk-moreview-notice",
                readonlyReview ? "mk-moreview-notice--amber" : "mk-moreview-notice--green",
              ].join(" ")}
            >
              <div className="mk-moreview-notice__text">
                {readonlyReview
                  ? !editDeleteEnabled
                    ? "يمكنك عرض تقييمك فقط، لأن تعديل أو حذف التقييم غير مفعل من المتجر."
                    : `يمكنك عرض تقييمك فقط، انتهت مهلة التعديل بعد مرور ${editPeriodDays} يوم.`
                  : `يمكنك تعديل أو حذف تقييمك خلال ${editPeriodDays} يوم من إرساله${
                      editUntilText ? `، متاح حتى ${editUntilText}` : ""
                    }.`}
              </div>

              <div className="mk-moreview-statusGrid">
                <InfoPill label="حالة تقييم المتجر" value={reviewStatusLabel(storeStatus || order.review_status)} />
                {storeCreatedAt ? (
                  <InfoPill label="تاريخ الإنشاء" value={formatDateTime(storeCreatedAt)} />
                ) : null}
                {shippingStatus ? (
                  <InfoPill label="حالة تقييم الشحن" value={reviewStatusLabel(shippingStatus)} />
                ) : null}
                {shippingCreatedAt ? (
                  <InfoPill label="آخر تقييم شحن" value={formatDateTime(shippingCreatedAt)} />
                ) : null}
              </div>

              {canDeleteExisting ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting || submitting}
                  className="mk-moreview-deleteBtn"
                >
                  {deleting ? "جاري الحذف..." : "حذف التقييم"}
                </button>
              ) : null}
            </div>
          ) : null}

          {confirmDelete ? (
            <div className="mk-moreview-confirm">
              <div>
                <strong>حذف التقييم؟</strong>
                <span>لا يمكن التراجع عن الحذف بعد تأكيده.</span>
              </div>
              <div className="mk-moreview-confirm__actions">
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  إلغاء
                </button>
                <button type="button" onClick={() => void deleteReview()} disabled={deleting}>
                  {deleting ? "جاري الحذف..." : "تأكيد الحذف"}
                </button>
              </div>
            </div>
          ) : null}

          {bootstrap.kind === "loading" ? (
            <div className="mk-moreview__loading">جاري تحميل التقييم...</div>
          ) : bootstrap.kind === "error" ? (
            <div className="mk-moreview__error">
              <div className="mk-moreview__errorTitle">تعذر فتح التقييم</div>
              <div className="mk-moreview__errorText">{bootstrap.message}</div>
            </div>
          ) : step === "store" ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="★"
                title="تقييم المتجر"
                text="كيف كانت تجربتك مع المتجر في هذا الطلب؟"
              />

              <Stars value={storeRating} onChange={setStoreRating} disabled={readonlyReview} />

              <textarea
                value={storeComment}
                disabled={readonlyReview}
                onChange={(e) => setStoreComment(clampComment(e.target.value))}
                placeholder="اكتب رأيك عن تجربتك مع المتجر"
                rows={4}
                maxLength={120}
                className="mk-moreview-textarea"
              />

              {isLastStep("store") ? (
                <SupportContactBox
                  allow={allowContactSupport}
                  readonly={readonlyReview}
                  checked={contactSupport}
                  message={supportMessage}
                  onChecked={setContactSupport}
                  onMessage={(value) => setSupportMessage(clampComment(value, 200))}
                />
              ) : null}

              <ActionButton
                readonly={readonlyReview}
                disabled={!readonlyReview && (!storeRating || submitting)}
                onClick={nextFromStore}
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
              </ActionButton>
            </div>
          ) : null}

          {step === "products" && currentProduct ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="□"
                title="تقييم المنتج"
                text={currentProduct.name}
                sub={`المنتج ${productIndex + 1} من ${productDrafts.length}`}
              />

              <Stars
                value={currentProduct.rating}
                onChange={(n) => updateCurrentProduct({ rating: n })}
                disabled={readonlyReview}
              />

              <textarea
                value={currentProduct.comment}
                disabled={readonlyReview}
                onChange={(e) =>
                  updateCurrentProduct({ comment: clampComment(e.target.value) })
                }
                placeholder="اكتب رأيك عن هذا المنتج"
                rows={4}
                maxLength={120}
                className="mk-moreview-textarea"
              />

              {allowAttachImages || currentProduct.media.length ? (
                <div className="mk-moreview-upload">
                  <div className="mk-moreview-upload__head">
                    <div>
                      <div className="mk-moreview-upload__title">صور المنتج المستلم</div>
                      <div className="mk-moreview-upload__hint">
                        {readonlyReview
                          ? "الصور التي أرفقتها مع تقييم المنتج."
                          : allowAttachImages
                            ? `اختياري، يمكنك إرفاق ${maxReviewImages} صور كحد أقصى.`
                            : "عرض صور التقييم فقط."}
                      </div>
                    </div>

                    {!readonlyReview && allowAttachImages ? (
                      <label
                        className={[
                          "mk-moreview-upload__btn",
                          currentProduct.media.filter((m) => !m.error).length >= maxReviewImages ||
                          currentProductUploading
                            ? "is-disabled"
                            : "",
                        ].join(" ")}
                      >
                        إرفاق صورة
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          disabled={
                            currentProduct.media.filter((m) => !m.error).length >= maxReviewImages ||
                            currentProductUploading
                          }
                          onChange={(e) => {
                            void handleProductImageFiles(e.currentTarget.files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    ) : null}
                  </div>

                  {currentProduct.media.length ? (
                    <div className="mk-moreview-mediaGrid">
                      {currentProduct.media.map((media) => (
                        <div key={media.id} className="mk-moreview-mediaItem">
                          {media.file_url && !media.uploading ? (
                            <img
                              src={media.file_url}
                              alt={media.alt_text || "صورة تقييم المنتج"}
                            />
                          ) : (
                            <div className="mk-moreview-mediaItem__state">
                              {media.error ? media.error : "جاري الرفع..."}
                            </div>
                          )}

                          {!readonlyReview && allowAttachImages ? (
                            <button
                              type="button"
                              onClick={() => removeCurrentProductMedia(media.id)}
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

              {productRemaining === 0 && isLastStep("products") ? (
                <SupportContactBox
                  allow={allowContactSupport}
                  readonly={readonlyReview}
                  checked={contactSupport}
                  message={supportMessage}
                  onChecked={setContactSupport}
                  onMessage={(value) => setSupportMessage(clampComment(value, 200))}
                />
              ) : null}

              <ActionButton
                readonly={readonlyReview}
                disabled={
                  !readonlyReview &&
                  (!currentProduct.rating || currentProductUploading || submitting)
                }
                onClick={nextFromProducts}
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
              </ActionButton>
            </div>
          ) : null}

          {step === "shipping" ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="→"
                title="تقييم الشحن"
                text="كيف كانت تجربتك مع الشحن والتوصيل؟"
              />

              <Stars value={shippingRating} onChange={setShippingRating} disabled={readonlyReview} />

              <textarea
                value={shippingComment}
                disabled={readonlyReview}
                onChange={(e) => setShippingComment(clampComment(e.target.value))}
                placeholder="اكتب رأيك عن تجربة الشحن"
                rows={4}
                maxLength={120}
                className="mk-moreview-textarea"
              />

              {isLastStep("shipping") ? (
                <SupportContactBox
                  allow={allowContactSupport}
                  readonly={readonlyReview}
                  checked={contactSupport}
                  message={supportMessage}
                  onChecked={setContactSupport}
                  onMessage={(value) => setSupportMessage(clampComment(value, 200))}
                />
              ) : null}

              <ActionButton
                readonly={readonlyReview}
                disabled={!readonlyReview && (submitting || !shippingRating)}
                onClick={readonlyReview ? onClose : submitAll}
              >
                {readonlyReview
                  ? "إغلاق"
                  : submitting
                    ? "جاري الحفظ..."
                    : alreadyReviewed
                      ? "حفظ التعديلات"
                      : "إرسال التقييم"}
              </ActionButton>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="✓"
                title="شكرًا لك"
                text={
                  alreadyReviewed
                    ? "تم حفظ تعديل التقييم بنجاح."
                    : "تم إرسال تقييم الطلب بنجاح."
                }
                success
              />

              <button
                type="button"
                onClick={onClose}
                className="mk-moreview-primary mk-moreview-primary--dark"
              >
                إغلاق
              </button>
            </div>
          ) : null}

          {submitMsg ? <div className="mk-moreview__msg">{submitMsg}</div> : null}
        </div>

        <div className="mk-moreview__progress">
          {footerSteps.map((k) => (
            <div
              key={k}
              className={`mk-moreview__progressDot ${
                step === k || (step === "done" && k === footerSteps[footerSteps.length - 1])
                  ? "is-active"
                  : ""
              }`}
              aria-label={k}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stars({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mk-moreview-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) onChange(n);
          }}
          className={`mk-moreview-star ${n <= value ? "is-active" : ""}`}
          aria-label={`تقييم ${n}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewHero({
  emoji,
  title,
  text,
  sub,
  success = false,
}: {
  emoji: string;
  title: string;
  text: string;
  sub?: string;
  success?: boolean;
}) {
  return (
    <div className={`mk-moreview-hero ${success ? "mk-moreview-hero--success" : ""}`}>
      <div className="mk-moreview-hero__icon">{emoji}</div>
      <div className="mk-moreview-hero__title">{title}</div>
      <div className="mk-moreview-hero__text">{text}</div>
      {sub ? <div className="mk-moreview-hero__sub">{sub}</div> : null}
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  readonly,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  readonly: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mk-moreview-primary ${readonly || !disabled ? "is-active" : ""}`}
    >
      {children}
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="mk-moreview-pill">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function SupportContactBox({
  allow,
  readonly,
  checked,
  message,
  onChecked,
  onMessage,
}: {
  allow: boolean;
  readonly: boolean;
  checked: boolean;
  message: string;
  onChecked: (value: boolean) => void;
  onMessage: (value: string) => void;
}) {
  if (!allow) return null;
  if (readonly && !checked) return null;

  return (
    <div className="mk-moreview-support">
      <label className="mk-moreview-support__toggle">
        <input
          type="checkbox"
          checked={checked}
          disabled={readonly}
          onChange={(e) => onChecked(e.currentTarget.checked)}
        />
        <span>
          <strong>أرغب أن يتواصل معي فريق خدمة العملاء</strong>
          <small>
            فعّل هذا الخيار إذا كان عندك ملاحظة تحتاج متابعة من المتجر.
          </small>
        </span>
      </label>

      {checked ? (
        <textarea
          value={message}
          disabled={readonly}
          onChange={(e) => onMessage(e.target.value)}
          placeholder="اكتب ملاحظتك لفريق خدمة العملاء"
          rows={3}
          maxLength={200}
          className="mk-moreview-textarea mk-moreview-textarea--support"
        />
      ) : null}
    </div>
  );
}
