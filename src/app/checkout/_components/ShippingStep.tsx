// FILE: apps/storefront/src/app/checkout/_components/ShippingStep.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepShell from "./StepShell";
import { Loader2, Pencil, Truck } from "lucide-react";

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

function ShippingPriceView({ option }: { option: Shipping }) {
  const isFree = hasFreeShipping(option);

  if (isFree) {
    return (
      <span className="co-price-free" dir="ltr">
        <span>{option.original_price}</span>
        <strong>{option.price_label || "مجاني"}</strong>
      </span>
    );
  }

  return (
    <span dir="ltr" className="co-option-price">
      {option.price}
    </span>
  );
}

function ShippingSkeleton() {
  return (
    <div className="co-options-list">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="co-option co-option--skeleton">
          <span className="co-skeleton co-skeleton--radio" />
          <div>
            <span className="co-skeleton co-skeleton--title" />
            <span className="co-skeleton co-skeleton--line" />
          </div>
          <span className="co-skeleton co-skeleton--money" />
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
      <section className="co-salla-saved-step" aria-label="شركة الشحن">
        <div className="co-salla-saved-row co-salla-saved-row--shipping">
          <div className="co-salla-saved-row__main">
            <Truck size={21} className="co-salla-saved-row__icon" />

            <div className="co-salla-saved-row__content">
              <h2>شركة الشحن</h2>

              <p>
                <strong>{picked.name}</strong>
                {picked.eta ? <span> - {picked.eta}</span> : null}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="co-salla-saved-row__edit"
            onClick={onEdit}
            disabled={confirming}
          >
            <Pencil size={14} />
            تعديل
          </button>
        </div>
      </section>
    );
  }

  const canConfirmShipping = Boolean(
    value && !confirming && !loading && !isLocked && isActive,
  );

  return (
    <StepShell
      title="شركة الشحن"
      subtitle={isLocked ? "أكمل العنوان أولًا" : "اختر شركة الشحن المناسبة"}
      icon={<Truck size={20} />}
      isActive={isActive}
      isDone={false}
      isLocked={isLocked}
      rightChip={<span>الشحن</span>}
    >
      {loading ? (
        <ShippingSkeleton />
      ) : options.length === 0 ? (
        <div className="co-empty-small">
          <strong>لا توجد خيارات شحن متاحة</strong>
          <span>تأكد من اختيار عنوان صحيح أو جرّب لاحقًا.</span>
        </div>
      ) : (
        <div className="co-options-list">
          {options.map((option) => {
            const selected = option.id === value;
            const inputId = `checkout-shipping-${option.id}`;

            return (
              <label
                key={option.id}
                htmlFor={inputId}
                className={[
                  "co-option",
                  selected ? "is-selected" : "",
                  confirming ? "is-disabled" : "",
                ].join(" ")}
              >
                <input
                  id={inputId}
                  name="checkout-shipping"
                  type="radio"
                  checked={selected}
                  onChange={() => onPick(option.id)}
                  disabled={isLocked || !isActive || loading || confirming}
                  className="co-radio"
                />

                <span className="co-option-main">
                  <strong>{option.name}</strong>
                  <small>{option.eta}</small>
                </span>

                {option.recommended ? (
                  <span className="co-mini-badge">موصى به</span>
                ) : null}

                <ShippingPriceView option={option} />
              </label>
            );
          })}
        </div>
      )}

      {errorMsg ? <div className="co-field-error">{errorMsg}</div> : null}

      <button
        type="button"
        className="co-btn co-btn--dark co-btn--full"
        disabled={!canConfirmShipping}
        onClick={confirmCurrent}
      >
        {loading || confirming ? (
          <Loader2 size={16} className="co-spin" />
        ) : null}
        {loading
          ? "جاري تحميل الشحن..."
          : confirming
            ? "جاري اعتماد شركة الشحن..."
            : "تأكيد شركة الشحن"}
      </button>
    </StepShell>
  );
}