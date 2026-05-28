// FILE: apps/storefront/src/app/checkout/_components/CheckoutFlow.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import CheckoutSteps from "./CheckoutSteps";
import AddressStep from "./AddressStep";
import ShippingStep from "./ShippingStep";
import PaymentStep from "./PaymentStep";
import CheckoutOrderOptions, {
  type CheckoutOrderOptionAnswer,
} from "./CheckoutOrderOptions";
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";

type StepKey = "address" | "shipping" | "payment";

type CheckoutInitialState = {
  address_id?: string | null;
  shipping_id?: string | null;
  payment_method?: string | null;
};

type DoneState = {
  address: boolean;
  shipping: boolean;
  payment: boolean;
};

type ConfirmResult = {
  ok?: boolean;
  summary?: any;
  summary_pending?: boolean;
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
  saving: boolean;
  requiredCount: number;
  answers: CheckoutOrderOptionAnswer[];
};

const ORDER_OPTIONS_READY: OrderOptionsGateState = {
  valid: true,
  loading: false,
  saving: false,
  requiredCount: 0,
  answers: [],
};

const ORDER_OPTIONS_PENDING: OrderOptionsGateState = {
  valid: false,
  loading: true,
  saving: false,
  requiredCount: 0,
  answers: [],
};

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
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

function pushSummaryIfPresent(summary: any) {
  if (!summary) return;

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

function readPaymentMethod(result: ConfirmResult | null | undefined) {
  return s(result?.state?.payment_method) || s(result?.cart?.payment_method);
}

function readPaymentReady(result: ConfirmResult | null | undefined) {
  if (typeof result?.state?.payment_ready === "boolean") {
    return result.state.payment_ready;
  }

  return Boolean(readPaymentMethod(result));
}

function buildInitialDone(state?: CheckoutInitialState): DoneState {
  const address = Boolean(s(state?.address_id));
  const shipping = Boolean(address && s(state?.shipping_id));
  const payment = Boolean(address && shipping && s(state?.payment_method));

  return { address, shipping, payment };
}

function pickInitialActive(done: DoneState): StepKey {
  if (!done.address) return "address";
  if (!done.shipping) return "shipping";
  return "payment";
}

function cAddressChanged(prev?: string, next?: string) {
  return Boolean(prev && next && prev !== next);
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

  if (raw === "ORDER_OPTIONS_REQUIRED") {
    return "أكمل خيارات الطلب أولًا قبل اختيار طريقة الدفع.";
  }

  return raw || "تعذر تنفيذ العملية. حاول مرة أخرى.";
}

function CheckoutBusyOverlay({ label }: { label: string }) {
  return (
    <div className="co-busy-overlay">
      <div className="co-busy-pill">
        <Loader2 className="co-spin" size={16} />
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
    <div className="co-gate-card">
      <span className="co-gate-card__icon">
        {loading ? (
          <Loader2 className="co-spin" size={18} />
        ) : (
          <LockKeyhole size={18} />
        )}
      </span>

      <div>
        <div className="co-gate-card__title">
          {loading ? "جاري تحميل خيارات الطلب..." : "أكمل خيارات الطلب أولًا"}
        </div>

        <div className="co-gate-card__text">
          {loading
            ? "نجهز خيارات الطلب المطلوبة من المتجر."
            : requiredCount > 0
              ? "عبّئ الخيارات المطلوبة، وبعدها ستظهر طرق الدفع مباشرة."
              : "سيتم عرض طرق الدفع بعد تحديث خيارات الطلب."}
        </div>
      </div>
    </div>
  );
}

function getBusyLabel(step: StepKey | null) {
  if (step === "address") return "جاري اعتماد العنوان...";
  if (step === "shipping") return "جاري اعتماد شركة الشحن...";
  return "جاري المعالجة...";
}

export default function CheckoutFlow({
  initialState,
}: {
  initialState?: CheckoutInitialState;
}) {
  const initialDone = useMemo(
    () => buildInitialDone(initialState),
    [initialState],
  );

  const [active, setActive] = useState<StepKey>(() =>
    pickInitialActive(initialDone),
  );

  const [busyStep, setBusyStep] = useState<StepKey | null>(null);
  const [flowError, setFlowError] = useState("");
  const [done, setDone] = useState<DoneState>(initialDone);

  const [confirmed, setConfirmed] = useState<{
    addressId?: string;
    shippingId?: string;
    paymentMethod?: string;
  }>(() => ({
    addressId: s(initialState?.address_id) || undefined,
    shippingId: s(initialState?.shipping_id) || undefined,
    paymentMethod: s(initialState?.payment_method) || undefined,
  }));

  const [orderOptions, setOrderOptions] = useState<OrderOptionsGateState>(() =>
    initialDone.shipping ? ORDER_OPTIONS_PENDING : ORDER_OPTIONS_READY,
  );

  const isBusy = busyStep !== null;
  const orderOptionsEnabled = Boolean(done.shipping && confirmed.shippingId);

  const orderOptionsReadyForPayment =
    !orderOptionsEnabled || (orderOptions.valid && !orderOptions.loading);

  const orderOptionsReadyForSubmit =
    !orderOptionsEnabled ||
    (orderOptions.valid && !orderOptions.loading && !orderOptions.saving);

  useEffect(() => {
    function onOrderOptionsChange(evt: Event) {
      const e = evt as CustomEvent<{
        valid?: boolean;
        loading?: boolean;
        saving?: boolean;
        answers?: CheckoutOrderOptionAnswer[];
        requiredCount?: number;
      }>;

      const detail = e.detail || {};
      const answers = Array.isArray(detail.answers) ? detail.answers : [];

      const rawLoading = Boolean(detail.loading);
      const rawSaving = Boolean(detail.saving);

      const inferredSaving =
        !rawSaving && rawLoading && answers.length > 0 && detail.valid === false;

      const saving = rawSaving || inferredSaving;
      const loading = rawLoading && !saving;
      const valid = Boolean(detail.valid) && !loading && !saving;

      setOrderOptions({
        valid,
        loading,
        saving,
        answers,
        requiredCount: Math.max(0, Math.floor(n(detail.requiredCount))),
      });

      if (!valid || loading) {
        setDone((d) => ({
          ...d,
          payment: false,
        }));

        setSubmitEnabled(false);
        return;
      }

      if (saving) {
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

  useEffect(() => {
    setSubmitEnabled(Boolean(done.payment && orderOptionsReadyForSubmit));
  }, [done.payment, orderOptionsReadyForSubmit]);

  async function confirmCheckout(patch: Record<string, any>) {
    const r = await fetch("/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...patch,
        include_summary: true,
      }),
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
    setConfirmed({ addressId });
    setOrderOptions(ORDER_OPTIONS_READY);
    setSubmitEnabled(false);
  }

  function resetAfterShippingChange(addressId?: string) {
    setConfirmed({ addressId });
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

    if (!orderOptionsReadyForPayment) {
      setFlowError("أكمل خيارات الطلب أولًا قبل تعديل الدفع.");
      setActive("payment");
      setSubmitEnabled(false);
      return;
    }

    setFlowError("");
    setActive("payment");
    setSubmitEnabled(Boolean(done.payment && orderOptionsReadyForSubmit));
  }

  function goToStep(step: StepKey) {
    if (isBusy) return;

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

      if (!orderOptionsReadyForPayment) {
        setFlowError("أكمل خيارات الطلب أولًا قبل الانتقال إلى الدفع.");
        setActive("payment");
        setSubmitEnabled(false);
        return;
      }

      setActive("payment");
      setSubmitEnabled(Boolean(done.payment && orderOptionsReadyForSubmit));
    }
  }

  return (
    <section className="co-flow" data-active-step={active}>
      {busyStep ? <CheckoutBusyOverlay label={getBusyLabel(busyStep)} /> : null}

      <div className="co-checkout-card">
        <CheckoutSteps active={active} done={done} onStepClick={goToStep} />

        {flowError ? (
          <div className="co-flow-error">
            <AlertTriangle size={17} />
            {flowError}
          </div>
        ) : null}

        <AddressStep
          isActive={active === "address" && !isBusy}
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

              const serverPaymentMethod =
                !addressChanged && serverShippingId
                  ? readPaymentMethod(result) || confirmed.paymentMethod || ""
                  : "";

              setConfirmed({
                addressId: serverAddressId,
                shippingId: serverShippingId || undefined,
                paymentMethod: serverPaymentMethod || undefined,
              });

              setDone({
                address: true,
                shipping: Boolean(serverShippingId) && !addressChanged,
                payment:
                  Boolean(serverShippingId) &&
                  Boolean(serverPaymentMethod) &&
                  !addressChanged,
              });

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

        <ShippingStep
          isActive={active === "shipping" && !isBusy}
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
              const serverPaymentMethod = readPaymentMethod(result) || "";

              if (!serverShippingId) {
                throw new Error("NEED_SHIPPING_FOR_PAYMENT");
              }

              setConfirmed((c) => ({
                addressId: c.addressId,
                shippingId: serverShippingId,
                paymentMethod: serverPaymentMethod || undefined,
              }));

              setDone((d) => ({
                ...d,
                shipping: true,
                payment: Boolean(serverPaymentMethod),
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

        {active === "payment" && orderOptionsEnabled ? (
          <div className="co-step-extra co-step-extra--order-options">
            <CheckoutOrderOptions enabled={orderOptionsEnabled} />
          </div>
        ) : null}

        {active === "payment" && !orderOptionsReadyForPayment ? (
          <div className="co-step-extra co-step-extra--gate">
            <OrderOptionsGateCard
              loading={orderOptions.loading}
              requiredCount={orderOptions.requiredCount}
            />
          </div>
        ) : null}

        <PaymentStep
          isActive={
            active === "payment" &&
            !isBusy &&
            Boolean(confirmed.shippingId) &&
            orderOptionsReadyForPayment
          }
          isDone={done.payment}
          isLocked={
            !done.shipping ||
            !confirmed.shippingId ||
            !orderOptionsReadyForPayment
          }
          confirmedId={confirmed.paymentMethod}
          onEdit={editPaymentStep}
          onConfirm={async (result) => {
            setFlowError("");

            try {
              if (!orderOptionsReadyForPayment) {
                throw new Error("ORDER_OPTIONS_REQUIRED");
              }

              const resultObj = (result as ConfirmResult | null) ?? null;

              const serverPaymentMethod = readPaymentMethod(resultObj);
              const nextPaymentMethod =
                serverPaymentMethod || confirmed.paymentMethod || "";

              const paymentConfirmed =
                Boolean(nextPaymentMethod) ||
                Boolean(resultObj?.ok && readPaymentReady(resultObj));

              if (!paymentConfirmed && !resultObj?.ok) {
                throw new Error("PAYMENT_METHOD_INVALID");
              }

              setConfirmed((c) => ({
                ...c,
                paymentMethod: nextPaymentMethod || c.paymentMethod,
              }));

              setDone((d) => ({
                ...d,
                payment: true,
              }));

              setActive("payment");

              pushSummaryIfPresent(resultObj?.summary);

              setSubmitEnabled(Boolean(orderOptionsReadyForSubmit));
            } catch (e) {
              setFlowError(toFriendlyCheckoutError(e));

              setDone((d) => ({
                ...d,
                payment: false,
              }));

              setActive("payment");
              setSubmitEnabled(false);
              console.error(e);
            }
          }}
        />
      </div>
    </section>
  );
}