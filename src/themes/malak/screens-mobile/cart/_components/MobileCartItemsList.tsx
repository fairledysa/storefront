// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartItemsList.tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type {
  CartItemEnriched,
  CartSummaryMoney,
} from "../../../screens/cart/_components/types";
import MobileCartItemCard from "./MobileCartItemCard";

const MobileEditOptionsSheet = dynamic(
  () => import("./MobileEditOptionsSheet"),
  {
    ssr: false,
    loading: () => null,
  },
);

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
  onContinueShopping: () => void;
};

export default function MobileCartItemsList({
  items,
  summary,
  loading,
  busy,
  onInc,
  onRemove,
  onReload,
  flash,
  onContinueShopping,
}: Props) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [touchingId, setTouchingId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentPreview | null>(null);
  const [qtyPending, setQtyPending] = useState<QtyPending>(null);

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qtyPendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (qtyPendingTimerRef.current) clearTimeout(qtyPendingTimerRef.current);
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
    }, 170);
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
    }, 850);
  }, []);

  const handleQtyChange = useCallback(
    (id: string, delta: number) => {
      touchItem(id);
      showQtyPending(id, delta);
      void onInc(id, delta);
    },
    [onInc, showQtyPending, touchItem],
  );

  const handleRemove = useCallback(
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

  const handlePreviewAttachment = useCallback(
    (url: string | null, isImage: boolean) => {
      if (!url) return;
      setPreviewAttachment({ url, isImage });
    },
    [],
  );

  const closePreview = useCallback(() => {
    setPreviewAttachment(null);
  }, []);

  if (loading) {
    return (
      <section className="mk-mcart-list" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mk-mcart-skeletonCard">
            <div className="mk-mcart-skeletonCard__image" />

            <div className="mk-mcart-skeletonCard__body">
              <span className="mk-mcart-skeletonLine mk-mcart-skeletonLine--lg" />
              <span className="mk-mcart-skeletonLine" />
              <span className="mk-mcart-skeletonPills" />
              <span className="mk-mcart-skeletonLine mk-mcart-skeletonLine--sm" />
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="mk-mcart-empty">
        <div className="mk-mcart-empty__icon">🛒</div>
        <h2 className="mk-mcart-empty__title">السلة فارغة</h2>
        <p className="mk-mcart-empty__text">
          أضف منتجاتك المفضلة، وسيظهر ملخص الطلب هنا بشكل واضح وسريع.
        </p>

        <button
          type="button"
          onClick={onContinueShopping}
          className="mk-mcart-empty__button"
        >
          ابدأ التسوق
        </button>
      </section>
    );
  }

  return (
    <>
      <section
        className={["mk-mcart-list", busy ? "is-busy" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {items.map((item) => (
          <MobileCartItemCard
            key={item.id}
            item={item}
            summary={summary ?? null}
            isRemoving={String(removingId ?? "") === String(item.id)}
            isTouched={String(touchingId ?? "") === String(item.id)}
            qtyPending={qtyPending}
            onEdit={handleEdit}
            onRemove={handleRemove}
            onQtyChange={handleQtyChange}
            onPreviewAttachment={handlePreviewAttachment}
          />
        ))}
      </section>

      {editingItem ? (
        <MobileEditOptionsSheet
          open
          item={editingItem}
          onClose={handleCloseEdit}
          onChanged={handleChangedEdit}
          flash={handleFlash}
        />
      ) : null}

      {previewAttachment ? (
        <div
          className="mk-mcart-preview"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة المرفق"
        >
          <button
            type="button"
            className="mk-mcart-preview__overlay"
            onClick={closePreview}
            aria-label="إغلاق المعاينة"
          />

          <div className="mk-mcart-preview__panel">
            <div className="mk-mcart-preview__head">
              <div>
                <div className="mk-mcart-preview__eyebrow">مرفق المنتج</div>
                <div className="mk-mcart-preview__title">
                  {previewAttachment.isImage ? "معاينة الصورة" : "معاينة المرفق"}
                </div>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="mk-mcart-preview__close"
              >
                إغلاق
              </button>
            </div>

            <div className="mk-mcart-preview__body">
              {previewAttachment.isImage ? (
                <img
                  src={previewAttachment.url}
                  alt="الصورة المرفقة"
                  className="mk-mcart-preview__img"
                />
              ) : (
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mk-mcart-preview__file"
                >
                  فتح المرفق
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}