// FILE: apps/storefront/src/app/checkout/_components/CheckoutSummaryMount.tsx
"use client";

import { useEffect, useState } from "react";
import OrderSummary from "./OrderSummary";
import MobileSummarySheet from "./MobileSummarySheet";

type ViewMode = "mobile" | "desktop";

function getViewMode(): ViewMode {
  if (typeof window === "undefined") return "mobile";

  return window.matchMedia("(min-width: 1024px)").matches
    ? "desktop"
    : "mobile";
}

export default function CheckoutSummaryMount() {
  const [view, setView] = useState<ViewMode | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    const syncView = () => {
      setView(mq.matches ? "desktop" : "mobile");
    };

    syncView();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", syncView);
      return () => mq.removeEventListener("change", syncView);
    }

    mq.addListener(syncView);
    return () => mq.removeListener(syncView);
  }, []);

  if (!view) return null;

  if (view === "desktop") {
    return (
      <div className="hidden lg:block lg:sticky lg:top-5">
        <OrderSummary />
      </div>
    );
  }

  return (
    <div className="lg:hidden">
      <MobileSummarySheet />
    </div>
  );
}