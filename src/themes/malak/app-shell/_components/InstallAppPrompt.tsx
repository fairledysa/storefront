// FILE: apps/storefront/src/themes/malak/app-shell/_components/InstallAppPrompt.tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import type { MalakBootstrap } from "../../bootstrap/types";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Props = {
  bootstrap?: MalakBootstrap;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean((window.navigator as any).standalone);

  return Boolean(mediaStandalone || iosStandalone);
}

function isIosDevice() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const maxTouchPoints = Number((window.navigator as any).maxTouchPoints || 0);

  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

function storageKey(storeId: string) {
  return `mk_install_prompt_dismissed:${storeId || "store"}:v1`;
}

export default function InstallAppPrompt({ bootstrap }: Props) {
  const pwa = bootstrap?.pwa;
  const storeId = s(bootstrap?.store?.id);
  const storeName = s(pwa?.app_name) || s(bootstrap?.store?.name) || "المتجر";

  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isEnabled = Boolean(pwa?.enabled && pwa?.install_prompt?.enabled);

  const iconUrl =
    s(pwa?.icon?.source) ||
    s(pwa?.icon?.pwa_192) ||
    s(bootstrap?.store?.favicon_url) ||
    s(bootstrap?.store?.logo_url);

  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    if (!isEnabled) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const run = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    const win = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: () => void) => number;
      };

    if (typeof win.requestIdleCallback === "function") {
      win.requestIdleCallback(run);
      return;
    }

    globalThis.setTimeout(run, 900);
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !storeId) return;
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
    }, 1300);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setReady(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      globalThis.clearTimeout(dismissedTimer);
      globalThis.clearTimeout(readyTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isEnabled, storeId]);

  function dismiss() {
    setDismissed(true);

    try {
      window.localStorage.setItem(storageKey(storeId), "1");
    } catch {}
  }

  async function install() {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) {
      setShowIosHelp(false);
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

  if (!isIos && !deferredPrompt) {
    return null;
  }

  const style = {
    "--mk-install-theme": pwa?.theme_color || "var(--mk-accent, #0D3B45)",
    "--mk-install-bg": pwa?.background_color || "#ffffff",
  } as CSSProperties;

  return (
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
        <strong>{s(pwa?.install_prompt?.title) || "ثبّت المتجر كتطبيق"}</strong>
        <p>
          {showIosHelp
            ? "في الآيفون: اضغط مشاركة ثم اختر إضافة إلى الشاشة الرئيسية."
            : s(pwa?.install_prompt?.description) ||
              "احصل على تجربة أسرع وأسهل من شاشة جوالك."}
        </p>
      </div>

      <button
        type="button"
        className="mk-install-app-prompt__action"
        onClick={install}
      >
        {isIos ? "طريقة التثبيت" : "ثبّت الآن"}
      </button>
    </div>
  );
}