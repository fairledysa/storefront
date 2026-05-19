// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductGallery.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images?: string[];
  title?: string;
  promotionTitle?: string | null;
  onBack: () => void;
  onSearch: () => void;
  onOpenCart: () => void;
};

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0;
  if (index < 0) return total - 1;
  if (index >= total) return 0;
  return index;
}

export default function MobileProductGallery({
  images = [],
  title = "صورة المنتج",
  promotionTitle = null,
  onBack,
  onSearch,
  onOpenCart,
}: Props) {
  const list = useMemo(
    () =>
      Array.isArray(images)
        ? images.map((x) => String(x ?? "").trim()).filter(Boolean)
        : [],
    [images],
  );

  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastSwipeAt = useRef(0);

  const viewerTouchStartX = useRef<number | null>(null);
  const viewerTouchStartY = useRef<number | null>(null);

  const total = list.length;
  const main = list[active] ?? list[0] ?? null;

  useEffect(() => {
    if (!viewerOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewerOpen(false);
        setZoomed(false);
      }

      if (e.key === "ArrowRight") {
        setActive((i) => clampIndex(i - 1, total));
        setZoomed(false);
      }

      if (e.key === "ArrowLeft") {
        setActive((i) => clampIndex(i + 1, total));
        setZoomed(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewerOpen, total]);

  function goNext() {
    setActive((i) => clampIndex(i + 1, total));
    setZoomed(false);
  }

  function goPrev() {
    setActive((i) => clampIndex(i - 1, total));
    setZoomed(false);
  }

  function handleSwipe(deltaX: number, deltaY: number) {
    if (total <= 1) return false;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 36) return false;
    if (absY > absX * 0.8) return false;

    if (deltaX > 0) {
      goPrev();
    } else {
      goNext();
    }

    lastSwipeAt.current = Date.now();
    return true;
  }

  return (
    <>
      <div className="mkmpg-hero" dir="rtl">
        <div
          className="mkmpg-media"
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchStartX.current = t.clientX;
            touchStartY.current = t.clientY;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current == null || touchStartY.current == null) {
              return;
            }

            const t = e.changedTouches[0];
            const dx = t.clientX - touchStartX.current;
            const dy = t.clientY - touchStartY.current;

            handleSwipe(dx, dy);

            touchStartX.current = null;
            touchStartY.current = null;
          }}
        >
          {main ? (
            <button
              type="button"
              className="mkmpg-imageBtn"
              onClick={() => {
                if (Date.now() - lastSwipeAt.current < 280) return;
                setViewerOpen(true);
              }}
              aria-label="تكبير صورة المنتج"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={main} alt={title} className="mkmpg-img" />
            </button>
          ) : (
            <div className="mkmpg-empty">لا توجد صورة</div>
          )}

          <div className="mkmpg-actions mkmpg-actions--left">
            <button
              type="button"
              className="mkmpg-actionBtn"
              onClick={onSearch}
              aria-label="البحث"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10.8 18.6a7.8 7.8 0 1 1 0-15.6 7.8 7.8 0 0 1 0 15.6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16.6 16.6 21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              type="button"
              className="mkmpg-actionBtn"
              aria-label="إضافة للمفضلة"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 20.5s-7.5-4.4-9.4-9.1C1.1 7.7 3.2 4.5 6.6 4.5c2 0 3.4 1.1 4.2 2.2.8-1.1 2.2-2.2 4.2-2.2 3.4 0 5.5 3.2 4 6.9-1.9 4.7-7 9.1-7 9.1Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              className="mkmpg-actionBtn"
              aria-label="مشاركة"
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title,
                      url: window.location.href,
                    });
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    window.dispatchEvent(
                      new CustomEvent("toast", {
                        detail: { message: "تم نسخ رابط المنتج" },
                      }),
                    );
                  }
                } catch {
                  //
                }
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .22 1.12L8.9 8.54A3 3 0 1 0 9 15.45l6.2 3.44A3 3 0 1 0 16.2 17L10 13.56a3.1 3.1 0 0 0 0-3.12L16.26 7A3 3 0 0 0 18 8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className="mkmpg-back"
            onClick={onBack}
            aria-label="رجوع"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 18 15 12 9 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {promotionTitle ? (
            <div className="mkmpg-badge">{promotionTitle}</div>
          ) : null}

          {total > 1 ? (
            <>
              <button
                type="button"
                className="mkmpg-nav mkmpg-nav--right"
                onClick={goPrev}
                aria-label="الصورة السابقة"
              >
                ‹
              </button>

              <button
                type="button"
                className="mkmpg-nav mkmpg-nav--left"
                onClick={goNext}
                aria-label="الصورة التالية"
              >
                ›
              </button>

              <div className="mkmpg-dots">
                {list.map((_, i) => (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    className={`mkmpg-dot ${
                      i === active ? "mkmpg-dot--active" : ""
                    }`}
                    onClick={() => setActive(i)}
                    aria-label={`الصورة ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {viewerOpen && main ? (
        <div className="mkmpg-viewer" dir="rtl">
          <button
            type="button"
            className="mkmpg-viewerBg"
            onClick={() => {
              setViewerOpen(false);
              setZoomed(false);
            }}
            aria-label="إغلاق"
          />

          <button
            type="button"
            className="mkmpg-viewerClose"
            onClick={() => {
              setViewerOpen(false);
              setZoomed(false);
            }}
            aria-label="إغلاق"
          >
            ×
          </button>

          {total > 1 ? (
            <div className="mkmpg-viewerThumbs">
              {list.map((img, i) => (
                <button
                  key={`viewer-thumb-${img}-${i}`}
                  type="button"
                  className={`mkmpg-viewerThumb ${
                    i === active ? "mkmpg-viewerThumb--active" : ""
                  }`}
                  onClick={() => {
                    setActive(i);
                    setZoomed(false);
                  }}
                  aria-label={`الصورة ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="mkmpg-viewerStage"
            onTouchStart={(e) => {
              const t = e.touches[0];
              viewerTouchStartX.current = t.clientX;
              viewerTouchStartY.current = t.clientY;
            }}
            onTouchEnd={(e) => {
              if (
                viewerTouchStartX.current == null ||
                viewerTouchStartY.current == null
              ) {
                return;
              }

              const t = e.changedTouches[0];
              const dx = t.clientX - viewerTouchStartX.current;
              const dy = t.clientY - viewerTouchStartY.current;

              if (!zoomed) {
                handleSwipe(dx, dy);
              }

              viewerTouchStartX.current = null;
              viewerTouchStartY.current = null;
            }}
          >
            {total > 1 ? (
              <>
                <button
                  type="button"
                  className="mkmpg-viewerNav mkmpg-viewerNav--right"
                  onClick={goPrev}
                  aria-label="الصورة السابقة"
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="mkmpg-viewerNav mkmpg-viewerNav--left"
                  onClick={goNext}
                  aria-label="الصورة التالية"
                >
                  ›
                </button>
              </>
            ) : null}

            <button
              type="button"
              className={`mkmpg-zoomArea ${
                zoomed ? "mkmpg-zoomArea--zoomed" : ""
              }`}
              onClick={() => setZoomed((v) => !v)}
              aria-label="تكبير أو تصغير الصورة"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={main} alt={title} className="mkmpg-viewerImg" />
            </button>

            <div className="mkmpg-zoomHint">
              {zoomed ? "اضغط للتصغير" : "اضغط على الصورة للتكبير"}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}