// FILE: apps/storefront/src/themes/malak/screens-mobile/account/_components/MobileOrderReviewSheet.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { OrdersApiRow } from "../../../screens/account/_components/OrdersTable";

type StepKey = "store" | "products" | "shipping" | "done";

type BootstrapItem = {
  order_item_id: string;
  product_id: string;
  name: string;
};

type BootstrapState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; orderId: string; status: string; items: BootstrapItem[] };

type ProductDraft = {
  order_item_id: string;
  product_id: string;
  name: string;
  rating: number;
  comment: string;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function clampComment(v: string, max = 120) {
  return String(v ?? "").slice(0, max);
}

export default function MobileOrderReviewSheet({
  open,
  order,
  onClose,
}: {
  open: boolean;
  order: OrdersApiRow | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  const [step, setStep] = useState<StepKey>("store");

  const [bootstrap, setBootstrap] = useState<BootstrapState>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const [storeRating, setStoreRating] = useState<number>(0);
  const [storeComment, setStoreComment] = useState("");

  const [productIndex, setProductIndex] = useState(0);
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([]);

  const [shippingRating, setShippingRating] = useState<number>(0);
  const [shippingComment, setShippingComment] = useState("");

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
      setSubmitMsg("");
      setStoreRating(0);
      setStoreComment("");
      setProductIndex(0);
      setProductDrafts([]);
      setShippingRating(0);
      setShippingComment("");
      return;
    }

    const currentOrder = order;
    let alive = true;

    async function loadBootstrap() {
      try {
        setBootstrap({ kind: "loading" });
        setSubmitMsg("");

        const res = await fetch(
          `/api/account/orders/${encodeURIComponent(
            currentOrder.order_number || currentOrder.public_no,
          )}/review`,
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

        const drafts: ProductDraft[] = itemsRaw.map((x: any) => ({
          order_item_id: s(x?.order_item_id),
          product_id: s(x?.product_id),
          name: s(x?.name) || "منتج",
          rating: 0,
          comment: "",
        }));

        setProductDrafts(drafts);
        setProductIndex(0);

        setBootstrap({
          kind: "ready",
          orderId: s(json?.order_id),
          status: s(json?.status),
          items: drafts.map((x) => ({
            order_item_id: x.order_item_id,
            product_id: x.product_id,
            name: x.name,
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
    if (!order) return "تقييم الطلب";
    return `تقييم الطلب #${order.order_number || order.public_no}`;
  }, [order]);

  const currentProduct =
    step === "products" && productDrafts.length
      ? productDrafts[productIndex] ?? null
      : null;

  const productRemaining = Math.max(productDrafts.length - productIndex - 1, 0);

  function updateCurrentProduct(patch: Partial<ProductDraft>) {
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

  function nextFromStore() {
    if (!storeRating) return;

    if (productDrafts.length > 0) {
      setStep("products");
      setSubmitMsg("تم تقييم المتجر، الآن قيّم المنتجات.");
      return;
    }

    setStep("shipping");
    setSubmitMsg("تم تقييم المتجر، الآن قيّم الشحن.");
  }

  function nextFromProducts() {
    if (!currentProduct?.rating) return;

    if (productIndex < productDrafts.length - 1) {
      setProductIndex((x) => x + 1);
      setSubmitMsg("تم حفظ تقييم المنتج، أكمل تقييم بقية المنتجات.");
      return;
    }

    setStep("shipping");
    setSubmitMsg("تم تقييم المنتجات، الآن قيّم الشحن.");
  }

  async function submitAll() {
    if (!order) return;
    if (!storeRating) return;
    if (submitting) return;

    setSubmitting(true);
    setSubmitMsg("");

    try {
      const payload = {
        store_rating: storeRating,
        store_comment: s(storeComment),
        products: productDrafts
          .filter((x) => x.rating >= 1)
          .map((x) => ({
            order_item_id: x.order_item_id,
            product_id: x.product_id,
            rating: x.rating,
            comment: s(x.comment),
          })),
        shipping_rating: shippingRating,
        shipping_comment: s(shippingComment),
      };

      const res = await fetch(
        `/api/account/orders/${encodeURIComponent(order.order_number || order.public_no)}/review`,
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
        throw new Error(s(json?.error) || "تعذر إرسال التقييم");
      }

      setStep("done");
      setSubmitMsg("تم إرسال التقييم بنجاح.");
    } catch (e: any) {
      setSubmitMsg(s(e?.message) || "تعذر إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !order) return null;

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
              شاركنا تقييمك للتجربة
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
          {bootstrap.kind === "loading" ? (
            <div className="mk-moreview__loading">جاري تحميل التقييم...</div>
          ) : bootstrap.kind === "error" ? (
            <div className="mk-moreview__error">
              <div className="mk-moreview__errorTitle">تعذر فتح التقييم</div>
              <div className="mk-moreview__errorText">
                {bootstrap.message}
              </div>
            </div>
          ) : step === "store" ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="🏪"
                title="تقييم المتجر"
                text="كيف كانت تجربتك مع المتجر في هذا الطلب؟"
              />

              <Stars value={storeRating} onChange={setStoreRating} />

              <textarea
                value={storeComment}
                onChange={(e) => setStoreComment(clampComment(e.target.value))}
                placeholder="اكتب رأيك عن تجربتك مع المتجر"
                rows={4}
                maxLength={120}
                className="mk-moreview-textarea"
              />

              <button
                type="button"
                onClick={nextFromStore}
                disabled={!storeRating}
                className="mk-moreview-primary"
              >
                إرسال تقييم المتجر
              </button>
            </div>
          ) : null}

          {step === "products" && currentProduct ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="🛍️"
                title="تقييم المنتج"
                text={currentProduct.name}
                sub={`المنتج ${productIndex + 1} من ${productDrafts.length}`}
              />

              <Stars
                value={currentProduct.rating}
                onChange={(n) => updateCurrentProduct({ rating: n })}
              />

              <textarea
                value={currentProduct.comment}
                onChange={(e) =>
                  updateCurrentProduct({
                    comment: clampComment(e.target.value),
                  })
                }
                placeholder="اكتب رأيك عن هذا المنتج"
                rows={4}
                maxLength={120}
                className="mk-moreview-textarea"
              />

              <button
                type="button"
                onClick={nextFromProducts}
                disabled={!currentProduct.rating}
                className="mk-moreview-primary"
              >
                {productRemaining > 0
                  ? "إرسال وتقييم المنتج التالي"
                  : "إرسال تقييم المنتجات"}
              </button>
            </div>
          ) : null}

          {step === "shipping" ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="🚚"
                title="تقييم الشحن"
                text="كيف كانت تجربتك مع الشحن والتوصيل؟"
              />

              <Stars value={shippingRating} onChange={setShippingRating} />

              <textarea
                value={shippingComment}
                onChange={(e) =>
                  setShippingComment(clampComment(e.target.value))
                }
                placeholder="اكتب رأيك عن تجربة الشحن"
                rows={4}
                maxLength={120}
                className="mk-moreview-textarea"
              />

              <button
                type="button"
                onClick={submitAll}
                disabled={submitting}
                className="mk-moreview-primary"
              >
                {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
              </button>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="mk-moreview__step">
              <ReviewHero
                emoji="✓"
                title="شكرًا لك"
                text="تم إرسال تقييم الطلب بنجاح."
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

          {submitMsg ? (
            <div className="mk-moreview__msg">{submitMsg}</div>
          ) : null}
        </div>

        <div className="mk-moreview__progress">
          {(["store", "products", "shipping"] as StepKey[]).map((k, idx) => {
            const active =
              (step === "store" && k === "store") ||
              (step === "products" && k === "products") ||
              (step === "shipping" && k === "shipping") ||
              (step === "done" && idx === 2);

            return (
              <div
                key={k}
                className={`mk-moreview__progressDot ${
                  active ? "is-active" : ""
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mk-moreview-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
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
    <div
      className={`mk-moreview-hero ${
        success ? "mk-moreview-hero--success" : ""
      }`}
    >
      <div className="mk-moreview-hero__icon">{emoji}</div>

      <div className="mk-moreview-hero__title">{title}</div>

      <div className="mk-moreview-hero__text">{text}</div>

      {sub ? <div className="mk-moreview-hero__sub">{sub}</div> : null}
    </div>
  );
}