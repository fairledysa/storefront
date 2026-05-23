// FILE: apps/storefront/src/themes/malak/app-shell/_components/MobileNavigationTransition.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  MK_MOBILE_NAV_CANCEL,
  MK_MOBILE_NAV_FINISH,
  MK_MOBILE_NAV_START,
  type MobileNavigationDetail,
} from "../../app-navigation/mobile-navigation";

type Props = {
  enabled: boolean;
};

function isModifiedClick(event: MouseEvent) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function isSkippableHref(href: string) {
  const value = String(href || "").trim().toLowerCase();

  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("sms:") ||
    value.startsWith("whatsapp:") ||
    value.startsWith("javascript:")
  );
}

function getAnchorFromEvent(event: Event) {
  const target = event.target as Element | null;
  return target?.closest?.("a[href]") as HTMLAnchorElement | null;
}

function getSameOriginHref(anchor: HTMLAnchorElement) {
  const rawHref = anchor.getAttribute("href") || "";
  if (isSkippableHref(rawHref)) return "";

  let url: URL;

  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return "";
  }

  if (url.origin !== window.location.origin) return "";
  if (url.pathname.startsWith("/api/")) return "";

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const nextPath = `${url.pathname}${url.search}${url.hash}`;

  if (nextPath === currentPath) return "";

  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash
  ) {
    return "";
  }

  return nextPath;
}

function getPrefetchHref(anchor: HTMLAnchorElement) {
  const rawHref = anchor.getAttribute("href") || "";
  if (isSkippableHref(rawHref)) return "";

  let url: URL;

  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return "";
  }

  if (url.origin !== window.location.origin) return "";
  if (url.pathname.startsWith("/api/")) return "";

  const href = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;

  if (!href || href === current) return "";

  return href;
}

export default function MobileNavigationTransition({ enabled }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeKey = useMemo(() => {
    const query = searchParams?.toString();
    return `${pathname || "/"}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const routeKeyRef = useRef(routeKey);
  const activeRef = useRef(false);
  const startedRef = useRef(false);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const setActiveState = useCallback((value: boolean) => {
    activeRef.current = value;
    setActive(value);
  }, []);

  const finish = useCallback(() => {
    if (!startedRef.current && !activeRef.current) return;

    startedRef.current = false;

    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (!activeRef.current) {
      setActiveState(false);
      setLeaving(false);
      return;
    }

    setLeaving(true);

    finishTimerRef.current = setTimeout(() => {
      setActiveState(false);
      setLeaving(false);
      finishTimerRef.current = null;
    }, 160);
  }, [setActiveState]);

  const start = useCallback(
  (_detail?: MobileNavigationDetail) => {
    if (!enabled) return;

    clearTimers();

    startedRef.current = true;
    setLeaving(false);
    setActiveState(true);

    fallbackTimerRef.current = setTimeout(() => {
      finish();
    }, 8000);
  },
  [clearTimers, enabled, finish, setActiveState],
);

  const prefetchHref = useCallback(
    (href: string) => {
      if (!enabled || !href) return;
      if (prefetchedRef.current.has(href)) return;

      prefetchedRef.current.add(href);

      try {
        router.prefetch(href);
      } catch {
        // ignore
      }
    },
    [enabled, router],
  );

  useEffect(() => {
    if (!enabled) return;

    const importantRoutes = ["/", "/categories", "/cart", "/account"];

    for (const href of importantRoutes) {
      prefetchHref(href);
    }
  }, [enabled, prefetchHref]);

  useEffect(() => {
    if (!enabled) return;
    if (routeKeyRef.current === routeKey) return;

    routeKeyRef.current = routeKey;

    const timer = window.setTimeout(() => {
      finish();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, routeKey, finish]);

  useEffect(() => {
    if (!enabled) return;

    function handleStart(event: Event) {
      const customEvent = event as CustomEvent<MobileNavigationDetail>;
      start(customEvent.detail);
    }

    function handleFinish() {
      finish();
    }

    function handleCancel() {
      finish();
    }

    window.addEventListener(MK_MOBILE_NAV_START, handleStart);
    window.addEventListener(MK_MOBILE_NAV_FINISH, handleFinish);
    window.addEventListener(MK_MOBILE_NAV_CANCEL, handleCancel);

    return () => {
      window.removeEventListener(MK_MOBILE_NAV_START, handleStart);
      window.removeEventListener(MK_MOBILE_NAV_FINISH, handleFinish);
      window.removeEventListener(MK_MOBILE_NAV_CANCEL, handleCancel);
    };
  }, [enabled, start, finish]);

  useEffect(() => {
    if (!enabled) return;

    function handleIntent(event: Event) {
      const anchor = getAnchorFromEvent(event);
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = getPrefetchHref(anchor);
      if (!href) return;

      prefetchHref(href);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = getAnchorFromEvent(event);
      if (!anchor) return;

      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = getSameOriginHref(anchor);
      if (!href) return;

      event.preventDefault();

      const prefetchTarget = href.split("#")[0] || href;
      prefetchHref(prefetchTarget);

      start({
        href,
        source: "link",
      });

      router.push(href);
    }

    function handlePopState() {
      start({
        source: "popstate",
      });
    }

    document.addEventListener("touchstart", handleIntent, true);
    document.addEventListener("pointerover", handleIntent, true);
    document.addEventListener("focusin", handleIntent, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("touchstart", handleIntent, true);
      document.removeEventListener("pointerover", handleIntent, true);
      document.removeEventListener("focusin", handleIntent, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [enabled, router, start, prefetchHref, clearTimers]);

  useEffect(() => {
    if (!enabled) return;

    const body = document.body;

    body.classList.toggle("mk-mobile-route-is-loading", active);
    body.classList.toggle("mk-mobile-route-is-leaving", leaving);

    return () => {
      body.classList.remove("mk-mobile-route-is-loading");
      body.classList.remove("mk-mobile-route-is-leaving");
    };
  }, [enabled, active, leaving]);

  if (!enabled) return null;

  return active ? (
    <div
      className={[
        "mk-mobile-route-progress",
        leaving ? "mk-mobile-route-progress--leaving" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span className="mk-mobile-route-progress__bar" />
    </div>
  ) : null;
}