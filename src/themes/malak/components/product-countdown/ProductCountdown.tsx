//apps/storefront/src/themes/malak/components/product-countdown/ProductCountdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  target: string;
  compact?: boolean;
  label?: string | null;
};

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getLeft(target: string) {
  const ts = new Date(target).getTime();
  if (!Number.isFinite(ts)) return null;

  const diff = ts - Date.now();
  if (diff <= 0) return null;

  const total = Math.floor(diff / 1000);

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return { days, hours, minutes, seconds };
}

function Unit({
  value,
  label,
  compact = false,
}: {
  value: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: compact ? 52 : 68,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: "100%",
          height: compact ? 44 : 54,
          borderRadius: 8,
          background: "#fb7185",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: compact ? 22 : 28,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          boxShadow: "0 6px 18px rgba(251,113,133,0.22)",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: compact ? 10 : 12,
          color: "#111827",
          fontWeight: 700,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Colon({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        paddingTop: compact ? 10 : 12,
        fontSize: compact ? 24 : 30,
        fontWeight: 900,
        color: "#111827",
        lineHeight: 1,
      }}
    >
      :
    </div>
  );
}

export default function ProductCountdown({
  target,
  compact = false,
  label = "ينتهي الخصم خلال",
}: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const left = useMemo(() => getLeft(target), [target, tick]);

  if (!left) return null;

  return (
    <div
      dir="ltr"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: compact ? "flex-start" : "center",
      }}
    >
      {label ? (
        <div
          style={{
            direction: "rtl",
            width: "100%",
            textAlign: compact ? "right" : "center",
            fontSize: compact ? 12 : 13,
            fontWeight: 900,
            color: "#be123c",
          }}
        >
          {label}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: compact ? 6 : 8,
          flexWrap: "wrap",
        }}
      >
        <Unit value={String(left.days)} label="Days" compact={compact} />
        <Colon compact={compact} />
        <Unit value={pad2(left.hours)} label="Hours" compact={compact} />
        <Colon compact={compact} />
        <Unit value={pad2(left.minutes)} label="Minutes" compact={compact} />
        <Colon compact={compact} />
        <Unit value={pad2(left.seconds)} label="Seconds" compact={compact} />
      </div>
    </div>
  );
}