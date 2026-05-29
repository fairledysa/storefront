// FILE: apps/storefront/src/themes/malak/app-shell/_components/CurrencySwitcher.tsx

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon/Icon";
import type { MalakBootstrapCurrencies } from "../../bootstrap/types";

type Props = {
  storeId?: string | null;
  currencies?: MalakBootstrapCurrencies | null;
};

type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  enabled: boolean;
};

const FALLBACK_COOKIE_NAME = "mk_selected_currency";

const CURRENCY_STORAGE_KEYS = [
  "mk_selected_currency",
  "mk_currency",
  "malak_currency",
  "store_currency",
  "selected_currency",
  "currency",
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeCode(value: unknown) {
  const code = text(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function readBool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled"].includes(v)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(v)) return false;
  }

  return fallback;
}

function getCookieName(currencies?: MalakBootstrapCurrencies | null) {
  return text(currencies?.selected_cookie_name) || FALLBACK_COOKIE_NAME;
}

function setCurrencyCookie(name: string, code: string) {
  const cookieName = text(name);
  const currencyCode = normalizeCode(code);

  if (!cookieName || !currencyCode) return;

  document.cookie = `${encodeURIComponent(cookieName)}=${encodeURIComponent(
    currencyCode,
  )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";

  const cookieName = text(name);
  if (!cookieName) return "";

  const target = `${encodeURIComponent(cookieName)}=`;
  const parts = document.cookie.split(";");

  for (const part of parts) {
    const row = part.trim();

    if (!row.startsWith(target)) continue;

    try {
      return decodeURIComponent(row.slice(target.length));
    } catch {
      return row.slice(target.length);
    }
  }

  return "";
}

function writeCurrencyStorage(code: string, cookieName: string) {
  const currencyCode = normalizeCode(code);
  if (!currencyCode) return;

  const keys = Array.from(
    new Set([cookieName, FALLBACK_COOKIE_NAME, ...CURRENCY_STORAGE_KEYS]),
  ).filter(Boolean);

  for (const key of keys) {
    try {
      window.localStorage.setItem(key, currencyCode);
    } catch {
      //
    }

    setCurrencyCookie(key, currencyCode);
  }
}

function readStoredCurrencyCode(cookieName: string, availableCodes: Set<string>) {
  if (typeof window === "undefined") return "";

  const keys = Array.from(
    new Set([cookieName, FALLBACK_COOKIE_NAME, ...CURRENCY_STORAGE_KEYS]),
  ).filter(Boolean);

  for (const key of keys) {
    try {
      const code = normalizeCode(window.localStorage.getItem(key));
      if (code && availableCodes.has(code)) return code;
    } catch {
      //
    }
  }

  for (const key of keys) {
    const code = normalizeCode(readCookie(key));
    if (code && availableCodes.has(code)) return code;
  }

  return "";
}

function normalizeCurrencyItems(
  currencies?: MalakBootstrapCurrencies | null,
): CurrencyOption[] {
  const rawItems = Array.isArray(currencies?.items) ? currencies.items : [];

  const seen = new Set<string>();
  const out: CurrencyOption[] = [];

  for (const item of rawItems as any[]) {
    const code = normalizeCode(
      item?.code ?? item?.currency_code ?? item?.currencyCode,
    );

    if (!code || seen.has(code)) continue;

    seen.add(code);

    out.push({
      code,
      symbol: text(item?.symbol) || code,
      name: text(item?.name_ar || item?.name || item?.name_en) || code,
      enabled: readBool(item?.enabled ?? item?.is_enabled ?? item?.isEnabled, true),
    });
  }

  return out.filter((item) => item.enabled);
}

function emitCurrencyChanged(code: string) {
  const currencyCode = normalizeCode(code);
  if (!currencyCode) return;

  const detail = {
    code: currencyCode,
    currency: currencyCode,
    currency_code: currencyCode,
    currencyCode: currencyCode,
    selectedCurrency: currencyCode,
    selected_currency: currencyCode,
  };

  window.dispatchEvent(new CustomEvent("currency:changed", { detail }));
  window.dispatchEvent(new CustomEvent("currency-changed", { detail }));
  window.dispatchEvent(new CustomEvent("mk:currency:changed", { detail }));
  window.dispatchEvent(new CustomEvent("mk:currency-changed", { detail }));
  window.dispatchEvent(new CustomEvent("malak:currency:changed", { detail }));
  window.dispatchEvent(new CustomEvent("malak:currency-changed", { detail }));
}

function emitCartChangedSoon() {
  window.dispatchEvent(new CustomEvent("cart:changed"));

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("cart:changed"));
  }, 140);
}

export default function CurrencySwitcher({ storeId, currencies }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const abortRef = useRef<AbortController | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const items = useMemo(() => normalizeCurrencyItems(currencies), [currencies]);

  const availableCodes = useMemo(() => {
    return new Set(items.map((item) => item.code));
  }, [items]);

  const cookieName = getCookieName(currencies);

  const bootstrapActiveCode = normalizeCode(
    currencies?.active_code ||
      currencies?.selected_code ||
      currencies?.default_code ||
      items[0]?.code,
  );

  const safeActiveCode =
    bootstrapActiveCode && availableCodes.has(bootstrapActiveCode)
      ? bootstrapActiveCode
      : items[0]?.code || "";

  const [selectedCode, setSelectedCode] = useState(() => safeActiveCode);
  const [pendingCode, setPendingCode] = useState("");

  useEffect(() => {
    if (!safeActiveCode) return;

    const storedCode = readStoredCurrencyCode(cookieName, availableCodes);
    setSelectedCode(storedCode || safeActiveCode);
  }, [safeActiveCode, cookieName, availableCodes]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  if (!currencies?.has_multiple) return null;
  if (items.length <= 1) return null;

  const activeItem =
    items.find((item) => item.code === selectedCode) ||
    items.find((item) => item.code === safeActiveCode) ||
    items[0];

  async function handleChange(nextCodeValue: string) {
    const nextCode = normalizeCode(nextCodeValue);
    if (!nextCode) return;
    if (!availableCodes.has(nextCode)) return;
    if (nextCode === selectedCode) return;

    const previousCode = selectedCode || safeActiveCode;

    abortRef.current?.abort();

    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    setSelectedCode(nextCode);
    setPendingCode(nextCode);

    writeCurrencyStorage(nextCode, cookieName);
    emitCurrencyChanged(nextCode);
    emitCartChangedSoon();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/currency", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          store_id: storeId,
          currency_code: nextCode,
          cookie_name: cookieName,
        }),
      });

      if (!response.ok) {
        throw new Error("Currency update failed");
      }

      writeCurrencyStorage(nextCode, cookieName);
      emitCurrencyChanged(nextCode);
      emitCartChangedSoon();

      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;

        startTransition(() => {
          router.refresh();
        });
      }, 80);
    } catch (error: any) {
      if (error?.name === "AbortError") return;

      const rollbackCode = previousCode || safeActiveCode;

      if (rollbackCode) {
        setSelectedCode(rollbackCode);
        writeCurrencyStorage(rollbackCode, cookieName);
        emitCurrencyChanged(rollbackCode);
        emitCartChangedSoon();
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      setPendingCode("");
    }
  }

  return (
    <div
      className={[
        "mk-currency-switcher",
        pendingCode ? "mk-currency-switcher--pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      dir="ltr"
      data-pending={pendingCode ? "true" : "false"}
    >
      <span className="mk-currency-switcher__icon" aria-hidden="true">
        <Icon icon={"Global" as any} className="text-[16px]" />
      </span>

      <label className="sr-only" htmlFor="mk-desktop-currency-switcher">
        اختيار العملة
      </label>

      <select
        id="mk-desktop-currency-switcher"
        className="mk-currency-switcher__select"
        value={activeItem?.code || selectedCode}
        aria-label="اختيار العملة"
        onChange={(event) => handleChange(event.target.value)}
      >
        {items.map((currency) => {
          const code = normalizeCode(currency.code);
          if (!code) return null;

          return (
            <option key={code} value={code}>
              {currency.symbol} {code} - {currency.name}
            </option>
          );
        })}
      </select>
    </div>
  );
}