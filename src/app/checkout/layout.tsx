// FILE: apps/storefront/src/app/checkout/layout.tsx

import "@/app/globals.css";

export const dynamic = "force-dynamic";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.28)_100%)] text-foreground"
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(700px_circle_at_80%_-10%,hsl(var(--primary)/0.14),transparent_62%),radial-gradient(520px_circle_at_8%_8%,hsl(var(--ring)/0.08),transparent_64%)]" />

      <div className="relative min-h-screen">{children}</div>
    </div>
  );
}