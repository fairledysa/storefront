// FILE: apps/storefront/src/app/checkout/_components/CheckoutHeader.tsx

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Lock, ShieldCheck, ShoppingBag } from "lucide-react";

type Props = {
  storeName: string;
  logoUrl?: string | null;
};

function SecurityChip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "secure";
}) {
  return (
    <span
      className={[
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5",
        "text-[11px] font-black shadow-sm transition",
        tone === "secure"
          ? "border-zinc-200 bg-white text-zinc-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-600",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function CheckoutHeader({ storeName, logoUrl }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 shadow-[0_8px_28px_rgba(15,23,42,0.045)] backdrop-blur-xl">
      <div className="mx-auto flex h-[58px] max-w-[1320px] items-center justify-between gap-2 px-3 sm:h-[64px] sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/cart"
            className={[
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              "border border-zinc-200 bg-white text-zinc-800 shadow-sm",
              "transition hover:bg-zinc-50 active:scale-[0.98]",
            ].join(" ")}
            aria-label="الرجوع إلى السلة"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>

          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div
              className={[
                "relative h-10 w-10 shrink-0 overflow-hidden rounded-[16px]",
                "border border-zinc-200 bg-zinc-50 shadow-sm",
              ].join(" ")}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={storeName}
                  fill
                  className="object-cover"
                  sizes="40px"
                  priority
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-zinc-500">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 leading-tight">
              <div className="hidden text-[11px] font-bold text-zinc-400 sm:block">
                متجر
              </div>

              <div className="max-w-[118px] truncate text-[14px] font-black tracking-tight text-zinc-950 sm:max-w-[210px] sm:text-[15px]">
                {storeName}
              </div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-bold text-zinc-500 md:flex">
          <Link href="/cart" className="transition hover:text-zinc-950">
            سلة المشتريات
          </Link>

          <span className="text-zinc-300">/</span>

          <span className="font-black text-zinc-950">إتمام الطلب</span>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <SecurityChip>
              <Lock className="h-3.5 w-3.5 text-zinc-700" />
              دفع آمن
            </SecurityChip>
          </div>

          <SecurityChip tone="secure">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-zinc-950 text-white">
              <ShieldCheck className="h-2.5 w-2.5" />
            </span>
            <span className="hidden sm:inline">اتصال مشفّر</span>
            <span className="sm:hidden">آمن</span>
          </SecurityChip>
        </div>
      </div>
    </header>
  );
}