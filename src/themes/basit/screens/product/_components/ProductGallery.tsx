// FILE: apps/storefront/src/themes/basit/screens/product/_components/ProductGallery.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  images?: string[];

  productName?: string;
  imageAlts?: Array<string | null | undefined>;

  activateZoom?: boolean;
  desktopThumbsPosition?: "bottom" | "side";
  thumbsBottom?: boolean;
  hideMobileThumbs?: boolean;
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
    if (!clean || seen.has(clean)) continue;

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
  desktopThumbsPosition,
  thumbsBottom = true,
  hideMobileThumbs = false,
  objectFit = "contain",
  fit,
  zoomEnabled,
  showThumbs,
}: Props) {
  const finalFit = fit ?? objectFit ?? "contain";
  const finalZoomEnabled = zoomEnabled !== false && activateZoom !== false;
  const finalShowThumbs = showThumbs ?? true;
  const finalDesktopThumbsPosition =
    desktopThumbsPosition === "side" || thumbsBottom === false
      ? "side"
      : "bottom";

  const safeImages = useMemo(() => {
    const raw = Array.isArray(images)
      ? images.map((x) => s(x)).filter(Boolean)
      : [];

    return normalizeImages(raw);
  }, [images]);

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [hoverOrigin, setHoverOrigin] = useState({ x: 50, y: 50 });

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

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const total = safeImages.length;
  const activeImage = safeImages[active] ?? safeImages[0] ?? null;
  const previewImages = useMemo(() => safeImages.slice(0, 4), [safeImages]);
  const remaining = Math.max(0, safeImages.length - previewImages.length);

  const effectiveZoomEnabled = finalZoomEnabled && isDesktopViewport;
  const showLightboxThumbs = isDesktopViewport
    ? finalShowThumbs
    : !hideMobileThumbs;

  function getAlt(index: number) {
    return buildImageAlt({ productName, imageAlts, index });
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDragging(false);
  }

  function selectImage(index: number) {
    setActive(clampIndex(index, total));
    resetZoom();
  }

  function openLightbox(index: number) {
    selectImage(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    resetZoom();
  }

  function goNext() {
    setActive((index) => clampIndex(index + 1, total));
    resetZoom();
  }

  function goPrev() {
    setActive((index) => clampIndex(index - 1, total));
    resetZoom();
  }

  function zoomIn() {
    if (!effectiveZoomEnabled) return;
    setZoom((current) => clampZoom(current + 0.6));
  }

  function zoomOut() {
    if (!effectiveZoomEnabled) return;

    setZoom((current) => {
      const next = clampZoom(current - 0.6);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function toggleZoom() {
    if (!effectiveZoomEnabled) return;

    setZoom((current) => {
      if (current > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }

      return 2.8;
    });
  }

  useEffect(() => {
    if (active > total - 1) setActive(0);
  }, [active, total]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const sync = () => setIsDesktopViewport(media.matches);

    sync();
    media.addEventListener?.("change", sync);

    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") goPrev();
      if (event.key === "ArrowLeft") goNext();

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
      }

      if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      }

      if (event.key === "0") {
        event.preventDefault();
        resetZoom();
      }

      if (event.key === " ") {
        event.preventDefault();
        toggleZoom();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, total, effectiveZoomEnabled]);

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!effectiveZoomEnabled) return;

    event.preventDefault();
    event.stopPropagation();

    const delta = event.deltaY > 0 ? -0.3 : 0.3;

    setZoom((current) => {
      const next = clampZoom(current + delta);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!effectiveZoomEnabled || zoom <= 1) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };

    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!effectiveZoomEnabled || !dragging || zoom <= 1) return;

    event.preventDefault();
    event.stopPropagation();

    setPan({
      x: dragStartRef.current.panX + event.clientX - dragStartRef.current.startX,
      y: dragStartRef.current.panY + event.clientY - dragStartRef.current.startY,
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;

    event.preventDefault();
    event.stopPropagation();

    try {
      event.currentTarget.releasePointerCapture(dragStartRef.current.pointerId);
    } catch {}

    setDragging(false);
  }

  function handleHoverMove(event: React.MouseEvent<HTMLElement>) {
    if (!effectiveZoomEnabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setHoverOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  }

  function handleMobileTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleMobileTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;

    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx > 0) goPrev();
    else goNext();
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
      <div
        className={[
          "mkpg-wrap",
          fitClass,
          effectiveZoomEnabled ? "mkpg--zoom-enabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        dir="rtl"
      >
        <div className="mkpg-desktop">
          {finalShowThumbs ? (
            <div
              className={`mkpg-classic mkpg-classic--${finalDesktopThumbsPosition}`}
              data-thumbnails-position={finalDesktopThumbsPosition}
            >
              <button
                type="button"
                className="mkpg-main"
                onClick={() => openLightbox(active)}
                onMouseMove={handleHoverMove}
                aria-label={`عرض ${getAlt(active)}`}
              >
                <img
                  src={activeImage ?? ""}
                  alt={getAlt(active)}
                  className="mkpg-img mkpg-main__img"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%`,
                  }}
                />

                {total > 1 ? (
                  <span className="mkpg-main__count">
                    {active + 1}/{total}
                  </span>
                ) : null}
              </button>

              {total > 1 ? (
                <div className="mkpg-thumbs" aria-label="صور المنتج">
                  {safeImages.map((image, index) => (
                    <button
                      key={`desktop-thumb-${image}-${index}`}
                      type="button"
                      className={`mkpg-thumb ${active === index ? "is-active" : ""}`}
                      onClick={() => selectImage(index)}
                      aria-label={`اختيار ${getAlt(index)}`}
                    >
                      <img src={image} alt={getAlt(index)} loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : total === 1 ? (
            <button
              type="button"
              className="mkpg-single"
              onClick={() => openLightbox(0)}
              onMouseMove={handleHoverMove}
              aria-label={`عرض ${getAlt(0)}`}
            >
              <img
                src={safeImages[0]}
                alt={getAlt(0)}
                className="mkpg-img"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                style={{
                  transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%`,
                }}
              />
            </button>
          ) : (
            <div
              className={`mkpg-grid mkpg-grid--count-${Math.min(
                previewImages.length,
                4,
              )}`}
            >
              {previewImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className="mkpg-tile"
                  onClick={() => openLightbox(index)}
                  aria-label={`عرض ${getAlt(index)}`}
                >
                  <img
                    src={image}
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

        <div className="mkpg-mobile">
          <div
            className="mkpg-mobile-main"
            onTouchStart={handleMobileTouchStart}
            onTouchEnd={handleMobileTouchEnd}
          >
            <button
              type="button"
              className="mkpg-mobile-imageButton"
              onClick={() => openLightbox(active)}
              aria-label={`عرض ${getAlt(active)}`}
            >
              <img
                src={activeImage ?? ""}
                alt={getAlt(active)}
                className="mkpg-img"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </button>

            {total > 1 ? (
              <>
                <button
                  type="button"
                  className="mkpg-mobile-nav mkpg-mobile-nav--prev"
                  onClick={goPrev}
                  aria-label="الصورة السابقة"
                >
                  ›
                </button>
                <button
                  type="button"
                  className="mkpg-mobile-nav mkpg-mobile-nav--next"
                  onClick={goNext}
                  aria-label="الصورة التالية"
                >
                  ‹
                </button>
              </>
            ) : null}
          </div>

          {total > 1 ? (
            hideMobileThumbs ? (
              <div className="mkpg-dots" aria-label="مؤشر صور المنتج">
                {safeImages.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    type="button"
                    className={`mkpg-dot ${active === index ? "is-active" : ""}`}
                    onClick={() => selectImage(index)}
                    aria-label={`الصورة ${index + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="mkpg-mobile-thumbs" aria-label="صور المنتج">
                {safeImages.map((image, index) => (
                  <button
                    key={`mobile-thumb-${image}-${index}`}
                    type="button"
                    className={`mkpg-mobile-thumb ${active === index ? "is-active" : ""}`}
                    onClick={() => selectImage(index)}
                    aria-label={`اختيار ${getAlt(index)}`}
                  >
                    <img src={image} alt={getAlt(index)} loading="lazy" />
                  </button>
                ))}
              </div>
            )
          ) : null}
        </div>
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

          {effectiveZoomEnabled ? (
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

          <div
            className={[
              "mkpg-lightbox-inner",
              showLightboxThumbs && total > 1 ? "has-thumbs" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {showLightboxThumbs && total > 1 ? (
              <div className="mkpg-lightbox-thumbs">
                {safeImages.map((image, index) => (
                  <button
                    key={`lb-thumb-${image}-${index}`}
                    type="button"
                    className={`mkpg-lightbox-thumb ${
                      active === index ? "mkpg-lightbox-thumb--active" : ""
                    }`}
                    onClick={() => selectImage(index)}
                    aria-label={`اختيار ${getAlt(index)}`}
                  >
                    <img
                      src={image}
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
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleZoom();
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {total > 1 ? (
                <>
                  <button
                    type="button"
                    className="mkpg-nav mkpg-nav--prev"
                    onClick={(event) => {
                      event.stopPropagation();
                      goPrev();
                    }}
                    aria-label="الصورة السابقة"
                  >
                    ›
                  </button>

                  <button
                    type="button"
                    className="mkpg-nav mkpg-nav--next"
                    onClick={(event) => {
                      event.stopPropagation();
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
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleZoom();
                }}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                }}
              />
            </div>
          </div>

          {effectiveZoomEnabled ? (
            <div className="mkpg-lightbox-hint">
              اضغط على الصورة للتكبير — عجلة الماوس للتكبير — اسحب الصورة بعد التكبير
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
