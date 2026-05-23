// FILE: apps/storefront/src/themes/malak/screens-mobile/home/_components/MobileHero.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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

export default function MobileHero({ slides }: Props) {
  const router = useRouter();

  const cleanSlides = useMemo(() => {
    return (Array.isArray(slides) ? slides : []).filter((slide) =>
      Boolean(s(slide?.image)),
    );
  }, [slides]);

  const total = cleanSlides.length;
  const hasMany = total > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const pointerRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (activeIndex > total - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, total]);

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
    if (!hasMany || paused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % total);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [hasMany, paused, total]);

  if (!cleanSlides.length) return null;

  const activeSlide = cleanSlides[activeIndex] || cleanSlides[0];

  const hasText =
    Boolean(s(activeSlide.title)) ||
    Boolean(s(activeSlide.description)) ||
    Boolean(s(activeSlide.buttonText));

  function goTo(index: number) {
    if (!hasMany) return;

    setPaused(true);
    setActiveIndex(index);

    window.setTimeout(() => {
      setPaused(false);
    }, 5200);
  }

  function goPrev() {
    if (!hasMany) return;
    goTo((activeIndex - 1 + total) % total);
  }

  function goNext() {
    if (!hasMany) return;
    goTo((activeIndex + 1) % total);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!hasMany) return;

    pointerRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointerRef.current.active) return;

    const dx = event.clientX - pointerRef.current.startX;
    const dy = event.clientY - pointerRef.current.startY;

    pointerRef.current.active = false;

    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx > 0) {
      goPrev();
    } else {
      goNext();
    }
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.defaultPrevented) return;
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

  return (
    <section dir="rtl" className="mk-mhero">
      <div
        className="mk-mhero__wrap"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerRef.current.active = false;
        }}
      >
        <div className="mk-mhero__swiper">
          <div className="mk-mhero__slide">
            <div className="mk-mhero__slideInner">
              <Link
                href={activeSlide.href || "#"}
                className="mk-mhero__link"
                aria-label={activeSlide.title || `slide-${activeIndex + 1}`}
                onClick={(event) => handleLinkClick(event, activeSlide.href)}
              >
                <img
                  className="mk-mhero__img"
                  src={activeSlide.image}
                  alt={activeSlide.title || `slide-${activeIndex + 1}`}
                  loading={activeIndex === 0 ? "eager" : "lazy"}
                  fetchPriority={activeIndex === 0 ? "high" : "low"}
                  decoding="async"
                  width={900}
                  height={1100}
                  sizes="100vw"
                />

                {hasText ? (
                  <div className="mk-mhero__content">
                    {activeSlide.title ? (
                      <h2 className="mk-mhero__title">{activeSlide.title}</h2>
                    ) : null}

                    {activeSlide.description ? (
                      <p className="mk-mhero__desc">
                        {activeSlide.description}
                      </p>
                    ) : null}

                    {activeSlide.buttonText ? (
                      <span className="mk-mhero__button">
                        {activeSlide.buttonText}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </Link>
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
                    index === activeIndex
                      ? "swiper-pagination-bullet-active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`عرض الشريحة ${index + 1}`}
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