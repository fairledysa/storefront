// FILE: apps/storefront/src/themes/malak/screens-mobile/home/_components/MobileHero.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { useRouter } from "next/navigation";

import { startMobileNavigation } from "../../../app-navigation/mobile-navigation";

export type MobileHeroSlide = {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  image: string;
};

type Props = {
  slides: MobileHeroSlide[];
};

const SWIPE_MIN_DISTANCE = 34;
const SWIPE_LOCK_DISTANCE = 8;

const SLIDE_TRANSITION =
  "transform 420ms cubic-bezier(0.22, 0.85, 0.22, 1)";

function s(value: any) {
  return String(value ?? "").trim();
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function resolveInternalHref(rawHref: string) {
  const href = s(rawHref);

  if (!href || href === "#") return "";
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return "";
  if (href.startsWith("/")) return href;

  if (typeof window === "undefined") return "";

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return "";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, index));
}

export default function MobileHero({ slides }: Props) {
  const router = useRouter();

  const cleanSlides = useMemo(() => {
    return (Array.isArray(slides) ? slides : []).filter((slide) =>
      Boolean(s(slide?.image)),
    );
  }, [slides]);

  const total = cleanSlides.length;
  const hasMany = total > 1;
  const firstSlideImage = s(cleanSlides[0]?.image);

  const [visualIndex, setVisualIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [readyForNeighborImages, setReadyForNeighborImages] = useState(false);

  const gestureRef = useRef({
    active: false,
    source: "" as "" | "touch" | "pointer",
    pointerId: 0,
    startX: 0,
    startY: 0,
    locked: false,
    moved: false,
  });

  const clickBlockedRef = useRef(false);

  const actualIndex = clampIndex(visualIndex, total);

  useEffect(() => {
    setTransitionEnabled(false);
    setVisualIndex(0);
    setDragX(0);
    setDragging(false);
    setReadyForNeighborImages(false);

    const frame = window.requestAnimationFrame(() => {
      setTransitionEnabled(true);

      window.setTimeout(() => {
        setReadyForNeighborImages(true);
      }, 900);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [total]);

  if (!cleanSlides.length) return null;

  function blockNextClick() {
    clickBlockedRef.current = true;

    window.setTimeout(() => {
      clickBlockedRef.current = false;
    }, 280);
  }

  function goTo(index: number) {
    if (!hasMany) return;

    setReadyForNeighborImages(true);
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);
    setVisualIndex(clampIndex(index, total));
  }

  function goPrev() {
    if (!hasMany) return;

    setReadyForNeighborImages(true);
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);
    setVisualIndex((index) => clampIndex(index - 1, total));
  }

  function goNext() {
    if (!hasMany) return;

    setReadyForNeighborImages(true);
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);
    setVisualIndex((index) => clampIndex(index + 1, total));
  }

  function resetGesture() {
    gestureRef.current = {
      active: false,
      source: "",
      pointerId: 0,
      startX: 0,
      startY: 0,
      locked: false,
      moved: false,
    };
  }

  function beginGesture(args: {
    source: "touch" | "pointer";
    x: number;
    y: number;
    pointerId?: number;
  }) {
    if (!hasMany) return;

    setReadyForNeighborImages(true);

    gestureRef.current = {
      active: true,
      source: args.source,
      pointerId: args.pointerId || 0,
      startX: args.x,
      startY: args.y,
      locked: false,
      moved: false,
    };

    setDragging(true);
    setTransitionEnabled(false);
    setDragX(0);
  }

  function moveGesture(args: { x: number; y: number }) {
    const gesture = gestureRef.current;

    if (!hasMany || !gesture.active) return false;

    const dx = args.x - gesture.startX;
    const dy = args.y - gesture.startY;

    if (!gesture.locked) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < SWIPE_LOCK_DISTANCE && absY < SWIPE_LOCK_DISTANCE) {
        return false;
      }

      if (absX > absY * 1.05) {
        gesture.locked = true;
        gesture.moved = true;
      } else {
        resetGesture();
        setDragging(false);
        setDragX(0);
        return false;
      }
    }

    if (gesture.locked) {
      setDragX(dx);
      return true;
    }

    return false;
  }

  function endGesture(args: { x: number; y: number }) {
    const gesture = gestureRef.current;

    if (!hasMany || !gesture.active) {
      resetGesture();
      setDragging(false);
      setDragX(0);
      return;
    }

    const dx = args.x - gesture.startX;
    const dy = args.y - gesture.startY;

    const isHorizontalSwipe =
      Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.02;

    const moved = gesture.moved || gesture.locked || Math.abs(dx) > 8;

    resetGesture();

    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);

    if (!isHorizontalSwipe) {
      if (moved) blockNextClick();
      return;
    }

    blockNextClick();

    if (dx > 0) {
      goPrev();
    } else {
      goNext();
    }
  }

  function cancelGesture() {
    resetGesture();
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!hasMany) return;

    if (event.pointerType === "touch") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    beginGesture({
      source: "pointer",
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    });

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (gesture.source !== "pointer") return;
    if (gesture.pointerId && gesture.pointerId !== event.pointerId) return;

    const locked = moveGesture({
      x: event.clientX,
      y: event.clientY,
    });

    if (locked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (gesture.source !== "pointer") return;
    if (gesture.pointerId && gesture.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    endGesture({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (gestureRef.current.source !== "pointer") return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    cancelGesture();
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!hasMany) return;

    const touch = event.touches[0];
    if (!touch) return;

    beginGesture({
      source: "touch",
      x: touch.clientX,
      y: touch.clientY,
    });
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (gestureRef.current.source !== "touch") return;

    const touch = event.touches[0];
    if (!touch) return;

    const locked = moveGesture({
      x: touch.clientX,
      y: touch.clientY,
    });

    if (locked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (gestureRef.current.source !== "touch") return;

    const touch = event.changedTouches[0];

    if (!touch) {
      cancelGesture();
      return;
    }

    endGesture({
      x: touch.clientX,
      y: touch.clientY,
    });
  }

  function handleTouchCancel() {
    if (gestureRef.current.source !== "touch") return;
    cancelGesture();
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.defaultPrevented) return;

    if (clickBlockedRef.current || dragging) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isModifiedClick(event)) return;

    const internalHref = resolveInternalHref(href);
    if (!internalHref) return;

    event.preventDefault();

    startMobileNavigation({
      href: internalHref,
      source: "programmatic",
    });

    router.push(internalHref);
  }

  function shouldRenderSlideImage(index: number) {
    if (!hasMany) return true;

    if (index === 0) return true;
    if (index === actualIndex) return true;

    if (!readyForNeighborImages) return false;

    return index === actualIndex - 1 || index === actualIndex + 1;
  }

  const count = cleanSlides.length;
  const slideSize = 100 / Math.max(1, count);

  const trackTransform = `translate3d(calc(-${
    actualIndex * slideSize
  }% + ${dragX}px), 0, 0)`;

  return (
    <>
      {firstSlideImage ? (
        <link rel="preload" as="image" href={firstSlideImage} />
      ) : null}

      <section dir="rtl" className="mk-mhero">
        <div
          className={["mk-mhero__wrap", dragging ? "is-dragging" : ""]
            .filter(Boolean)
            .join(" ")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={
            {
              touchAction: "pan-y pinch-zoom",
            } as CSSProperties
          }
        >
          <div className="mk-mhero__swiper">
            <div className="mk-mhero__viewport" dir="ltr">
              <div
                className="mk-mhero__track"
                style={
                  {
                    width: `${count * 100}%`,
                    transform: trackTransform,
                    transition:
                      transitionEnabled && !dragging
                        ? SLIDE_TRANSITION
                        : "none",
                  } as CSSProperties
                }
              >
                {cleanSlides.map((slide, originalIndex) => {
                  const isFirst = originalIndex === 0;
                  const isActive = originalIndex === actualIndex;
                  const shouldRenderImage =
                    shouldRenderSlideImage(originalIndex);

                  return (
                    <div
                      key={slide.id || `slide-${originalIndex}`}
                      className="mk-mhero__slide"
                      dir="rtl"
                      style={
                        {
                          width: `${slideSize}%`,
                          flex: `0 0 ${slideSize}%`,
                        } as CSSProperties
                      }
                    >
                      <div className="mk-mhero__slideInner">
                        <Link
                          href={slide.href || "#"}
                          prefetch={false}
                          className="mk-mhero__link"
                          aria-label={
                            slide.title || `slide-${originalIndex + 1}`
                          }
                          draggable={false}
                          onClick={(event) =>
                            handleLinkClick(event, slide.href)
                          }
                          onDragStart={(event) => event.preventDefault()}
                        >
                          {shouldRenderImage ? (
                            <img
                              className="mk-mhero__img"
                              src={slide.image}
                              alt={slide.title || `slide-${originalIndex + 1}`}
                              loading={isFirst ? "eager" : "lazy"}
                              fetchPriority={isFirst ? "high" : "low"}
                              decoding="async"
                              width={1080}
                              height={1350}
                              sizes="100vw"
                              draggable={false}
                            />
                          ) : null}

                          <div className="mk-mhero__content" aria-hidden="true">
                            {slide.title ? (
                              <h2 className="mk-mhero__title">{slide.title}</h2>
                            ) : null}

                            {slide.description ? (
                              <p className="mk-mhero__desc">
                                {slide.description}
                              </p>
                            ) : null}

                            {slide.buttonText ? (
                              <span className="mk-mhero__button">
                                {slide.buttonText}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasMany ? (
              <div className="swiper-pagination" aria-label="شرائح العرض">
                {cleanSlides.map((slide, index) => (
                  <button
                    key={slide.id || `hero-dot-${index}`}
                    type="button"
                    className={[
                      "swiper-pagination-bullet",
                      index === actualIndex
                        ? "swiper-pagination-bullet-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={`عرض الشريحة ${index + 1}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onTouchStart={(event) => event.stopPropagation()}
                    onClick={() => goTo(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}