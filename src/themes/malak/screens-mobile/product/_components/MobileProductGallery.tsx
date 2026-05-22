// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductGallery.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SquareArrowRight02 from "@/components/icon/huge/SquareArrowRight02";
type Props = {
  images?: string[];
  productName?: string | null;
  imageAlts?: Array<string | null | undefined>;
  activateZoom?: boolean;
  thumbsBottom?: boolean;
  objectFit?: "cover" | "contain" | "fill" | string;
  backHref?: string | null;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function normalizeFit(value: any): "cover" | "contain" | "fill" {
  const fit = s(value).toLowerCase();
  if (fit === "contain" || fit === "fill" || fit === "cover") return fit;
  return "cover";
}

function normalizeImages(images: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const image of images) {
    const clean = s(image);
    if (!clean) continue;
    if (seen.has(clean)) continue;

    seen.add(clean);
    out.push(clean);
  }

  return out;
}

export default function MobileProductGallery({
  images = [],
  productName = null,
  imageAlts = [],
  activateZoom = false,
  thumbsBottom = true,
  objectFit = "cover",
  backHref = null,
}: Props) {
  const router = useRouter();

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    pointerId: 0,
  });

  const blockClickRef = useRef(false);

  const cleanImages = useMemo(() => {
    return normalizeImages(Array.isArray(images) ? images : []);
  }, [images]);

  const fitMode = normalizeFit(objectFit);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const total = cleanImages.length;
  const hasImages = total > 0;
  const hasMany = total > 1;

  const currentImage = cleanImages[activeIndex] || cleanImages[0] || "";

  const currentAlt =
    s(imageAlts?.[activeIndex]) ||
    s(productName) ||
    `صورة المنتج ${activeIndex + 1}`;

  const progress = total > 0 ? ((activeIndex + 1) / total) * 100 : 0;

  useEffect(() => {
    if (activeIndex > total - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, total]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") goPrev();
      if (event.key === "ArrowLeft") goNext();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, total]);

  function goPrev() {
    if (!hasMany) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }

  function goNext() {
    if (!hasMany) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }

  function handleBack() {
    const fallbackHref = s(backHref) || "/";

    if (typeof window === "undefined") {
      router.push(fallbackHref);
      return;
    }

    const referrer = s(document.referrer);

    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const currentUrl = new URL(window.location.href);

        if (referrerUrl.origin === currentUrl.origin) {
          router.back();
          return;
        }
      } catch {
        //
      }
    }

    router.push(fallbackHref);
  }

  function openZoom() {
    if (blockClickRef.current) return;
    if (!activateZoom || !hasImages) return;
    setLightboxOpen(true);
  }

  function closeZoom() {
    setLightboxOpen(false);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!hasMany) return;

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      //
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    dragRef.current.active = false;

    try {
      event.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    } catch {
      //
    }

    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;

    blockClickRef.current = true;
    window.setTimeout(() => {
      blockClickRef.current = false;
    }, 120);

    if (dx > 0) {
      goPrev();
    } else {
      goNext();
    }
  }

  if (!hasImages) {
    return (
      <section className="mk-mpg" dir="rtl">
        <div className="mk-mpg-stage mk-mpg-stage--empty">
          <div className="mk-mpg-header">
            <button
              type="button"
              className="mk-mpg-header__back"
              aria-label="رجوع"
              onClick={handleBack}
            >
             <SquareArrowRight02 className="mk-mpg-backIcon" aria-hidden="true" />
            </button>

            <div className="mk-mpg-header__title">
              <span>{s(productName) || "المنتج"}</span>
            </div>
          </div>

          <div className="mk-mpg-empty">لا توجد صور للمنتج</div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        dir="rtl"
        className={[
          "mk-mpg",
          `mk-mpg--fit-${fitMode}`,
          thumbsBottom ? "mk-mpg--thumbs" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className="mk-mpg-stage"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current.active = false;
          }}
        >
          <div className="mk-mpg-header">
            <button
              type="button"
              className="mk-mpg-header__back"
              aria-label="رجوع"
              onClick={handleBack}
            >
              <SquareArrowRight02 className="mk-mpg-backIcon" aria-hidden="true" />
            </button>

            <div className="mk-mpg-header__title">
              <span>{s(productName) || "المنتج"}</span>
            </div>
          </div>

          <button
            type="button"
            className={[
              "mk-mpg-stage__button",
              activateZoom ? "is-zoomable" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={openZoom}
            aria-label={activateZoom ? "فتح الصورة" : currentAlt}
          >
            <img
              src={currentImage}
              alt={currentAlt}
              className="mk-mpg-stage__img"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
            />
          </button>

          {hasMany ? (
            <div className="mk-mpg-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          ) : null}

          <div className="mk-mpg-counter">
            {activeIndex + 1}/{total}
          </div>
        </div>

        {thumbsBottom && hasMany ? (
          <div className="mk-mpg-thumbs" aria-label="صور المنتج">
            {cleanImages.map((image, index) => {
              const thumbAlt =
                s(imageAlts?.[index]) ||
                s(productName) ||
                `صورة المنتج ${index + 1}`;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={[
                    "mk-mpg-thumb",
                    index === activeIndex ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`عرض الصورة ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={thumbAlt}
                    className="mk-mpg-thumb__img"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {lightboxOpen ? (
        <div className="mk-mpg-lightbox" role="dialog" aria-modal="true">
          <button
            type="button"
            className="mk-mpg-lightbox__backdrop"
            aria-label="إغلاق"
            onClick={closeZoom}
          />

          <button
            type="button"
            className="mk-mpg-lightbox__close"
            aria-label="إغلاق"
            onClick={closeZoom}
          >
            ×
          </button>

          {hasMany ? (
            <>
              <button
                type="button"
                className="mk-mpg-lightbox__nav mk-mpg-lightbox__nav--prev"
                aria-label="السابق"
                onClick={goPrev}
              >
                ‹
              </button>

              <button
                type="button"
                className="mk-mpg-lightbox__nav mk-mpg-lightbox__nav--next"
                aria-label="التالي"
                onClick={goNext}
              >
                ›
              </button>
            </>
          ) : null}

          <div className="mk-mpg-lightbox__content">
            <img
              src={currentImage}
              alt={currentAlt}
              className="mk-mpg-lightbox__img"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </div>

          <div className="mk-mpg-lightbox__counter">
            {activeIndex + 1}/{total}
          </div>
        </div>
      ) : null}
    </>
  );
}