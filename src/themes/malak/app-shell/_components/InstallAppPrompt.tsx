// FILE: apps/storefront/src/themes/malak/app-shell/_components/InstallAppPrompt.tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { MalakBootstrap } from "../../bootstrap/types";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type DeviceKind = "ios" | "android" | "desktop" | "unknown";

type Props = {
  bootstrap?: MalakBootstrap;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  return fallback;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const mediaStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean((window.navigator as any).standalone);

  return Boolean(mediaStandalone || iosStandalone);
}

function detectDevice(): DeviceKind {
  if (typeof window === "undefined") return "unknown";

  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const maxTouchPoints = Number((window.navigator as any).maxTouchPoints || 0);

  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  if (isIos) return "ios";

  if (/android/i.test(ua)) return "android";

  const isSmallScreen = window.matchMedia?.("(max-width: 820px)")?.matches;
  if (isSmallScreen) return "unknown";

  return "desktop";
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;

  const byWidth = window.matchMedia?.("(max-width: 820px)")?.matches;
  const byTouch = Number((window.navigator as any).maxTouchPoints || 0) > 0;

  return Boolean(byWidth || byTouch);
}

function storageKey(storeId: string) {
  return `mk_install_prompt_dismissed:${storeId || "store"}:v2`;
}

export default function InstallAppPrompt({ bootstrap }: Props) {
  const pwa = (bootstrap as any)?.pwa || null;

  const storeId = s(bootstrap?.store?.id);
  const storeName = s(pwa?.app_name) || s(bootstrap?.store?.name) || "المتجر";

  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [device, setDevice] = useState<DeviceKind>("unknown");

  const isEnabled = Boolean(
    pwa &&
      bool(pwa.enabled, true) &&
      bool(pwa.install_prompt?.enabled, true),
  );

  const iconUrl =
    s(pwa?.icon?.source) ||
    s(pwa?.icon?.pwa_192) ||
    s(pwa?.icon?.pwa_512) ||
    s(bootstrap?.store?.favicon_url) ||
    s(bootstrap?.store?.logo_url);

  const installTitle =
    s(pwa?.install_prompt?.title) || `ثبّت ${storeName} كتطبيق`;

  const installDescription =
    s(pwa?.install_prompt?.description) ||
    "افتح المتجر من شاشة جوالك مباشرة واستمتع بتجربة أسرع وأسهل.";

  const canUseNativePrompt = Boolean(deferredPrompt && device !== "ios");

  const actionLabel = useMemo(() => {
    if (device === "ios") return "اعرض الطريقة";
    if (canUseNativePrompt) return "ثبّت الآن";
    return "طريقة التثبيت";
  }, [device, canUseNativePrompt]);

  useEffect(() => {
    if (!isEnabled) return;
    if (typeof window === "undefined") return;

    setDevice(detectDevice());
    setIsMobile(isMobileViewport());

    function handleResize() {
      setDevice(detectDevice());
      setIsMobile(isMobileViewport());
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerSw = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    const win = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: () => void) => number;
      };

    if (typeof win.requestIdleCallback === "function") {
      win.requestIdleCallback(registerSw);
      return;
    }

    globalThis.setTimeout(registerSw, 900);
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;
    if (typeof window === "undefined") return;

    const key = storageKey(storeId);

    const dismissedTimer = globalThis.setTimeout(() => {
      if (isStandaloneMode()) {
        setDismissed(true);
        return;
      }

      try {
        setDismissed(window.localStorage.getItem(key) === "1");
      } catch {
        setDismissed(false);
      }
    }, 0);

    const readyTimer = globalThis.setTimeout(() => {
      setReady(true);
    }, 1100);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setReady(true);
      setDismissed(false);
    }

    function handleAppInstalled() {
      dismiss();
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      globalThis.clearTimeout(dismissedTimer);
      globalThis.clearTimeout(readyTimer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, storeId]);

  function dismiss() {
    setDismissed(true);
    setHelpOpen(false);

    try {
      window.localStorage.setItem(storageKey(storeId), "1");
    } catch {}
  }

  async function install() {
    if (device === "ios") {
      setHelpOpen(true);
      return;
    }

    if (!deferredPrompt) {
      setHelpOpen(true);
      return;
    }

    await deferredPrompt.prompt();

    try {
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        dismiss();
      }
    } catch {}

    setDeferredPrompt(null);
  }

  if (!isEnabled || !ready || dismissed || isStandaloneMode()) {
    return null;
  }

  if (!isMobile && device === "desktop" && !deferredPrompt) {
    return null;
  }

  const style = {
    "--mk-install-theme": pwa?.theme_color || "var(--mk-accent, #0D3B45)",
    "--mk-install-bg": pwa?.background_color || "#ffffff",
  } as CSSProperties;

  return (
    <>
      <div className="mk-install-app-prompt" style={style} dir="rtl">
        <button
          type="button"
          className="mk-install-app-prompt__close"
          onClick={dismiss}
          aria-label="إغلاق"
        >
          ×
        </button>

        <div className="mk-install-app-prompt__icon">
          {iconUrl ? (
            <img src={iconUrl} alt="" />
          ) : (
            <span>{storeName.slice(0, 1)}</span>
          )}
        </div>

        <div className="mk-install-app-prompt__copy">
          <strong>{installTitle}</strong>
          <p>
            {device === "ios"
              ? "على الآيفون: اضغط مشاركة ثم إضافة إلى الشاشة الرئيسية."
              : installDescription}
          </p>
        </div>

        <button
          type="button"
          className="mk-install-app-prompt__action"
          onClick={install}
        >
          {actionLabel}
        </button>
      </div>

      {helpOpen ? (
        <div
          className="mk-install-help"
          role="dialog"
          aria-modal="true"
          aria-label="طريقة تثبيت التطبيق"
          dir="rtl"
        >
          <button
            type="button"
            className="mk-install-help__backdrop"
            onClick={() => setHelpOpen(false)}
            aria-label="إغلاق"
          />

          <div className="mk-install-help__sheet">
            <div className="mk-install-help__handle" />

            <div className="mk-install-help__head">
              <div className="mk-install-help__icon">
                {iconUrl ? (
                  <img src={iconUrl} alt="" />
                ) : (
                  <span>{storeName.slice(0, 1)}</span>
                )}
              </div>

              <div>
                <h3>ثبّت {storeName} على جوالك</h3>
                <p>بعد التثبيت يفتح المتجر مثل التطبيق من شاشة الجوال.</p>
              </div>
            </div>

            {device === "ios" ? (
              <ol className="mk-install-help__steps">
                <li>
                  <span>1</span>
                  <p>
                    اضغط زر المشاركة <b>⬆</b> أسفل المتصفح.
                  </p>
                </li>
                <li>
                  <span>2</span>
                  <p>
                    اختر <b>Add to Home Screen</b> أو{" "}
                    <b>إضافة إلى الشاشة الرئيسية</b>.
                  </p>
                </li>
                <li>
                  <span>3</span>
                  <p>
                    اضغط <b>Add</b> أو <b>إضافة</b>.
                  </p>
                </li>
              </ol>
            ) : (
              <ol className="mk-install-help__steps">
                <li>
                  <span>1</span>
                  <p>
                    اضغط قائمة المتصفح <b>⋮</b>.
                  </p>
                </li>
                <li>
                  <span>2</span>
                  <p>
                    اختر <b>Install app</b> أو <b>Add to Home screen</b>.
                  </p>
                </li>
                <li>
                  <span>3</span>
                  <p>اضغط تثبيت وسيظهر المتجر على شاشة جوالك.</p>
                </li>
              </ol>
            )}

            <div className="mk-install-help__actions">
              <button
                type="button"
                className="mk-install-help__primary"
                onClick={() => setHelpOpen(false)}
              >
                فهمت
              </button>

              <button
                type="button"
                className="mk-install-help__ghost"
                onClick={dismiss}
              >
                لا تظهرها مرة أخرى
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}