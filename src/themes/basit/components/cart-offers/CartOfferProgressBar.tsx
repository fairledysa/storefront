"use client";

import type { CSSProperties } from "react";

type CartOfferProgressTier = {
  min: number;
  label: string;
  type: string;
  value: number;
  maxDiscount?: number | null;
  reached: boolean;
};

export type CartOfferProgressData = {
  offerId: string;
  title: string;
  message: string;
  metric: "subtotal" | "item_count";
  currentValue: number;
  progressPercent: number;
  nextTierMin: number | null;
  remainingToNextTier: number;
  activeTierMin: number | null;
  activeTierLabel: string | null;
  tiers: CartOfferProgressTier[];
  blockedByCoupon?: boolean;
};

type Props = {
  progress?: CartOfferProgressData | null;
  currencySymbol?: string;
  currencyDecimals?: number;
  compact?: boolean;
  variant?: "hero" | "compact" | "mobile";
};

function n(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, n(value)));
}

function clampDecimals(value: unknown) {
  const num = Number(value ?? 2);
  if (!Number.isFinite(num)) return 2;
  return Math.max(0, Math.min(4, Math.floor(num)));
}

function formatAmount(value: number, symbol: string, decimals: number) {
  const formatted = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals > 0 ? 0 : 0,
  }).format(Math.max(0, n(value)));

  return symbol ? `${formatted} ${symbol}` : formatted;
}

function formatTierMin(args: {
  metric: CartOfferProgressData["metric"];
  min: number;
  currencySymbol: string;
  currencyDecimals: number;
}) {
  if (args.metric === "item_count") {
    return `${Math.floor(n(args.min))} منتجات`;
  }

  return formatAmount(args.min, args.currencySymbol, args.currencyDecimals);
}

export default function CartOfferProgressBar({
  progress,
  currencySymbol = "ر.س",
  currencyDecimals = 2,
  compact = false,
  variant,
}: Props) {
  if (!progress || !Array.isArray(progress.tiers) || !progress.tiers.length) {
    return null;
  }

  const tiers = progress.tiers
    .map((tier) => ({
      ...tier,
      min: Math.max(0, n(tier.min)),
      label: s(tier.label),
    }))
    .filter((tier) => tier.min > 0 && tier.label);

  if (!tiers.length) return null;

  const decimals = clampDecimals(currencyDecimals);
  const symbol = s(currencySymbol) || "ر.س";
  const fill = clampPercent(progress.progressPercent);
  const visualVariant = variant || (compact ? "compact" : "hero");
  const rootStyle = {
    "--offer-progress": `${fill}%`,
    "--tiers-count": tiers.length,
  } as CSSProperties;

  return (
    <div
      className={[
        "malak-cartOfferProgress",
        `malak-cartOfferProgress--${visualVariant}`,
        "malak-cart-offerProgress",
        progress.blockedByCoupon ? "is-blocked" : "",
        visualVariant === "compact"
          ? "is-compact"
          : visualVariant === "mobile"
            ? "is-mobile"
            : "is-hero",
      ]
        .filter(Boolean)
        .join(" ")}
      style={rootStyle}
    >
      <div className="malak-cartOfferProgress__head malak-cart-offerProgress__title">
        <span>{s(progress.title) || "عروض السلة"}</span>
        {progress.activeTierLabel ? (
          <strong className="malak-cartOfferProgress__badge">
            {progress.activeTierLabel}
          </strong>
        ) : null}
      </div>

      <div
        className="malak-cartOfferProgress__rail malak-cart-offerProgress__scroll"
        aria-hidden
      >
        <div className="malak-cartOfferProgress__track malak-cart-offerProgress__track">
          <div className="malak-cartOfferProgress__fill malak-cart-offerProgress__fill" />

          {tiers.map((tier, index) => {
            const pos =
              tiers.length <= 1
                ? 50
                : clampPercent((index / (tiers.length - 1)) * 100);

            return (
              <div
                key={`${tier.min}-${tier.label}`}
                className={[
                  "malak-cartOfferProgress__tier",
                  "malak-cart-offerProgress__tier",
                  tier.reached ? "is-reached" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ "--tier-pos": `${pos}%` } as CSSProperties}
              >
                <span className="malak-cartOfferProgress__dot malak-cart-offerProgress__dot" />
                <span className="malak-cartOfferProgress__tierLabel malak-cart-offerProgress__tierLabel">
                  {tier.label}
                </span>
                <span className="malak-cartOfferProgress__tierMeta malak-cart-offerProgress__tierMin">
                  {formatTierMin({
                    metric: progress.metric,
                    min: tier.min,
                    currencySymbol: symbol,
                    currencyDecimals: decimals,
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="malak-cartOfferProgress__message malak-cart-offerProgress__message">
        {s(progress.message)}
      </p>
    </div>
  );
}
