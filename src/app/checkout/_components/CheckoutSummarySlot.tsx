// FILE: apps/storefront/src/app/checkout/_components/CheckoutSummarySlot.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const OrderSummary = dynamic(() => import("./OrderSummary"), {
  ssr: false,
  loading: () => <DesktopSummaryFallback />,
});

const MobileSummarySheet = dynamic(() => import("./MobileSummarySheet"), {
  ssr: false,
  loading: () => <MobileSummaryFallback />,
});

export default function CheckoutSummarySlot() {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    const sync = () => {
      setIsDesktop(mq.matches);
      setMounted(true);
    };

    sync();

    mq.addEventListener("change", sync);

    return () => {
      mq.removeEventListener("change", sync);
    };
  }, []);

  if (!mounted) {
    return <div className="h-[96px] lg:min-h-[420px]" aria-hidden />;
  }

  if (isDesktop) {
    return (
      <div className="lg:sticky lg:top-5">
        <OrderSummary />
      </div>
    );
  }

  return <MobileSummarySheet />;
}

function DesktopSummaryFallback() {
  return (
    <div
      className="hidden min-h-[420px] rounded-[28px] border border-zinc-200 bg-white lg:block"
      aria-hidden
    />
  );
}

function MobileSummaryFallback() {
  return <div className="h-[96px] lg:hidden" aria-hidden />;
}