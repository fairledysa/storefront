// FILE: apps/storefront/src/components/analytics/StoreVisitTracker.tsx

"use client";

import { useEffect, useRef } from "react";

const SESSION_IDLE_MS = 30 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 5_000, 20_000];

type VisitSession = {
  id: string;
  lastActivityAt: number;
  reportedAt?: number;
};

function safeText(value: unknown) {
  return String(value ?? "").trim();
}

function isExcludedEnvironment() {
  if (typeof window === "undefined") return true;

  const params = new URLSearchParams(window.location.search);
  const preview = params.get("preview") === "1" && params.get("themeEditor") === "1";
  const host = window.location.hostname.toLowerCase();
  const allowLocal = process.env.NEXT_PUBLIC_ANALYTICS_ALLOW_LOCAL === "1";

  return preview || (!allowLocal && (host === "localhost" || host.endsWith(".localhost")));
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }

  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}${random}${Math.random().toString(36).slice(2)}`;
}

function readSession(key: string): VisitSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as VisitSession;
    const id = safeText(parsed?.id);
    const lastActivityAt = Number(parsed?.lastActivityAt ?? 0);

    if (!id || !Number.isFinite(lastActivityAt)) return null;

    return {
      id,
      lastActivityAt,
      reportedAt: Number.isFinite(Number(parsed?.reportedAt))
        ? Number(parsed.reportedAt)
        : undefined,
    };
  } catch {
    return null;
  }
}

function writeSession(key: string, session: VisitSession) {
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // تعطّل localStorage لا يجب أن يعطّل المتجر أو تجربة الشراء.
  }
}

export default function StoreVisitTracker({ storeId }: { storeId: string }) {
  const stateRef = useRef<{
    key: string;
    session: VisitSession;
    lastStorageWriteAt: number;
  } | null>(null);

  useEffect(() => {
    const cleanStoreId = safeText(storeId);
    if (!cleanStoreId || isExcludedEnvironment()) return;

    const storageKey = `elyaia.analytics.v1.session.${cleanStoreId}`;
    let disposed = false;
    let retryTimers: number[] = [];

    const report = (session: VisitSession) => {
      for (const timer of retryTimers) window.clearTimeout(timer);
      retryTimers = [];

      for (const delay of RETRY_DELAYS_MS) {
        const timer = window.setTimeout(async () => {
          if (disposed) return;

          try {
            const response = await fetch("/api/analytics/visit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: session.id }),
              cache: "no-store",
              keepalive: true,
            });

            // حتى لو لم نعرف هل عُدّت الجلسة، Redis يجعل نفس session_id idempotent.
            if (!response.ok) return;

            const payload = (await response.json().catch(() => null)) as {
              ok?: boolean;
              enabled?: boolean;
            } | null;

            if (!payload?.ok || payload.enabled === false || disposed) return;

            const current = stateRef.current;
            if (!current || current.session.id !== session.id) return;

            current.session = {
              ...current.session,
              reportedAt: Date.now(),
            };
            writeSession(current.key, current.session);

            for (const retryTimer of retryTimers) window.clearTimeout(retryTimer);
            retryTimers = [];
          } catch {
            // المحاولة التالية إن وجدت تكفي. لا نرسل طلبات متواصلة.
          }
        }, delay);

        retryTimers.push(timer);
      }
    };

    const startOrResume = () => {
      const now = Date.now();
      const previous = readSession(storageKey);
      const expired = !previous || now - previous.lastActivityAt >= SESSION_IDLE_MS;

      const session: VisitSession = expired
        ? { id: createSessionId(), lastActivityAt: now }
        : { ...previous, lastActivityAt: now };

      stateRef.current = {
        key: storageKey,
        session,
        lastStorageWriteAt: now,
      };
      writeSession(storageKey, session);

      if (expired || !session.reportedAt) {
        report(session);
      }
    };

    const touch = () => {
      const current = stateRef.current;
      if (!current) return;

      const now = Date.now();
      if (now - current.session.lastActivityAt >= SESSION_IDLE_MS) {
        startOrResume();
        return;
      }

      current.session.lastActivityAt = now;

      // لا نكتب localStorage مع كل scroll أو mousemove.
      if (now - current.lastStorageWriteAt >= 15_000) {
        current.lastStorageWriteAt = now;
        writeSession(current.key, current.session);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startOrResume();
      }
    };

    startOrResume();

    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch, { passive: true });
    window.addEventListener("scroll", touch, { passive: true });
    window.addEventListener("touchstart", touch, { passive: true });
    window.addEventListener("focus", touch);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      for (const timer of retryTimers) window.clearTimeout(timer);

      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("scroll", touch);
      window.removeEventListener("touchstart", touch);
      window.removeEventListener("focus", touch);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [storeId]);

  return null;
}
