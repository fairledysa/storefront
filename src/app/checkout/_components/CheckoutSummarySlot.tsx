// FILE: apps/storefront/src/app/checkout/_components/CheckoutSummarySlot.tsx
"use client";

import OrderSummary from "./OrderSummary";

type Props = {
  initialSummary?: any | null;
};

export default function CheckoutSummarySlot({ initialSummary = null }: Props) {
  return <OrderSummary initialSummary={initialSummary} />;
}