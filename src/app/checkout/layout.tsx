// FILE: apps/storefront/src/app/checkout/layout.tsx

import "@/app/globals.css";
import "./_styles/checkout.css";

export const dynamic = "force-dynamic";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="co-root">
      {children}
    </div>
  );
}