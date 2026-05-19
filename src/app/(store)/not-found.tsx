// FILE: apps/storefront/src/app/(store)/[...slug]/not-found.tsx

import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getSeoUrlMode } from "@/data/store/settings";

import MalakTheme from "@/themes/malak";
import { getMalakBootstrap } from "@/themes/malak/bootstrap/get-malak-bootstrap";
import { getInitialCartCount } from "@/themes/malak/runtime/get-cart-count.server";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function isMalakTheme(ctx: any) {
  const themeKey =
    s(ctx?.theme?.theme_key) ||
    s(ctx?.theme?.key) ||
    s(ctx?.theme?.code) ||
    s(ctx?.theme?.theme_code);

  return themeKey === "malak";
}

function detectDeviceFromUA(ua: string, mobileHint?: string | null) {
  const hint = String(mobileHint ?? "").toLowerCase().trim();

  if (hint === "?1" || hint === "1" || hint === "true" || hint === "mobile") {
    return "mobile" as const;
  }

  const raw = String(ua || "").toLowerCase();

  const isMobile =
    raw.includes("iphone") ||
    raw.includes("android") ||
    raw.includes("ipad") ||
    raw.includes("ipod") ||
    raw.includes("mobile");

  return isMobile ? ("mobile" as const) : ("desktop" as const);
}

function IconHome() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCart() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M6.5 7h13l-1.4 7.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L6.1 4.8H3.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 20.2h.01M16.5 20.2h.01"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="m20 20-4.2-4.2M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBox() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="m12 3 8 4.3v9.4L12 21l-8-4.3V7.3L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StoreLogo({
  logoUrl,
  storeName,
  size = 44,
  className = "",
  rounded = "rounded-full",
}: {
  logoUrl?: string | null;
  storeName?: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const fallback = s(storeName).slice(0, 1) || "S";

  if (logoUrl) {
    return (
      <div
        className={[
          "inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/70 bg-white shadow-sm",
          rounded,
          className,
        ].join(" ")}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt={storeName || "Store logo"}
          className="h-full w-full object-contain"
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={[
        "inline-flex shrink-0 items-center justify-center border border-zinc-200 bg-white text-zinc-950 shadow-sm",
        rounded,
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <span className="text-sm font-black">{fallback}</span>
    </div>
  );
}

function HeroIllustration({
  storeName,
  logoUrl,
}: {
  storeName?: string;
  logoUrl?: string | null;
}) {
  const label = storeName ? `متجر ${storeName}` : "متجرك";
  const safeStoreName = storeName || "متجر";

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="relative overflow-hidden rounded-[40px] border border-zinc-200/80 bg-[linear-gradient(145deg,#ffffff_0%,#fcfaff_38%,#f7f7f8_100%)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-7">
        <div className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-violet-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-zinc-100/80 blur-3xl" />

        <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <StoreLogo
            logoUrl={logoUrl}
            storeName={safeStoreName}
            size={32}
            rounded="rounded-full"
          />
          <div className="text-right leading-tight">
            <div className="text-[11px] font-black text-zinc-950 line-clamp-1">
              {safeStoreName}
            </div>
            <div className="text-[10px] font-bold text-zinc-400">
              صفحة غير متوفرة
            </div>
          </div>
        </div>

        <div className="absolute left-10 top-12 h-3 w-3 rounded-full border border-violet-200 bg-white" />
        <div className="absolute right-16 top-24 h-2.5 w-2.5 rounded-full bg-violet-300" />
        <div className="absolute left-14 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-violet-100 text-violet-500 shadow-sm">
          <span className="text-2xl leading-none">×</span>
        </div>

        <div className="relative min-h-[320px] md:min-h-[360px]">
          <div className="absolute inset-x-8 bottom-4 h-8 rounded-full bg-zinc-200/60 blur-xl" />

          <div className="absolute bottom-12 left-6 rotate-[-7deg]">
            <div className="relative h-[110px] w-[148px] rounded-[22px] border border-zinc-300 bg-zinc-50 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="absolute -top-2 right-7 h-4 w-16 rounded-full bg-zinc-950" />
              <div className="absolute inset-x-5 top-8 h-8 rounded-xl bg-white" />
              <div className="absolute bottom-5 right-5 text-xs font-black text-zinc-950">
                PKG
              </div>
              <div className="absolute bottom-5 left-5 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-[0_12px_30px_rgba(124,58,237,0.24)]">
                <IconHeart />
              </div>
            </div>
          </div>

          <div className="absolute bottom-[105px] left-[115px] rotate-[8deg]">
            <div className="relative h-[132px] w-[182px]">
              <div className="absolute left-0 top-7 h-[94px] w-[148px] rounded-[18px] border-2 border-zinc-400/70 bg-white/65 shadow-sm backdrop-blur-sm" />
              <div className="absolute left-6 top-0 h-12 w-20 rounded-t-full border-[5px] border-violet-400 border-b-0" />
              <div className="absolute left-[12px] top-[52px] h-px w-[125px] bg-zinc-300" />
              <div className="absolute left-[12px] top-[78px] h-px w-[125px] bg-zinc-300" />
              <div className="absolute left-[44px] top-[28px] h-[88px] w-px bg-zinc-300" />
              <div className="absolute left-[86px] top-[28px] h-[88px] w-px bg-zinc-300" />
              <div className="absolute left-[23px] top-[36px] h-8 w-16 rounded-lg bg-violet-100" />
              <div className="absolute left-[66px] top-[40px] h-7 w-16 rounded-lg bg-violet-200" />
              <div className="absolute left-[38px] top-[108px] h-3 w-3 rounded-full bg-zinc-950" />
              <div className="absolute left-[120px] top-[108px] h-3 w-3 rounded-full bg-zinc-950" />
            </div>
          </div>

          <div className="absolute right-10 bottom-10">
            <div className="relative h-[210px] w-[158px] rounded-[30px] border border-zinc-200 bg-white shadow-[0_24px_55px_rgba(15,23,42,0.08)]">
              <div className="absolute -top-12 right-[30px] h-16 w-16 rounded-t-full border-[5px] border-zinc-950 border-b-0" />
              <div className="absolute -top-12 left-[30px] h-16 w-16 rounded-t-full border-[5px] border-zinc-950 border-b-0" />

              <div className="absolute inset-x-0 top-10 flex justify-center">
                <StoreLogo
                  logoUrl={logoUrl}
                  storeName={safeStoreName}
                  size={52}
                  rounded="rounded-2xl"
                />
              </div>

              <div className="absolute inset-x-0 top-[112px] text-center">
                <div className="text-[11px] font-bold text-zinc-400">404</div>
                <div className="mt-1 px-3 text-sm font-black text-zinc-950 line-clamp-1">
                  {safeStoreName}
                </div>
                <div className="mt-1 text-[11px] font-bold text-zinc-400">
                  صفحة غير متوفرة
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-[94px] right-[4px] flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_18px_44px_rgba(124,58,237,0.24)]">
            <IconHeart />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400">
        <StoreLogo
          logoUrl={logoUrl}
          storeName={safeStoreName}
          size={22}
          rounded="rounded-full"
          className="shadow-none"
        />
        <span>{label}</span>
      </div>
    </div>
  );
}

function QuickLinkCard({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[24px] border border-zinc-200/85 bg-white/80 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 transition group-hover:bg-violet-100">
        {icon}
      </div>

      <div className="text-center">
        <div className="text-sm font-black text-zinc-950">{title}</div>
        <div className="mt-1.5 text-xs font-semibold leading-6 text-zinc-500">
          {text}
        </div>
      </div>
    </Link>
  );
}

function NotFoundContent({
  storeName,
  logoUrl,
}: {
  storeName?: string;
  logoUrl?: string | null;
}) {
  return (
    <main
      dir="rtl"
      className="min-h-[64vh] text-zinc-950"
      style={{ backgroundColor: "var(--mk-bg-page, #fff)" }}
    >
      <div className="mx-auto w-full max-w-[1220px] px-4 py-10 md:px-6 md:py-12">
        <section className="grid items-center gap-8 md:grid-cols-[1.02fr_0.98fr] md:gap-10">
          <div className="order-2 md:order-1">
            <HeroIllustration storeName={storeName} logoUrl={logoUrl} />
          </div>

          <div className="order-1 text-center md:order-2 md:text-right">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="inline-flex h-11 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-5 text-sm font-black text-violet-600">
                404
              </span>

              <span className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-500 shadow-sm">
                الصفحة غير موجودة
              </span>
            </div>

            <h1 className="m-0 text-[38px] font-black leading-[1.08] tracking-[-0.06em] text-zinc-950 md:text-[62px]">
              الرابط غير متوفر
            </h1>

            <p className="mx-auto mt-5 max-w-[620px] text-[15px] font-semibold leading-8 text-zinc-500 md:mx-0 md:text-[16px]">
              قد تكون الصفحة أو المنتج أو التصنيف أو الوسم الذي تبحث عنه تم
              نقله، أو إخفاؤه، أو لم يعد متاحًا حاليًا داخل المتجر.
            </p>

            {storeName ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-50 px-3.5 py-1.5 text-xs font-bold text-zinc-400">
                <StoreLogo
                  logoUrl={logoUrl}
                  storeName={storeName}
                  size={22}
                  rounded="rounded-full"
                  className="shadow-none"
                />
                <span>متجر {storeName}</span>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row md:justify-start">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-zinc-950 px-7 text-sm font-black text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-black"
              >
                <IconHome />
                <span className="text-white">العودة للرئيسية</span>
              </Link>

              <Link
                href="/categories"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-7 text-sm font-black text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50"
              >
                <IconGrid />
                <span>تصفح الأقسام</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 md:mt-9">
          <div className="mx-auto mb-4 flex max-w-[430px] items-center justify-center gap-4 text-center">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-200 to-violet-200" />
            <span className="text-sm font-black text-zinc-950">
              روابط قد تساعدك
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-violet-200" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <QuickLinkCard
              href="/"
              icon={<IconSearch />}
              title="ابدأ من جديد"
              text="ارجع للرئيسية وابحث عن المنتج المناسب."
            />

            <QuickLinkCard
              href="/categories"
              icon={<IconBox />}
              title="منتجات المتجر"
              text="تصفح المنتجات والتصنيفات من واجهة المتجر."
            />

            <QuickLinkCard
              href="/cart"
              icon={<IconCart />}
              title="سلتك محفوظة"
              text="راجع المنتجات التي أضفتها قبل إتمام الطلب."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function StoreNotFound() {
  let ctx: any = null;

  try {
    ctx = await resolveStoreContext();
  } catch {
    ctx = null;
  }

  if (!ctx?.store || !isMalakTheme(ctx)) {
    return <NotFoundContent />;
  }

  const h = await headers();

  const device = detectDeviceFromUA(
    h.get("user-agent") || "",
    h.get("sec-ch-ua-mobile"),
  );

  const seoMode = await getSeoUrlMode(ctx.store.id);

  const [bootstrap, initialCartCount] = await Promise.all([
    getMalakBootstrap({
      store: {
        id: ctx.store.id,
        slug: ctx.store.slug,
        name: ctx.store.name,
        logo_url: ctx.store.logo_url ?? null,
        favicon_url: ctx.store.favicon_url ?? null,
      },
      seoMode,
      themeOptions: ctx?.theme?.options ?? null,
      version_id: ctx?.theme?.version_id ?? "published",
    }),
    getInitialCartCount(ctx.store.id).catch(() => 0),
  ]);

  const pageData = {
    route: "not_found",
    bootstrap,
    theme: {
      bootstrap,
      options: ctx?.theme?.options ?? {},
      version_id: ctx?.theme?.version_id ?? "published",
    },
  };

  const appCtx = {
    ...ctx,
    device,
    seoMode,
    data: pageData,
    bootstrap,
    initialCartCount,
    theme: {
      ...(ctx?.theme ?? {}),
      key: "malak",
      theme_key: "malak",
      version_id: ctx?.theme?.version_id ?? "published",
      options: ctx?.theme?.options ?? {},
    },
  };

  return (
    <MalakTheme ctx={appCtx as any}>
      <NotFoundContent
        storeName={ctx.store.name}
        logoUrl={ctx.store.logo_url ?? null}
      />
    </MalakTheme>
  );
}