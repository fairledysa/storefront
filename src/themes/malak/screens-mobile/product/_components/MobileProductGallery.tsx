// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductGallery.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

  if (fit === "contain" || fit === "fill" || fit === "cover") {
    return fit;
  }

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

  const cleanImages = useMemo(() => {
    const rows = Array.isArray(images) ? images : [];
    return normalizeImages(rows);
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
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }

      if (event.key === "ArrowRight") {
        goPrev();
      }

      if (event.key === "ArrowLeft") {
        goNext();
      }
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
    if (!activateZoom || !hasImages) return;
    setLightboxOpen(true);
  }

  function closeZoom() {
    setLightboxOpen(false);
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
              ←
            </button>

            <div className="mk-mpg-header__title">
              <span>{s(productName) || "المنتج"}</span>
            </div>

            <div className="mk-mpg-header__spacer" />
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
        <div className="mk-mpg-stage">
          <div className="mk-mpg-header">
            <button
              type="button"
              className="mk-mpg-header__back"
              aria-label="رجوع"
              onClick={handleBack}
            >
              ←
            </button>

            <div className="mk-mpg-header__title">
              <span>{s(productName) || "المنتج"}</span>
            </div>

            <div className="mk-mpg-header__spacer" />
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
            />
          </button>

          {hasMany ? (
            <>
              <button
                type="button"
                className="mk-mpg-nav mk-mpg-nav--prev"
                aria-label="الصورة السابقة"
                onClick={goPrev}
              >
                ‹
              </button>

              <button
                type="button"
                className="mk-mpg-nav mk-mpg-nav--next"
                aria-label="الصورة التالية"
                onClick={goNext}
              >
                ›
              </button>
            </>
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