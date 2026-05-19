// FILE: apps/storefront/src/themes/malak/screens/product/_components/ProductGallery.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images?: string[];

  productName?: string;
  imageAlts?: Array<string | null | undefined>;

  activateZoom?: boolean;
  thumbsBottom?: boolean;
  objectFit?: "cover" | "contain" | "fill";

  fit?: "cover" | "contain" | "fill";
  zoomEnabled?: boolean;
  showThumbs?: boolean;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function cleanAlt(value: unknown) {
  return s(value).replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
}

function normalizeImages(images: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const img of images) {
    const clean = s(img);
    if (!clean) continue;
    if (seen.has(clean)) continue;

    seen.add(clean);
    out.push(clean);
  }

  return out;
}

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0;
  if (index < 0) return total - 1;
  if (index >= total) return 0;
  return index;
}

function clampZoom(value: number) {
  return Math.max(1, Math.min(5, Number(value || 1)));
}

function buildImageAlt(args: {
  productName?: string;
  imageAlts?: Array<string | null | undefined>;
  index: number;
}) {
  const directAlt = cleanAlt(args.imageAlts?.[args.index]);
  if (directAlt) return directAlt;

  const name = cleanAlt(args.productName);

  if (name) {
    return args.index === 0 ? name : `${name} - صورة ${args.index + 1}`;
  }

  return args.index === 0 ? "صورة المنتج" : `صورة المنتج ${args.index + 1}`;
}

export default function ProductGallery({
  images = [],

  productName,
  imageAlts,

  activateZoom = true,
  thumbsBottom = true,
  objectFit = "contain",

  fit,
  zoomEnabled,
  showThumbs,
}: Props) {
  const finalFit = fit ?? objectFit ?? "contain";
  const finalZoomEnabled = zoomEnabled !== false && activateZoom !== false;
  const finalShowThumbs = showThumbs ?? thumbsBottom ?? true;

  const safeImages = useMemo(() => {
    const raw = Array.isArray(images)
      ? images.map((x) => s(x)).filter(Boolean)
      : [];

    return normalizeImages(raw);
  }, [images]);

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragStartRef = useRef({
    pointerId: 0,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  });

  const total = safeImages.length;
  const activeImage = safeImages[active] ?? safeImages[0] ?? null;

  const previewImages = useMemo(() => safeImages.slice(0, 4), [safeImages]);
  const remaining = Math.max(0, safeImages.length - previewImages.length);

  function getAlt(index: number) {
    return buildImageAlt({
      productName,
      imageAlts,
      index,
    });
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  function openLightbox(index: number) {
    setActive(clampIndex(index, total));
    resetZoom();
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    resetZoom();
  }

  function goNext() {
    setActive((i) => clampIndex(i + 1, total));
    resetZoom();
  }

  function goPrev() {
    setActive((i) => clampIndex(i - 1, total));
    resetZoom();
  }

  function zoomIn() {
    if (!finalZoomEnabled) return;
    setZoom((current) => clampZoom(current + 0.6));
  }

  function zoomOut() {
    if (!finalZoomEnabled) return;

    setZoom((current) => {
      const next = clampZoom(current - 0.6);

      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      }

      return next;
    });
  }

  function toggleZoom() {
    if (!finalZoomEnabled) return;

    setZoom((current) => {
      if (current > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }

      return 2.8;
    });
  }

  useEffect(() => {
    if (active > total - 1) {
      setActive(0);
    }
  }, [active, total]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goPrev();
      if (e.key === "ArrowLeft") goNext();

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      }

      if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      }

      if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }

      if (e.key === " ") {
        e.preventDefault();
        toggleZoom();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, total, finalZoomEnabled]);

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!finalZoomEnabled) return;

    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -0.3 : 0.3;

    setZoom((current) => {
      const next = clampZoom(current + delta);

      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      }

      return next;
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!finalZoomEnabled || zoom <= 1) return;

    e.preventDefault();
    e.stopPropagation();

    e.currentTarget.setPointerCapture(e.pointerId);

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };

    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!finalZoomEnabled || !dragging || zoom <= 1) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.releasePointerCapture(dragStartRef.current.pointerId);
    } catch {}

    setDragging(false);
  }

  if (!total) {
    return (
      <div className="mkpg-empty" dir="rtl">
        لا توجد صور للمنتج
      </div>
    );
  }

  const fitClass =
    finalFit === "cover"
      ? "mkpg--fit-cover"
      : finalFit === "fill"
        ? "mkpg--fit-fill"
        : "mkpg--fit-contain";

  return (
    <>
      <div className={`mkpg-wrap ${fitClass}`} dir="rtl">
        {safeImages.length === 1 ? (
          <button
            type="button"
            className="mkpg-single"
            onClick={() => openLightbox(0)}
            aria-label={`عرض ${getAlt(0)}`}
          >
            <img
              src={safeImages[0]}
              alt={getAlt(0)}
              className="mkpg-img"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </button>
        ) : (
          <div
            className={`mkpg-grid mkpg-grid--count-${Math.min(
              previewImages.length,
              4,
            )}`}
          >
            {previewImages.map((img, index) => (
              <button
                key={`${img}-${index}`}
                type="button"
                className="mkpg-tile"
                onClick={() => openLightbox(index)}
                aria-label={`عرض ${getAlt(index)}`}
              >
                <img
                  src={img}
                  alt={getAlt(index)}
                  className="mkpg-img"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                />

                {index === 3 && remaining > 0 ? (
                  <div className="mkpg-more">
                    <span>+{remaining}</span>
                    <small>صور أكثر</small>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && activeImage ? (
        <div className="mkpg-lightbox" dir="rtl">
          <button
            type="button"
            className="mkpg-lightbox-bg"
            onClick={closeLightbox}
            aria-label="إغلاق"
          />

          <button
            type="button"
            className="mkpg-close"
            onClick={closeLightbox}
            aria-label="إغلاق"
          >
            ×
          </button>

          {finalZoomEnabled ? (
            <div className="mkpg-zoom-tools" dir="ltr">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 1}
                aria-label="تصغير"
              >
                −
              </button>

              <button type="button" onClick={toggleZoom} aria-label="تكبير">
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 5}
                aria-label="تكبير"
              >
                +
              </button>
            </div>
          ) : null}

          <div className="mkpg-lightbox-inner">
            {finalShowThumbs && total > 1 ? (
              <div className="mkpg-lightbox-thumbs">
                {safeImages.map((img, index) => (
                  <button
                    key={`lb-thumb-${img}-${index}`}
                    type="button"
                    className={`mkpg-lightbox-thumb ${
                      active === index ? "mkpg-lightbox-thumb--active" : ""
                    }`}
                    onClick={() => {
                      setActive(index);
                      resetZoom();
                    }}
                    aria-label={`اختيار ${getAlt(index)}`}
                  >
                    <img
                      src={img}
                      alt={getAlt(index)}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <div
              className={`mkpg-lightbox-image-wrap ${
                zoom > 1 ? "mkpg-lightbox-image-wrap--zoomed" : ""
              } ${dragging ? "mkpg-lightbox-image-wrap--dragging" : ""}`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleZoom();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {total > 1 ? (
                <>
                  <button
                    type="button"
                    className="mkpg-nav mkpg-nav--prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    aria-label="الصورة السابقة"
                  >
                    ›
                  </button>

                  <button
                    type="button"
                    className="mkpg-nav mkpg-nav--next"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    aria-label="الصورة التالية"
                  >
                    ‹
                  </button>
                </>
              ) : null}

              <img
                src={activeImage}
                alt={getAlt(active)}
                draggable={false}
                className="mkpg-lightbox-img"
                loading="eager"
                decoding="async"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleZoom();
                }}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                }}
              />
            </div>
          </div>

          {finalZoomEnabled ? (
            <div className="mkpg-lightbox-hint">
              اضغط على الصورة للتكبير — عجلة الماوس للتكبير — اسحب الصورة بعد التكبير
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}