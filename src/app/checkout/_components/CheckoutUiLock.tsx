// FILE: apps/storefront/src/app/checkout/_components/CheckoutUiLock.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type BusyDetail = {
  busy?: boolean;
  message?: string;
};

export default function CheckoutUiLock() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("جاري تحديث بيانات الطلب...");

  useEffect(() => {
    function onBusy(event: Event) {
      const e = event as CustomEvent<BusyDetail>;
      const nextBusy = Boolean(e?.detail?.busy);

      setBusy(nextBusy);
      setMessage(
        e?.detail?.message || "جاري تحديث بيانات الطلب...",
      );
    }

    window.addEventListener("checkout:uiBusy", onBusy as EventListener);

    return () => {
      window.removeEventListener("checkout:uiBusy", onBusy as EventListener);
    };
  }, []);

  if (!busy) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-wait"
      aria-live="polite"
      aria-busy="true"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchStart={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px]" />

      <div className="absolute left-1/2 top-24 -translate-x-1/2 lg:top-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-[12px] font-black text-zinc-600 shadow-[0_14px_38px_rgba(15,23,42,0.12)] backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
          {message}
        </div>
      </div>
    </div>
  );
}