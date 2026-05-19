// FILE: apps/storefront/src/themes/malak/screens/account/RewardsScreen.tsx
"use client";

import Link from "next/link";
import {
  Award,
  ChevronDown,
  Gift,
  Medal,
  PackageCheck,
  Sparkles,
  Star,
  TicketPercent,
  Trophy,
} from "lucide-react";
import AccountLayout from "./AccountLayout";

function RewardStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-5 shadow-[0_12px_34px_rgba(15,23,42,0.045)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[var(--mk-text-muted)]">
            {label}
          </div>

          <div className="mt-2 text-2xl font-black leading-none text-[var(--mk-text-main)]">
            {value}
          </div>

          {hint ? (
            <div className="mt-2 text-xs font-bold text-[var(--mk-text-muted)]">
              {hint}
            </div>
          ) : null}
        </div>

        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_8%,white)] text-[var(--mk-color-primary)]">
          {icon}
        </span>
      </div>
    </div>
  );
}

function EmptyRewardRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] px-5 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)] text-[var(--mk-color-primary)]">
          {icon}
        </span>

        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--mk-text-main)]">
            {title}
          </div>
          <div className="mt-1 text-xs font-bold leading-6 text-[var(--mk-text-muted)]">
            {text}
          </div>
        </div>
      </div>

      <span className="hidden rounded-full border border-[var(--mk-border-soft)] px-3 py-1 text-xs font-black text-[var(--mk-text-muted)] sm:inline-flex">
        قريباً
      </span>
    </div>
  );
}

export default function RewardsScreen() {
  return (
    <AccountLayout
      active="rewards"
      title="مكافآتي"
      subtitle="تابع نقاطك ومكافآتك المتاحة واستبدلها عند توفر العروض."
    >
      <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-7 shadow-[0_18px_60px_rgba(15,23,42,0.055)]">
          <div className="pointer-events-none absolute -start-20 -top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--mk-color-primary)_10%,transparent)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 end-10 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--mk-color-primary)_8%,transparent)] blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)] px-4 py-2 text-xs font-black text-[var(--mk-color-primary)]">
                <Sparkles size={15} strokeWidth={2.2} />
                برنامج المكافآت
              </div>

              <h2 className="text-4xl font-black leading-tight text-[var(--mk-text-main)]">
                نقاطك الحالية
              </h2>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="text-6xl font-black leading-none text-[var(--mk-color-primary)]">
                  0
                </div>
                <div className="pb-2 text-lg font-black text-[var(--mk-text-main)]">
                  نقطة
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-[var(--mk-text-muted)]">
                لا توجد نقاط أو مكافآت متاحة حالياً. عند الشراء أو تفعيل عروض
                المكافآت ستظهر تفاصيل النقاط والاستبدال هنا.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--mk-color-primary)] px-5 text-sm font-black text-[var(--mk-primary-contrast,#ffffff)] transition hover:bg-[var(--mk-primary-hover)]"
                >
                  <PackageCheck size={17} strokeWidth={2.2} />
                  تسوق الآن
                </Link>

                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-soft)] px-5 text-sm font-black text-[var(--mk-text-muted)] opacity-70"
                >
                  <Gift size={17} strokeWidth={2.2} />
                  استبدال المكافآت
                </button>
              </div>
            </div>

            <div className="relative hidden min-h-[230px] items-center justify-center lg:flex">
              <div className="absolute h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--mk-color-primary)_8%,white)]" />
              <div className="relative grid h-44 w-44 place-items-center rounded-[42px] border border-[var(--mk-primary-border)] bg-[linear-gradient(145deg,white,color-mix(in_srgb,var(--mk-color-primary)_9%,white))] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <Trophy
                  size={74}
                  strokeWidth={1.55}
                  className="text-[var(--mk-color-primary)]"
                />
              </div>

              <span className="absolute start-4 top-8 grid h-10 w-10 place-items-center rounded-2xl border border-[var(--mk-primary-border)] bg-[var(--mk-bg-card)] text-[var(--mk-color-primary)] shadow-sm">
                <Star size={18} />
              </span>

              <span className="absolute bottom-7 end-6 grid h-11 w-11 place-items-center rounded-2xl border border-[var(--mk-primary-border)] bg-[var(--mk-bg-card)] text-[var(--mk-color-primary)] shadow-sm">
                <Award size={19} />
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <RewardStat
            icon={<Medal size={21} strokeWidth={2.1} />}
            label="إجمالي النقاط"
            value="0"
            hint="كل النقاط المكتسبة"
          />

          <RewardStat
            icon={<Gift size={21} strokeWidth={2.1} />}
            label="المكافآت المتاحة"
            value="0"
            hint="جاهزة للاستخدام"
          />

          <RewardStat
            icon={<TicketPercent size={21} strokeWidth={2.1} />}
            label="القسائم المستبدلة"
            value="0"
            hint="لم يتم الاستبدال بعد"
          />
        </div>

        <section className="rounded-[28px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-5 shadow-[0_14px_42px_rgba(15,23,42,0.045)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-[var(--mk-text-main)]">
                سجل المكافآت
              </h3>
              <p className="mt-1 text-sm font-bold text-[var(--mk-text-muted)]">
                ستظهر هنا كل عمليات اكتساب واستبدال النقاط.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] px-4 text-xs font-black text-[var(--mk-text-main)]"
              >
                الكل
              </button>

              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] px-4 text-xs font-black text-[var(--mk-text-main)]"
              >
                الأحدث أولاً
                <ChevronDown size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <EmptyRewardRow
              icon={<Gift size={19} strokeWidth={2.1} />}
              title="لا توجد مكافآت حالياً"
              text="بعد توفر مكافآت أو نقاط جديدة ستظهر تفاصيلها في هذا القسم."
            />

            <EmptyRewardRow
              icon={<TicketPercent size={19} strokeWidth={2.1} />}
              title="لا توجد قسائم مستبدلة"
              text="عند استبدال نقاطك بقسائم خصم سيتم عرض القسائم هنا."
            />

            <EmptyRewardRow
              icon={<Award size={19} strokeWidth={2.1} />}
              title="لا توجد حركات نقاط"
              text="عمليات الإضافة والخصم من الرصيد ستظهر بشكل مرتب هنا."
            />
          </div>
        </section>
      </div>
    </AccountLayout>
  );
}