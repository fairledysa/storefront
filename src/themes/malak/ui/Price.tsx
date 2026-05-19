// themes/malak/ui/Price.tsx
"use client";

type Props = {
  value: number | string;
  currency?: string;
  strong?: boolean;
};

export default function Price({ value, currency = "ر.س", strong }: Props) {
  return (
    <span className={strong ? "mk-price mk-price--strong" : "mk-price"}>
      {value} {currency}
    </span>
  );
}
