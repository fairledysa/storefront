// FILE: apps/storefront/src/app/checkout/_components/ShippingStep.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Loader2, Truck } from "lucide-react";

type Shipping = {
  id: string;
  name: string;
  eta: string;
  price: string;
  recommended?: boolean;

  price_amount?: number;
  original_price?: string | null;
  original_price_amount?: number | null;
  free_shipping_applied?: boolean;
  price_label?: string | null;

  cod?: boolean;
  cod_fee?: string | null;
};

type ConfirmResult = {
  ok?: boolean;
  summary?: any;
  cart?: any;
  order?: any;
  state?: any;
};

let shippingCacheKey = "";
let shippingCache: Shipping[] | null = null;
let shippingCachePromise: Promise<Shipping[]> | null = null;

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function normalizeDigits(value: string) {
  const map: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };

  return value.replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d);
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function parseShippingPrice(value: unknown): number | null {
  const raw = normalizeDigits(String(value ?? "").trim());
  if (!raw) return null;

  const low = raw.toLowerCase();

  if (low.includes("free") || raw.includes("مجاني") || raw.includes("مجان")) {
    return 0;
  }

  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "").trim();
  if (!cleaned) return null;

  const v = Number(cleaned);
  return Number.isFinite(v) ? round2(Math.max(0, v)) : null;
}

function dispatchCheckoutEvent(name: string, detail?: any) {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }, 0);
}

function patchShippingSummary(option: Shipping) {
  const shipping = parseShippingPrice(option.price);
  if (shipping == null) return;

  dispatchCheckoutEvent("checkout:summaryPatch", {
    patch: {
      shipping,
      payment_fee: 0,
      payment_method: null,
    },
    reconcile: false,
  });
}

function pushSummary(summary: any) {
  if (summary) {
    dispatchCheckoutEvent("checkout:summaryPatch", {
      summary,
      reconcile: false,
    });
  } else {
    dispatchCheckoutEvent("checkout:refresh");
  }
}

function setSubmitEnabled(enabled: boolean) {
  dispatchCheckoutEvent("checkout:submitEnabled", { enabled });
}

function getCachedShippingOptions(key: string) {
  if (shippingCacheKey === key && shippingCache) return shippingCache;
  return null;
}

function clearShippingCache() {
  shippingCacheKey = "";
  shippingCache = null;
  shippingCachePromise = null;
}

async function fetchShippingOptionsCached(key: string) {
  const cached = getCachedShippingOptions(key);
  if (cached) return cached;

  if (shippingCacheKey === key && shippingCachePromise) {
    return shippingCachePromise;
  }

  shippingCacheKey = key;
  shippingCache = null;

  shippingCachePromise = fetch("/api/checkout/shipping/options", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
    },
  })
    .then(async (r) => {
      const j = await safeJson(r);
      const list: Shipping[] = Array.isArray(j?.options) ? j.options : [];

      shippingCache = list;
      return list;
    })
    .catch(() => {
      shippingCache = [];
      return [];
    })
    .finally(() => {
      shippingCachePromise = null;
    });

  return shippingCachePromise;
}

function hasFreeShipping(option: Shipping | null | undefined) {
  return Boolean(
    option?.free_shipping_applied &&
      option?.original_price &&
      String(option.original_price).trim(),
  );
}

function ShippingPriceView({
  option,
  compact = false,
}: {
  option: Shipping;
  compact?: boolean;
}) {
  const isFree = hasFreeShipping(option);

  if (isFree) {
    return (
      <div
        dir="ltr"
        className={[
          "inline-grid justify-items-end text-left",
          compact ? "gap-0.5" : "gap-1",
        ].join(" ")}
      >
        <span
          className={[
            "font-black text-zinc-400 line-through decoration-red-500 decoration-2",
            compact ? "text-[11px]" : "text-[12px]",
          ].join(" ")}
        >
          {option.original_price}
        </span>

        <span
          className={[
            "font-black text-emerald-700",
            compact ? "text-[12px]" : "text-[13px]",
          ].join(" ")}
        >
          {option.price_label || "الشحن مجانًا"}
        </span>
      </div>
    );
  }

  return (
    <span
      dir="ltr"
      className={compact ? "text-sm font-black" : "text-[13px] font-black"}
    >
      {option.price}
    </span>
  );
}

function ShippingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[18px] border border-zinc-200 bg-white px-3 py-3 sm:rounded-[22px] sm:px-4 sm:py-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-32 animate-pulse rounded-full bg-zinc-100" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded-full bg-zinc-100" />
            </div>

            <div className="h-4 w-14 animate-pulse rounded-full bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShippingStep(props: {
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  confirmedId?: string;
  addressId?: string;
  onEdit: () => void;
  onConfirm: (
    shippingId: string,
    result?: ConfirmResult | null,
  ) => void | Promise<any>;
}) {
  const {
    isActive,
    isDone,
    isLocked,
    confirmedId,
    addressId,
    onEdit,
    onConfirm,
  } = props;

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [options, setOptions] = useState<Shipping[]>([]);
  const [value, setValue] = useState<string>(confirmedId ?? "");
  const [errorMsg, setErrorMsg] = useState("");

  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    function invalidateShippingOptions() {
      clearShippingCache();
    }

    window.addEventListener("checkout:refresh", invalidateShippingOptions);
    window.addEventListener("checkout:couponChanged", invalidateShippingOptions);

    return () => {
      mountedRef.current = false;
      loadSeqRef.current += 1;

      window.removeEventListener("checkout:refresh", invalidateShippingOptions);
      window.removeEventListener(
        "checkout:couponChanged",
        invalidateShippingOptions,
      );
    };
  }, []);

  useEffect(() => {
    if (confirmedId) {
      setValue(confirmedId);
    }
  }, [confirmedId]);

  useEffect(() => {
    if (isLocked) {
      setOptions([]);
      setValue("");
      setErrorMsg("");
      setSubmitEnabled(false);
      return;
    }

    const seq = ++loadSeqRef.current;
    const cacheKey = `address:${addressId || "none"}`;
    const cached = getCachedShippingOptions(cacheKey);

    setErrorMsg("");
    setSubmitEnabled(false);

    if (cached) {
      setOptions(cached);

      setValue((prev) => {
        if (confirmedId) return confirmedId;
        if (prev && cached.some((x) => x.id === prev)) return prev;
        return cached[0]?.id ?? "";
      });

      setLoading(false);
      return;
    }

    setLoading(true);

    fetchShippingOptionsCached(cacheKey)
      .then((list) => {
        if (!mountedRef.current || seq !== loadSeqRef.current) return;

        setOptions(list);

        setValue((prev) => {
          if (confirmedId) return confirmedId;
          if (prev && list.some((x) => x.id === prev)) return prev;
          return list[0]?.id ?? "";
        });
      })
      .finally(() => {
        if (mountedRef.current && seq === loadSeqRef.current) {
          setLoading(false);
        }
      });
  }, [addressId, confirmedId, isLocked]);

  useEffect(() => {
    if (!isActive || isLocked || isDone || loading || confirming) return;
    if (!value || !options.length) return;

    const row = options.find((x) => x.id === value);
    if (!row) return;

    patchShippingSummary(row);
    setSubmitEnabled(false);
  }, [value, options, isActive, isLocked, isDone, loading, confirming]);

  const picked = useMemo(() => {
    const id = confirmedId ?? value;
    return options.find((x) => x.id === id);
  }, [confirmedId, value, options]);

  function onPick(nextId: string) {
    if (confirming || loading || isLocked || !isActive || isDone) return;

    const row = options.find((x) => x.id === nextId);
    if (!row) return;

    setValue(nextId);
    setErrorMsg("");
    setSubmitEnabled(false);
    patchShippingSummary(row);
  }

  async function confirmCurrent() {
    if (isLocked || !isActive || loading || confirming || !value) return;

    const row = options.find((x) => x.id === value);
    if (!row) return;

    setConfirming(true);
    setSubmitEnabled(false);
    setErrorMsg("");
    patchShippingSummary(row);

    try {
      const result = (await onConfirm(value, null)) as ConfirmResult | null;

      if (!result?.ok) {
        setErrorMsg("تعذر اعتماد شركة الشحن. حاول مرة أخرى.");
        return;
      }

      pushSummary(result.summary ?? null);
    } catch (e: any) {
      setErrorMsg(e?.message || "تعذر اعتماد شركة الشحن. حاول مرة أخرى.");
    } finally {
      if (mountedRef.current) {
        setConfirming(false);
      }
    }
  }

  if (isDone && picked) {
    return (
      <StepShell
        title="شركة الشحن"
        subtitle="تم اختيار طريقة الشحن — يمكنك تعديلها قبل الدفع"
        icon={<Truck className="h-5 w-5 text-zinc-800" />}
        isActive={isActive}
        isDone
        isLocked={false}
        onEdit={confirming ? undefined : onEdit}
      >
        <div className="rounded-[18px] border border-amber-700/25 bg-[#fffaf1] px-3 py-3 sm:rounded-[22px] sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="min-w-0 truncate text-sm font-black text-zinc-950">
              {picked.name}
            </div>

            <span className="rounded-full border border-amber-900/15 bg-white px-2 py-0.5 text-[11px] font-black text-stone-700 sm:text-[12px]">
              محدد
            </span>

            <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:text-[12px]">
              {picked.eta}
            </span>

            {picked.recommended ? (
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:text-[12px]">
                موصى به
              </span>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px]">
            <div className="text-zinc-500">تكلفة الشحن</div>

            <ShippingPriceView option={picked} />
          </div>
        </div>
      </StepShell>
    );
  }

  const canConfirmShipping = Boolean(
    value && !confirming && !loading && !isLocked && isActive,
  );

  return (
    <StepShell
      title="شركة الشحن"
      subtitle={
        isLocked ? "أكمل عنوان الشحن أولًا" : "اختر طريقة التوصيل المناسبة"
      }
      icon={<Truck className="h-5 w-5 text-zinc-800" />}
      isActive={isActive}
      isDone={false}
      isLocked={isLocked}
      rightChip={<span>الخطوة 2</span>}
    >
      <div className="-mt-1 sm:mt-0">
        {loading ? (
          <ShippingSkeleton />
        ) : options.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center sm:rounded-[20px]">
            <div className="text-sm font-black text-zinc-800">
              لا توجد خيارات شحن متاحة
            </div>

            <div className="mt-1 text-[13px] leading-6 text-zinc-500">
              تأكد من اختيار عنوان صحيح أو جرّب لاحقًا.
            </div>
          </div>
        ) : (
          <RadioGroup
            value={value}
            onValueChange={onPick}
            className="space-y-2"
            disabled={isLocked || !isActive || loading || confirming}
          >
            {options.map((option) => {
              const selected = option.id === value;
              const inputId = `checkout-shipping-${option.id}`;
              const free = hasFreeShipping(option);

              return (
                <div
                  key={option.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onPick(option.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick(option.id);
                    }
                  }}
                  className={[
                    "group rounded-[18px] border px-3 py-3 text-right transition active:scale-[0.997]",
                    "sm:rounded-[22px] sm:px-4 sm:py-4",
                    confirming ? "pointer-events-none opacity-80" : "",
                    selected
                      ? "border-amber-700/30 bg-[#fffaf1] shadow-none sm:shadow-[0_12px_32px_rgba(15,23,42,0.055)]"
                      : "border-zinc-200 bg-white hover:bg-zinc-50",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "relative min-h-[50px] pr-9 sm:pr-10",
                      free ? "pl-[118px] sm:pl-[136px]" : "pl-[88px] sm:pl-[106px]",
                    ].join(" ")}
                  >
                    <RadioGroupItem
                      id={inputId}
                      value={option.id}
                      className="absolute right-0 top-1 shrink-0 border-zinc-300 text-zinc-950"
                    />

                    <div
                      className={[
                        "absolute left-0 top-0.5 flex justify-end text-zinc-950",
                        free ? "w-[112px] sm:w-[130px]" : "max-w-[78px] sm:max-w-[98px]",
                      ].join(" ")}
                    >
                      <ShippingPriceView option={option} compact />
                    </div>

                    <label
                      htmlFor={inputId}
                      className="block min-w-0 cursor-pointer text-right"
                    >
                      <div
                        dir="rtl"
                        className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2"
                      >
                        <div className="min-w-0 max-w-full truncate text-sm font-black text-zinc-950">
                          {option.name}
                        </div>

                        {selected ? (
                          <span className="shrink-0 rounded-full border border-amber-900/15 bg-white px-2 py-0.5 text-[11px] font-black text-stone-700 sm:text-[12px]">
                            محدد
                          </span>
                        ) : null}

                        {option.recommended ? (
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500 sm:bg-zinc-50 sm:text-[12px]">
                            موصى به
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-right text-[12px] leading-5 text-zinc-500 sm:mt-1.5 sm:text-[13px]">
                        {option.eta}
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        )}
      </div>

      {errorMsg ? (
        <div className="mt-3 rounded-2xl border border-red-500/15 bg-red-500/5 px-3 py-2 text-center text-[12px] leading-5 text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <Button
        className="mt-3 h-11 w-full rounded-[18px] bg-zinc-950 text-[14px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] transition hover:bg-zinc-800 active:scale-[0.99] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none sm:mt-4 sm:h-12 sm:rounded-[20px] sm:text-[15px]"
        disabled={!canConfirmShipping}
        onClick={confirmCurrent}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {loading || confirming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}

          {loading
            ? "جاري تحميل الشحن..."
            : confirming
              ? "جاري اعتماد شركة الشحن..."
              : "اعتماد شركة الشحن"}
        </span>
      </Button>
    </StepShell>
  );
}