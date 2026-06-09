// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductGallery.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SquareArrowRight02 from "@/components/icon/huge/SquareArrowRight02";
import { startMobileNavigation } from "../../../app-navigation/mobile-navigation";

type LightboxTransform = {
  scale: number;
  x: number;
  y: number;
};

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

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const lightboxStageRef = useRef<HTMLDivElement | null>(null);
  const lightboxPointersRef = useRef(
    new Map<number, { x: number; y: number; startX: number; startY: number }>(),
  );
  const lightboxGestureRef = useRef({
    mode: "idle" as "idle" | "pan" | "swipe" | "pinch",
    pointerId: 0,
    startX: 0,
    startY: 0,
    startTransform: { scale: 1, x: 0, y: 0 } as LightboxTransform,
    startDistance: 0,
    startMidpoint: { x: 0, y: 0 },
  });
  const lightboxTransformRef = useRef<LightboxTransform>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const cleanImages = useMemo(() => {
    return normalizeImages(Array.isArray(images) ? images : []);
  }, [images]);

  const fitMode = normalizeFit(objectFit);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTransform, setLightboxTransform] =
    useState<LightboxTransform>({
      scale: 1,
      x: 0,
      y: 0,
    });

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
    const href = s(backHref);
    if (!href) return;

    try {
      router.prefetch(href);
    } catch {
      // ignore
    }
  }, [backHref, router]);

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

  useEffect(() => {
    if (!lightboxOpen) return;

    resetLightboxTransform();
    lightboxPointersRef.current.clear();
    lightboxGestureRef.current.mode = "idle";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, lightboxOpen]);

  function getClampedTransform(next: LightboxTransform) {
    const scale = clamp(next.scale, 1, 4);
    const rect = lightboxStageRef.current?.getBoundingClientRect();

    if (!rect || scale <= 1.01) {
      return { scale, x: 0, y: 0 };
    }

    const maxX = (rect.width * (scale - 1)) / 2;
    const maxY = (rect.height * (scale - 1)) / 2;

    return {
      scale,
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  }

  function setLightboxTransformSafe(next: LightboxTransform) {
    const clamped = getClampedTransform(next);
    lightboxTransformRef.current = clamped;
    setLightboxTransform(clamped);
  }

  function resetLightboxTransform() {
    setLightboxTransformSafe({ scale: 1, x: 0, y: 0 });
  }

  function goPrev() {
    if (!hasMany) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }

  function goNext() {
    if (!hasMany) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }

  function handleBack() {
    const href = s(backHref) || "/";

    startMobileNavigation({
      href,
      source: "programmatic",
    });

    router.push(href);
  }

  function openZoom() {
    if (blockClickRef.current) return;
    if (!hasImages) return;

    setLightboxOpen(true);
  }

  function closeZoom() {
    resetLightboxTransform();
    setLightboxOpen(false);
  }

  function toggleDoubleTapZoom(clientX: number, clientY: number) {
    const current = lightboxTransformRef.current;

    if (current.scale > 1.01) {
      resetLightboxTransform();
      return;
    }

    const rect = lightboxStageRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : clientX;
    const centerY = rect ? rect.top + rect.height / 2 : clientY;

    setLightboxTransformSafe({
      scale: 2.45,
      x: (centerX - clientX) * 0.55,
      y: (centerY - clientY) * 0.55,
    });
  }

  function handleLightboxPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();

    const pointers = lightboxPointersRef.current;
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    });

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      //
    }

    if (pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values());

      lightboxGestureRef.current = {
        mode: "pinch",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTransform: lightboxTransformRef.current,
        startDistance: Math.max(1, distance(a, b)),
        startMidpoint: midpoint(a, b),
      };

      return;
    }

    const current = lightboxTransformRef.current;

    lightboxGestureRef.current = {
      mode: current.scale > 1.01 ? "pan" : "swipe",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTransform: current,
      startDistance: 0,
      startMidpoint: { x: event.clientX, y: event.clientY },
    };
  }

  function handleLightboxPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const pointers = lightboxPointersRef.current;
    const point = pointers.get(event.pointerId);
    if (!point) return;

    point.x = event.clientX;
    point.y = event.clientY;

    const gesture = lightboxGestureRef.current;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.mode === "pinch" && pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values());
      const nextDistance = Math.max(1, distance(a, b));
      const nextMidpoint = midpoint(a, b);
      const ratio = nextDistance / Math.max(1, gesture.startDistance);

      setLightboxTransformSafe({
        scale: gesture.startTransform.scale * ratio,
        x:
          gesture.startTransform.x +
          (nextMidpoint.x - gesture.startMidpoint.x),
        y:
          gesture.startTransform.y +
          (nextMidpoint.y - gesture.startMidpoint.y),
      });

      return;
    }

    if (gesture.mode === "pan") {
      setLightboxTransformSafe({
        scale: gesture.startTransform.scale,
        x: gesture.startTransform.x + dx,
        y: gesture.startTransform.y + dy,
      });
    }
  }

  function handleLightboxTap(event: React.PointerEvent<HTMLDivElement>) {
    const now = Date.now();
    const last = lastTapRef.current;
    const tapDistance = Math.hypot(event.clientX - last.x, event.clientY - last.y);

    if (now - last.time < 300 && tapDistance < 34) {
      toggleDoubleTapZoom(event.clientX, event.clientY);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    lastTapRef.current = {
      time: now,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleLightboxPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const pointers = lightboxPointersRef.current;
    const point = pointers.get(event.pointerId);
    const gesture = lightboxGestureRef.current;

    pointers.delete(event.pointerId);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      //
    }

    if (!point) return;

    if (gesture.mode === "pinch") {
      if (pointers.size === 1) {
        const [remaining] = Array.from(pointers.values());

        lightboxGestureRef.current = {
          mode: lightboxTransformRef.current.scale > 1.01 ? "pan" : "swipe",
          pointerId: event.pointerId,
          startX: remaining.x,
          startY: remaining.y,
          startTransform: lightboxTransformRef.current,
          startDistance: 0,
          startMidpoint: { x: remaining.x, y: remaining.y },
        };
      } else {
        lightboxGestureRef.current.mode = "idle";
      }

      return;
    }

    const dx = event.clientX - point.startX;
    const dy = event.clientY - point.startY;
    const scale = lightboxTransformRef.current.scale;

    if (gesture.mode === "swipe" && scale <= 1.01) {
      if (hasMany && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx > 0) {
          goPrev();
        } else {
          goNext();
        }

        return;
      }

      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        handleLightboxTap(event);
      }
    } else if (gesture.mode === "pan" && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      handleLightboxTap(event);
    }

    if (pointers.size === 0) {
      lightboxGestureRef.current.mode = "idle";
    }
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
              <SquareArrowRight02
                className="mk-mpg-backIcon"
                aria-hidden="true"
              />
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
              <SquareArrowRight02
                className="mk-mpg-backIcon"
                aria-hidden="true"
              />
            </button>

            <div className="mk-mpg-header__title">
              <span>{s(productName) || "المنتج"}</span>
            </div>
          </div>

          <button
            type="button"
            className={[
              "mk-mpg-stage__button",
              activateZoom || hasImages ? "is-zoomable" : "",
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
              loading={activeIndex === 0 ? "eager" : "lazy"}
              fetchPriority={activeIndex === 0 ? "high" : "low"}
              decoding="async"
              draggable={false}
              width={900}
              height={1100}
              sizes="100vw"
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
                    fetchPriority="low"
                    decoding="async"
                    draggable={false}
                    width={96}
                    height={96}
                    sizes="72px"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {lightboxOpen ? (
        <div
          className="mk-mobile-gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="عارض صور المنتج"
        >
          <button
            type="button"
            className="mk-mobile-gallery-lightbox__backdrop"
            aria-label="إغلاق"
            onClick={closeZoom}
          />

          <button
            type="button"
            className="mk-mobile-gallery-lightbox__close"
            aria-label="إغلاق"
            onClick={closeZoom}
          >
            ×
          </button>

          {hasMany ? (
            <>
              <button
                type="button"
                className="mk-mobile-gallery-lightbox__nav mk-mobile-gallery-lightbox__nav--prev"
                aria-label="السابق"
                onClick={() => {
                  if (lightboxTransform.scale > 1.01) return;
                  goPrev();
                }}
              >
                ‹
              </button>

              <button
                type="button"
                className="mk-mobile-gallery-lightbox__nav mk-mobile-gallery-lightbox__nav--next"
                aria-label="التالي"
                onClick={() => {
                  if (lightboxTransform.scale > 1.01) return;
                  goNext();
                }}
              >
                ›
              </button>
            </>
          ) : null}

          <div
            ref={lightboxStageRef}
            className={[
              "mk-mobile-gallery-lightbox__stage",
              lightboxTransform.scale > 1.01 ? "is-zoomed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={handleLightboxPointerDown}
            onPointerMove={handleLightboxPointerMove}
            onPointerUp={handleLightboxPointerUp}
            onPointerCancel={handleLightboxPointerUp}
          >
            <img
              src={currentImage}
              alt={currentAlt}
              className="mk-mobile-gallery-lightbox__image"
              style={{
                transform: `translate3d(${lightboxTransform.x}px, ${lightboxTransform.y}px, 0) scale(${lightboxTransform.scale})`,
              }}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              width={1100}
              height={1400}
              sizes="100vw"
            />
          </div>

          <div className="mk-mobile-gallery-lightbox__counter">
            {activeIndex + 1} / {total}
          </div>

          {hasMany ? (
            <div
              className="mk-mobile-gallery-lightbox__dots"
              aria-label="صور المنتج"
            >
              {cleanImages.map((image, index) => (
                <button
                  key={`lightbox-dot-${image}-${index}`}
                  type="button"
                  className={[
                    "mk-mobile-gallery-lightbox__dot",
                    index === activeIndex ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`عرض الصورة ${index + 1}`}
                  onClick={() => {
                    if (lightboxTransform.scale > 1.01) return;
                    setActiveIndex(index);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
