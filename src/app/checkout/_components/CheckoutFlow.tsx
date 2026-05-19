// FILE: apps/storefront/src/app/checkout/_components/CheckoutFlow.tsx
"use client";

import { useEffect, useState } from "react";
import CheckoutSteps from "./CheckoutSteps";
import AddressStep from "./AddressStep";
import ShippingStep from "./ShippingStep";
import PaymentStep from "./PaymentStep";
import CheckoutOrderOptions, {
  type CheckoutOrderOptionAnswer,
} from "./CheckoutOrderOptions";
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";

type StepKey = "address" | "shipping" | "payment";

type ConfirmResult = {
  ok?: boolean;
  summary?: any;
  cart?: {
    id?: string;
    address_id?: string | null;
    shipping_id?: string | null;
    payment_method?: string | null;
  };
  order?: any;
  state?: {
    address_id?: string | null;
    shipping_id?: string | null;
    payment_method?: string | null;
    payment_ready?: boolean;
  };
};

type OrderOptionsGateState = {
  valid: boolean;
  loading: boolean;
  requiredCount: number;
  answers: CheckoutOrderOptionAnswer[];
};

const ORDER_OPTIONS_READY: OrderOptionsGateState = {
  valid: true,
  loading: false,
  requiredCount: 0,
  answers: [],
};

const ORDER_OPTIONS_PENDING: OrderOptionsGateState = {
  valid: false,
  loading: true,
  requiredCount: 0,
  answers: [],
};

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function dispatchCheckoutEvent(name: string, detail?: any) {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }, 0);
}

function refreshSummary() {
  dispatchCheckoutEvent("checkout:refresh");
}

function pushSummary(summary: any) {
  if (!summary) {
    refreshSummary();
    return;
  }

  dispatchCheckoutEvent("checkout:summaryPatch", {
    summary,
    reconcile: false,
  });
}

function setSubmitEnabled(enabled: boolean) {
  dispatchCheckoutEvent("checkout:submitEnabled", { enabled });
}

function readAddressId(result: ConfirmResult | null | undefined) {
  return s(result?.state?.address_id) || s(result?.cart?.address_id);
}

function readShippingId(result: ConfirmResult | null | undefined) {
  return s(result?.state?.shipping_id) || s(result?.cart?.shipping_id);
}

function toFriendlyCheckoutError(error: unknown) {
  const raw = s((error as any)?.message || error);

  if (raw === "NEED_ADDRESS_FOR_SHIPPING") {
    return "اختر عنوان الشحن أولًا قبل اختيار شركة الشحن.";
  }

  if (raw === "SHIPPING_NOT_FOUND") {
    return "شركة الشحن المختارة غير متاحة حاليًا. اختر شركة شحن أخرى.";
  }

  if (raw === "SHIPPING_NOT_AVAILABLE") {
    return "شركة الشحن المختارة غير مفعّلة حاليًا.";
  }

  if (raw === "SHIPPING_NOT_AVAILABLE_FOR_CITY") {
    return "شركة الشحن المختارة غير متاحة لهذا العنوان.";
  }

  if (
    raw === "NEED_SHIPPING_FOR_PAYMENT" ||
    raw === "NEED_SHIPPING_FOR_COD" ||
    raw === "NEED_SHIPPING_FOR_PAYMENT_METHOD"
  ) {
    return "يجب اعتماد شركة الشحن أولًا قبل اختيار طريقة الدفع.";
  }

  if (raw === "NEED_ADDRESS_FOR_PAYMENT" || raw === "NEED_ADDRESS_FOR_COD") {
    return "يجب اعتماد عنوان الشحن أولًا قبل اختيار طريقة الدفع.";
  }

  if (raw === "PAYMENT_METHOD_INVALID") {
    return "طريقة الدفع المختارة غير صحيحة.";
  }

  if (raw === "BANK_TRANSFER_NOT_AVAILABLE") {
    return "التحويل البنكي غير متاح حاليًا.";
  }

  if (raw === "COD_NOT_ENABLED" || raw === "COD_NOT_AVAILABLE") {
    return "الدفع عند الاستلام غير متاح مع شركة الشحن الحالية.";
  }

  if (raw === "COD_NOT_AVAILABLE_FOR_CITY") {
    return "الدفع عند الاستلام غير متاح لهذا العنوان.";
  }

  if (raw === "CART_NOT_OPEN" || raw === "CART_NOT_FOUND") {
    return "تعذر العثور على سلة نشطة. ارجع للسلة وحاول مرة أخرى.";
  }

  return raw || "تعذر تنفيذ العملية. حاول مرة أخرى.";
}

function CheckoutBusyOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[95] flex cursor-wait items-center justify-center bg-white/35 backdrop-blur-[1px]">
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-[12px] font-black text-zinc-600 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
        {label}
      </div>
    </div>
  );
}

function OrderOptionsGateCard({
  loading,
  requiredCount,
}: {
  loading: boolean;
  requiredCount: number;
}) {
  return (
    <div className="rounded-[30px] border border-zinc-200 bg-white p-5 text-right shadow-[0_18px_60px_rgba(15,23,42,0.055)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-zinc-950 text-white">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LockKeyhole className="h-5 w-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-black text-zinc-950">
            {loading ? "جاري حفظ خيارات الطلب..." : "أكمل خيارات الطلب أولًا"}
          </div>

          <div className="mt-1 text-[12px] font-bold leading-6 text-zinc-500">
            {loading
              ? "نحفظ اختياراتك ونحدّث ملخص الطلب قبل عرض طرق الدفع."
              : requiredCount > 0
                ? "عبّئ الخيارات المطلوبة أعلاه، وبعدها ستظهر طرق الدفع مباشرة."
                : "سيتم عرض طرق الدفع بعد تحديث ملخص الطلب."}
          </div>
        </div>
      </div>
    </div>
  );
}

function getBusyLabel(step: StepKey | null) {
  if (step === "address") return "جاري اعتماد العنوان...";
  if (step === "shipping") return "جاري اعتماد شركة الشحن...";
  if (step === "payment") return "جاري اعتماد طريقة الدفع...";
  return "جاري المعالجة...";
}

export default function CheckoutFlow() {
  const [active, setActive] = useState<StepKey>("address");
  const [busyStep, setBusyStep] = useState<StepKey | null>(null);
  const [flowError, setFlowError] = useState("");

  const [done, setDone] = useState({
    address: false,
    shipping: false,
    payment: false,
  });

  const [confirmed, setConfirmed] = useState<{
    addressId?: string;
    shippingId?: string;
  }>({});

  const [orderOptions, setOrderOptions] =
    useState<OrderOptionsGateState>(ORDER_OPTIONS_READY);

  const isBusy = busyStep !== null;

  const orderOptionsEnabled = Boolean(done.shipping && confirmed.shippingId);

  const orderOptionsReady =
    !orderOptionsEnabled || (orderOptions.valid && !orderOptions.loading);

  useEffect(() => {
    function onOrderOptionsChange(evt: Event) {
      const e = evt as CustomEvent<{
        valid?: boolean;
        loading?: boolean;
        answers?: CheckoutOrderOptionAnswer[];
        requiredCount?: number;
      }>;

      const detail = e.detail || {};
      const loading = Boolean(detail.loading);
      const valid = Boolean(detail.valid) && !loading;

      setOrderOptions({
        valid,
        loading,
        answers: Array.isArray(detail.answers) ? detail.answers : [],
        requiredCount: Math.max(0, Math.floor(n(detail.requiredCount))),
      });

      if (!valid || loading) {
        setDone((d) => ({
          ...d,
          payment: false,
        }));

        setSubmitEnabled(false);
      }
    }

    window.addEventListener(
      "checkout:orderOptionsChange",
      onOrderOptionsChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "checkout:orderOptionsChange",
        onOrderOptionsChange as EventListener,
      );
    };
  }, []);

  async function confirmCheckout(patch: Record<string, any>) {
    const r = await fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
      credentials: "same-origin",
    });

    const j = (await safeJson(r)) as ConfirmResult | any;

    if (!r.ok) {
      const msg = s(j?.message_ar) || s(j?.error) || `CONFIRM_HTTP_${r.status}`;
      throw new Error(msg || "CONFIRM_FAILED");
    }

    if (!j || j.ok !== true) {
      const msg = s(j?.message_ar) || s(j?.error) || "CONFIRM_BAD_RESPONSE";
      throw new Error(msg);
    }

    return j as ConfirmResult;
  }

  function resetAfterAddressChange(addressId?: string) {
    setConfirmed({
      addressId,
    });

    setOrderOptions(ORDER_OPTIONS_READY);
    setSubmitEnabled(false);
  }

  function resetAfterShippingChange(addressId?: string) {
    setConfirmed({
      addressId,
    });

    setOrderOptions(ORDER_OPTIONS_READY);
    setSubmitEnabled(false);
  }

  function editPaymentStep() {
    if (isBusy) return;

    if (!done.address || !done.shipping || !confirmed.shippingId) {
      setFlowError("اعتمد شركة الشحن أولًا قبل تعديل الدفع.");
      setActive("shipping");
      setSubmitEnabled(false);
      return;
    }

    if (!orderOptionsReady) {
      setFlowError("أكمل خيارات الطلب أولًا قبل تعديل الدفع.");
      setActive("payment");
      setSubmitEnabled(false);
      return;
    }

    setFlowError("");

    setDone((d) => ({
      ...d,
      payment: false,
    }));

    setActive("payment");
    setSubmitEnabled(false);
  }

  function goToStep(step: StepKey) {
    if (isBusy) return;

    if (step === active) {
      if (step === "payment" && done.payment) {
        editPaymentStep();
      }

      return;
    }

    setFlowError("");

    if (step === "address") {
      setDone({
        address: false,
        shipping: false,
        payment: false,
      });

      resetAfterAddressChange(confirmed.addressId);
      setActive("address");
      return;
    }

    if (step === "shipping") {
      if (!done.address || !confirmed.addressId) return;

      setDone((d) => ({
        ...d,
        shipping: false,
        payment: false,
      }));

      resetAfterShippingChange(confirmed.addressId);
      setActive("shipping");
      return;
    }

    if (step === "payment") {
      if (!done.address || !done.shipping || !confirmed.shippingId) {
        setFlowError("اعتمد شركة الشحن أولًا قبل الانتقال إلى الدفع.");
        setActive("shipping");
        setSubmitEnabled(false);
        return;
      }

      setDone((d) => ({
        ...d,
        payment: false,
      }));

      setActive("payment");
      setSubmitEnabled(false);
    }
  }

  return (
    <section className="relative space-y-4">
      {busyStep ? <CheckoutBusyOverlay label={getBusyLabel(busyStep)} /> : null}

      <CheckoutSteps active={active} done={done} onStepClick={goToStep} />

      {flowError ? (
        <div className="rounded-[18px] border border-red-500/15 bg-red-500/5 px-4 py-3 text-center text-[12px] font-bold leading-6 text-red-700">
          <span className="inline-flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {flowError}
          </span>
        </div>
      ) : null}

      {active === "address" ? (
        <AddressStep
          isActive={!isBusy}
          isDone={done.address}
          confirmedId={confirmed.addressId}
          onEdit={() => goToStep("address")}
          onConfirm={async (addressId) => {
            const prevAddressId = confirmed.addressId;
            const addressChanged = cAddressChanged(prevAddressId, addressId);

            setBusyStep("address");
            setFlowError("");
            setSubmitEnabled(false);
            setOrderOptions(ORDER_OPTIONS_READY);

            try {
              const result = await confirmCheckout({ address_id: addressId });

              const serverAddressId = readAddressId(result) || addressId;
              const serverShippingId = addressChanged
                ? ""
                : readShippingId(result) || confirmed.shippingId || "";

              setConfirmed({
                addressId: serverAddressId,
                shippingId: serverShippingId || undefined,
              });

              setDone((d) => ({
                ...d,
                address: true,
                shipping: Boolean(serverShippingId) && !addressChanged,
                payment: false,
              }));

              if (serverShippingId && !addressChanged) {
                setOrderOptions(ORDER_OPTIONS_PENDING);
                setActive("payment");
              } else {
                setOrderOptions(ORDER_OPTIONS_READY);
                setActive("shipping");
              }

              pushSummary(result.summary);

              return result;
            } catch (e) {
              setFlowError(toFriendlyCheckoutError(e));
              console.error(e);
              return null;
            } finally {
              setBusyStep(null);
            }
          }}
        />
      ) : null}

      {active === "shipping" ? (
        <ShippingStep
          isActive={!isBusy}
          isDone={done.shipping}
          isLocked={!done.address || !confirmed.addressId}
          confirmedId={confirmed.shippingId}
          addressId={confirmed.addressId}
          onEdit={() => goToStep("shipping")}
          onConfirm={async (shippingId) => {
            if (!confirmed.addressId) {
              setFlowError("اختر عنوان الشحن أولًا.");
              setSubmitEnabled(false);
              return null;
            }

            setBusyStep("shipping");
            setFlowError("");
            setSubmitEnabled(false);
            setOrderOptions(ORDER_OPTIONS_PENDING);

            try {
              const result = await confirmCheckout({ shipping_id: shippingId });

              const serverShippingId = readShippingId(result) || shippingId;

              if (!serverShippingId) {
                throw new Error("NEED_SHIPPING_FOR_PAYMENT");
              }

              setConfirmed((c) => ({
                addressId: c.addressId,
                shippingId: serverShippingId,
              }));

              setDone((d) => ({
                ...d,
                shipping: true,
                payment: false,
              }));

              setActive("payment");
              pushSummary(result.summary);

              return result;
            } catch (e) {
              setFlowError(toFriendlyCheckoutError(e));

              setDone((d) => ({
                ...d,
                shipping: false,
                payment: false,
              }));

              setConfirmed((c) => ({
                addressId: c.addressId,
              }));

              setOrderOptions(ORDER_OPTIONS_READY);
              setActive("shipping");
              console.error(e);
              return null;
            } finally {
              setBusyStep(null);
            }
          }}
        />
      ) : null}

      {active === "payment" && orderOptionsEnabled ? (
        <CheckoutOrderOptions enabled={orderOptionsEnabled} />
      ) : null}

      {active === "payment" ? (
        orderOptionsReady ? (
          <PaymentStep
            isActive={!isBusy && Boolean(confirmed.shippingId)}
            isDone={done.payment}
            isLocked={!done.shipping || !confirmed.shippingId}
            onEdit={editPaymentStep}
            onConfirm={async (result) => {
              setBusyStep("payment");
              setFlowError("");
              setSubmitEnabled(false);

              try {
                if (!orderOptionsReady) {
                  throw new Error("ORDER_OPTIONS_REQUIRED");
                }

                setDone((d) => ({
                  ...d,
                  payment: true,
                }));

                pushSummary((result as ConfirmResult | null)?.summary);
                setSubmitEnabled(true);
              } catch (e) {
                const raw = s((e as any)?.message || e);

                setFlowError(
                  raw === "ORDER_OPTIONS_REQUIRED"
                    ? "أكمل خيارات الطلب أولًا قبل اعتماد طريقة الدفع."
                    : toFriendlyCheckoutError(e),
                );

                setDone((d) => ({
                  ...d,
                  payment: false,
                }));

                setSubmitEnabled(false);
                console.error(e);
              } finally {
                setBusyStep(null);
              }
            }}
          />
        ) : (
          <OrderOptionsGateCard
            loading={orderOptions.loading}
            requiredCount={orderOptions.requiredCount}
          />
        )
      ) : null}
    </section>
  );
}

function cAddressChanged(prev?: string, next?: string) {
  return Boolean(prev && next && prev !== next);
}