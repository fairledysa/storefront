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

const SWIPE_MIN_DISTANCE = 36;
const SWIPE_LOCK_DISTANCE = 10;
const AUTOPLAY_DELAY = 4200;
const RESUME_AFTER_INTERACTION = 5200;
const SNAP_AFTER_MS = 460;

const SLIDE_TRANSITION =
  "transform 420ms cubic-bezier(0.22, 0.85, 0.22, 1)";

function s(value: any) {
  return String(value ?? "").trim();
}

function cssUrl(value: any) {
  const url = s(value);
  if (!url) return "none";

  return `url(${JSON.stringify(url)})`;
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

function normalizeIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
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

  const renderSlides = useMemo(() => {
    if (!cleanSlides.length) return [];

    if (!hasMany) {
      return cleanSlides.map((slide, index) => ({
        key: slide.id || `slide-${index}`,
        slide,
        originalIndex: index,
      }));
    }

    const first = cleanSlides[0];
    const last = cleanSlides[cleanSlides.length - 1];

    return [
      {
        key: `clone-last-${last.id || "last"}`,
        slide: last,
        originalIndex: total - 1,
      },
      ...cleanSlides.map((slide, index) => ({
        key: slide.id || `slide-${index}`,
        slide,
        originalIndex: index,
      })),
      {
        key: `clone-first-${first.id || "first"}`,
        slide: first,
        originalIndex: 0,
      },
    ];
  }, [cleanSlides, hasMany, total]);

  const [visualIndex, setVisualIndex] = useState(hasMany ? 1 : 0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const resumeTimerRef = useRef<number | null>(null);
  const snapTimerRef = useRef<number | null>(null);

  const pointerRef = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    startY: 0,
    locked: false,
    moved: false,
  });

  const clickBlockedRef = useRef(false);

  const actualIndex = hasMany ? normalizeIndex(visualIndex - 1, total) : 0;

  useEffect(() => {
    setTransitionEnabled(false);
    setVisualIndex(hasMany ? 1 : 0);
    setDragX(0);
    setDragging(false);

    const frame = window.requestAnimationFrame(() => {
      setTransitionEnabled(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasMany, total]);

  useEffect(() => {
    cleanSlides.slice(0, 3).forEach((slide) => {
      const href = resolveInternalHref(slide.href);

      if (!href) return;

      try {
        router.prefetch(href);
      } catch {
        // ignore
      }
    });
  }, [cleanSlides, router]);

  useEffect(() => {
    if (!hasMany || paused || dragging) return;

    const timer = window.setInterval(() => {
      setTransitionEnabled(true);
      setDragX(0);

      setVisualIndex((index) => {
        if (index >= total + 1) return 1;
        return index + 1;
      });
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [dragging, hasMany, paused, total]);

  useEffect(() => {
    if (!hasMany) return;
    if (visualIndex !== 0 && visualIndex !== total + 1) return;

    if (snapTimerRef.current) {
      window.clearTimeout(snapTimerRef.current);
    }

    snapTimerRef.current = window.setTimeout(() => {
      setTransitionEnabled(false);
      setDragX(0);
      setVisualIndex(visualIndex === 0 ? total : 1);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });

      snapTimerRef.current = null;
    }, SNAP_AFTER_MS);

    return () => {
      if (snapTimerRef.current) {
        window.clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
    };
  }, [hasMany, total, visualIndex]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
      }

      if (snapTimerRef.current) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  if (!cleanSlides.length || !renderSlides.length) return null;

  function pauseThenResume() {
    setPaused(true);

    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = window.setTimeout(() => {
      setPaused(false);
      resumeTimerRef.current = null;
    }, RESUME_AFTER_INTERACTION);
  }

  function blockNextClick() {
    clickBlockedRef.current = true;

    window.setTimeout(() => {
      clickBlockedRef.current = false;
    }, 280);
  }

  function goTo(index: number) {
    if (!hasMany) return;

    pauseThenResume();
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);
    setVisualIndex(index + 1);
  }

  function goPrev() {
    if (!hasMany) return;

    pauseThenResume();
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);

    setVisualIndex((index) => {
      if (index <= 0) return total;
      return index - 1;
    });
  }

  function goNext() {
    if (!hasMany) return;

    pauseThenResume();
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);

    setVisualIndex((index) => {
      if (index >= total + 1) return 1;
      return index + 1;
    });
  }

  function resetPointer() {
    pointerRef.current = {
      active: false,
      pointerId: 0,
      startX: 0,
      startY: 0,
      locked: false,
      moved: false,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!hasMany) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      locked: false,
      moved: false,
    };

    pauseThenResume();
    setDragging(true);
    setTransitionEnabled(false);
    setDragX(0);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;

    if (!hasMany || !pointer.active) return;
    if (pointer.pointerId && pointer.pointerId !== event.pointerId) return;

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;

    if (!pointer.locked) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < SWIPE_LOCK_DISTANCE && absY < SWIPE_LOCK_DISTANCE) return;

      if (absX > absY * 1.12) {
        pointer.locked = true;
        pointer.moved = true;
      } else {
        resetPointer();
        setDragging(false);
        setDragX(0);
        return;
      }
    }

    if (pointer.locked) {
      event.preventDefault();
      event.stopPropagation();
      setDragX(dx);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;

    if (!hasMany || !pointer.active) {
      resetPointer();
      setDragging(false);
      setDragX(0);
      return;
    }

    if (pointer.pointerId && pointer.pointerId !== event.pointerId) return;

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;

    const isHorizontalSwipe =
      Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.08;

    const moved = pointer.moved || pointer.locked || Math.abs(dx) > 10;

    resetPointer();

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);

    if (!isHorizontalSwipe) {
      if (moved) blockNextClick();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    blockNextClick();

    if (dx > 0) {
      goPrev();
    } else {
      goNext();
    }
  }

  function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    resetPointer();
    setDragging(false);
    setTransitionEnabled(true);
    setDragX(0);
  }

  function handleTrackTransitionEnd(event?: any) {
    if (!hasMany) return;

    if (
      event?.target &&
      event?.currentTarget &&
      event.target !== event.currentTarget
    ) {
      return;
    }

    if (visualIndex === 0) {
      setTransitionEnabled(false);
      setDragX(0);
      setVisualIndex(total);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });

      return;
    }

    if (visualIndex === total + 1) {
      setTransitionEnabled(false);
      setDragX(0);
      setVisualIndex(1);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });
    }
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

    try {
      router.prefetch(internalHref);
    } catch {
      // ignore
    }

    startMobileNavigation({
      href: internalHref,
      source: "programmatic",
    });

    router.push(internalHref);
  }

  const count = renderSlides.length;
  const slideSize = 100 / Math.max(1, count);

  const trackTransform = `translate3d(calc(-${
    visualIndex * slideSize
  }% + ${dragX}px), 0, 0)`;

  return (
    <section dir="rtl" className="mk-mhero">
      <div
        className={["mk-mhero__wrap", dragging ? "is-dragging" : ""]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        style={{ touchAction: "pan-y" }}
      >
        <div className="mk-mhero__swiper">
          <div className="mk-mhero__viewport" dir="ltr">
            <div
              className="mk-mhero__track"
              onTransitionEnd={handleTrackTransitionEnd}
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
              {renderSlides.map(({ key, slide, originalIndex }) => (
                <div
                  key={key}
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
                      className="mk-mhero__link"
                      aria-label={slide.title || `slide-${originalIndex + 1}`}
                      draggable={false}
                      onClick={(event) => handleLinkClick(event, slide.href)}
                      onDragStart={(event) => event.preventDefault()}
                      style={
                        {
                          "--mk-mhero-bg": cssUrl(slide.image),
                        } as CSSProperties
                      }
                    >
                      <img
                        className="mk-mhero__img"
                        src={slide.image}
                        alt={slide.title || `slide-${originalIndex + 1}`}
                        loading={originalIndex === 0 ? "eager" : "lazy"}
                        fetchPriority={originalIndex === 0 ? "high" : "low"}
                        decoding="async"
                        width={1242}
                        height={1427}
                        sizes="100vw"
                        draggable={false}
                      />

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
              ))}
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
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}