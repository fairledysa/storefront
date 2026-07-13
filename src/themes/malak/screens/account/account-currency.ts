"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CurrencyItem = { code: string; symbol: string; name: string; decimals: number; rate: number; is_default?: boolean };
type CurrencyContext = { base: CurrencyItem; active: CurrencyItem; items: CurrencyItem[] };
const FALLBACK: CurrencyContext = { base: { code: "SAR", symbol: "ر.س", name: "ريال سعودي", decimals: 2, rate: 1 }, active: { code: "SAR", symbol: "ر.س", name: "ريال سعودي", decimals: 2, rate: 1 }, items: [] };
function positive(value: unknown) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 1; }

export function useAccountCurrency() {
  const [context, setContext] = useState<CurrencyContext>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/account/currency-context", { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok && payload?.base && payload?.active) setContext(payload as CurrencyContext);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const listener = () => void load();
    for (const name of ["currency:changed", "currency-changed", "mk:currency:changed", "mk:currency-changed", "malak:currency:changed", "malak:currency-changed"]) window.addEventListener(name, listener as EventListener);
    return () => { for (const name of ["currency:changed", "currency-changed", "mk:currency:changed", "mk:currency-changed", "malak:currency:changed", "malak:currency-changed"]) window.removeEventListener(name, listener as EventListener); };
  }, [load]);

  return useMemo(() => {
    const baseRate = positive(context.base.rate); const activeRate = positive(context.active.rate);
    const toDisplay = (amount: number, sourceCode?: string) => {
      const source = context.items.find((item) => item.code === String(sourceCode || context.base.code).toUpperCase()) || context.base;
      return (Number(amount || 0) * positive(source.rate)) / activeRate;
    };
    const toBase = (amount: number) => (Number(amount || 0) * activeRate) / baseRate;
    const format = (amount: number, sourceCode?: string, signed?: "credit" | "debit") => {
      const converted = toDisplay(amount, sourceCode); const sign = signed === "credit" ? "+" : signed === "debit" ? "−" : "";
      return `${sign}${new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 0, maximumFractionDigits: context.active.decimals }).format(Math.abs(converted))} ${context.active.symbol || context.active.code}`;
    };
    return { ...context, loading, reload: load, toDisplay, toBase, format };
  }, [context, loading, load]);
}
