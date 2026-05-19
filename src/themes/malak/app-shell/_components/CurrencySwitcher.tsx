// FILE: apps/storefront/src/themes/malak/app-shell/_components/CurrencySwitcher.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon/Icon";
import type { MalakBootstrapCurrencies } from "../../bootstrap/types";

type Props = {
  storeId?: string | null;
  currencies?: MalakBootstrapCurrencies | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeCode(value: unknown) {
  const code = text(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function setCurrencyCookie(name: string, code: string) {
  const cookieName = text(name);
  const currencyCode = normalizeCode(code);

  if (!cookieName || !currencyCode) return;

  document.cookie = `${encodeURIComponent(cookieName)}=${encodeURIComponent(
    currencyCode,
  )}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export default function CurrencySwitcher({ storeId, currencies }: Props) {
  const router = useRouter();

  const items = useMemo(() => {
    return Array.isArray(currencies?.items)
      ? currencies.items.filter((item) => item?.enabled !== false)
      : [];
  }, [currencies?.items]);

  const activeCode = normalizeCode(
    currencies?.active_code ||
      currencies?.selected_code ||
      currencies?.default_code ||
      items[0]?.code,
  );

  const [selectedCode, setSelectedCode] = useState(activeCode);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSelectedCode(activeCode);
  }, [activeCode]);

  if (!currencies?.has_multiple) return null;
  if (items.length <= 1) return null;

  async function handleChange(nextCodeValue: string) {
    const nextCode = normalizeCode(nextCodeValue);
    if (!nextCode) return;
    if (nextCode === selectedCode) return;

    setSelectedCode(nextCode);
    setPending(true);

    try {
      const response = await fetch("/api/currency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: storeId,
          currency_code: nextCode,
          cookie_name: currencies?.selected_cookie_name,
        }),
      });

      if (!response.ok) {
        throw new Error("Currency update failed");
      }

      setCurrencyCookie(currencies?.selected_cookie_name || "", nextCode);
      setCurrencyCookie("mk_selected_currency", nextCode);

      window.dispatchEvent(new CustomEvent("cart:changed"));

      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("cart:changed"));
      }, 120);

      router.refresh();
    } catch {
      setSelectedCode(activeCode);
    } finally {
      setPending(false);
    }
  }

  const activeItem =
    items.find((item) => item.code === selectedCode) ||
    items.find((item) => item.code === activeCode) ||
    items[0];

  return (
    <div
      className={[
        "mk-currency-switcher",
        pending ? "mk-currency-switcher--pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      dir="ltr"
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
        disabled={pending}
        aria-label="اختيار العملة"
        onChange={(event) => handleChange(event.target.value)}
      >
        {items.map((currency) => {
          const code = normalizeCode(currency.code);
          if (!code) return null;

          const symbol = text(currency.symbol) || code;
          const name = text(currency.name_ar || currency.name) || code;

          return (
            <option key={code} value={code}>
              {symbol} {code} - {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}