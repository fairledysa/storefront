// FILE: apps/storefront/src/themes/basit/app-shell/_components/InstallAppPrompt.tsx
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

  if (value && typeof value === "object") {
    const obj = value as any;

    if ("enabled" in obj) return bool(obj.enabled, fallback);
    if ("is_enabled" in obj) return bool(obj.is_enabled, fallback);
    if ("checked" in obj) return bool(obj.checked, fallback);
    if ("value" in obj) return bool(obj.value, fallback);
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

function storageKey(storeId: string) {
  return `mk_install_prompt_dismissed:${storeId || "store"}:premium-v1`;
}

function shouldForcePrompt() {
  if (typeof window === "undefined") return false;

  try {
    return new URLSearchParams(window.location.search).get("installPrompt") === "1";
  } catch {
    return false;
  }
}

export default function InstallAppPrompt({ bootstrap }: Props) {
  const pwa = (bootstrap as any)?.pwa || null;
  const installPrompt = pwa?.install_prompt || {};

  const storeId = s(bootstrap?.store?.id) || "store";
  const storeName = s(pwa?.app_name) || s(bootstrap?.store?.name) || "المتجر";

  const isEnabled = Boolean(
    pwa &&
      bool(pwa?.enabled, false) &&
      bool(installPrompt?.enabled, true),
  );

  const iconUrl =
    s(pwa?.icon?.source) ||
    s(pwa?.icon?.pwa_192) ||
    s(pwa?.icon?.pwa_512) ||
    s(bootstrap?.store?.favicon_url) ||
    s(bootstrap?.store?.logo_url);

  const installTitle = s(installPrompt?.title) || `ثبّت ${storeName} على جوالك`;

  const installDescription =
    s(installPrompt?.description) ||
    "وصول أسرع وتجربة تشبه التطبيق من الشاشة الرئيسية.";

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<DeviceKind>("unknown");
  const [helpOpen, setHelpOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const canUseNativePrompt = Boolean(deferredPrompt && device !== "ios");

  const actionLabel = useMemo(() => {
    if (canUseNativePrompt) return "ثبّت الآن";
    return "أضف للشاشة";
  }, [canUseNativePrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isEnabled) {
      setMounted(false);
      setVisible(false);
      setHelpOpen(false);
      setDeferredPrompt(null);
      return;
    }

    const forced = shouldForcePrompt();

    setMounted(true);
    setDevice(detectDevice());

    if (isStandaloneMode() && !forced) {
      setVisible(false);
      return;
    }

    try {
      if (!forced && window.localStorage.getItem(storageKey(storeId)) === "1") {
        setVisible(false);
        return;
      }

      if (forced) {
        window.localStorage.removeItem(storageKey(storeId));
      }
    } catch {}

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, forced ? 0 : 1400);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleAppInstalled() {
      dismiss();
    }

    function handleResize() {
      setDevice(detectDevice());
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, isEnabled]);

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

  function dismiss() {
    setVisible(false);
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

  if (!isEnabled || !mounted || !visible) {
    return null;
  }

  const style = {
    "--mk-install-theme": pwa?.theme_color || "var(--mk-accent, #0D3B45)",
    "--mk-install-bg": pwa?.background_color || "#ffffff",
  } as CSSProperties;

  return (
    <>
      <div
        id="mk-install-app-prompt"
        className="mk-install-app-prompt"
        style={style}
        dir="rtl"
      >
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
          <p>{installDescription}</p>
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
                <h3>أضف {storeName} للشاشة الرئيسية</h3>
                <p>بعد الإضافة يفتح المتجر مثل التطبيق مباشرة.</p>
              </div>
            </div>

            {device === "ios" ? (
              <ol className="mk-install-help__steps">
                <li>
                  <span>1</span>
                  <p>
                    اضغط زر المشاركة <b>⬆</b> في Safari.
                  </p>
                </li>

                <li>
                  <span>2</span>
                  <p>
                    اختر <b>إضافة إلى الشاشة الرئيسية</b>.
                  </p>
                </li>

                <li>
                  <span>3</span>
                  <p>
                    اضغط <b>إضافة</b> وسيظهر المتجر بين التطبيقات.
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
                    اختر <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة</b>.
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
                تمام
              </button>

              <button
                type="button"
                className="mk-install-help__ghost"
                onClick={dismiss}
              >
                لا تظهر مرة أخرى
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}