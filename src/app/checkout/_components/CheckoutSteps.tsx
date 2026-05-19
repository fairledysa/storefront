// FILE: apps/storefront/src/app/checkout/_components/CheckoutSteps.tsx
"use client";

import { Check, Lock, ShoppingBag } from "lucide-react";

type StepKey = "address" | "shipping" | "payment";
type VisualKey = "cart" | "address" | "shipping" | "payment" | "confirm";

type DoneState = {
  address: boolean;
  shipping: boolean;
  payment: boolean;
};

const steps: Array<{
  id: number;
  key: VisualKey;
  realKey?: StepKey;
  title: string;
}> = [
  { id: 1, key: "cart", title: "السلة" },
  { id: 2, key: "address", realKey: "address", title: "العنوان" },
  { id: 3, key: "shipping", realKey: "shipping", title: "الشحن" },
  { id: 4, key: "payment", realKey: "payment", title: "الدفع" },
  { id: 5, key: "confirm", title: "التأكيد" },
];

function getVisualActive(active: StepKey, done: DoneState): VisualKey {
  if (done.payment) return "confirm";
  return active;
}

function visualIndex(key: VisualKey) {
  return steps.findIndex((s) => s.key === key);
}

function isCompleted(key: VisualKey, done: DoneState) {
  if (key === "cart") return true;
  if (key === "address") return done.address;
  if (key === "shipping") return done.shipping;
  if (key === "payment") return done.payment;
  return false;
}

function isLocked(key: VisualKey, done: DoneState) {
  if (key === "cart") return false;
  if (key === "address") return false;
  if (key === "shipping") return !done.address;
  if (key === "payment") return !done.shipping;
  if (key === "confirm") return !done.payment;
  return true;
}

function getStatusLabel(
  key: VisualKey,
  activeVisual: VisualKey,
  done: DoneState,
) {
  if (isCompleted(key, done)) return "تم";
  if (key === activeVisual) return "الحالية";
  return "بانتظارك";
}

function StepMark({
  step,
  current,
  completed,
  locked,
  size = "md",
}: {
  step: (typeof steps)[number];
  current: boolean;
  completed: boolean;
  locked: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={[
        "grid shrink-0 place-items-center rounded-full border font-black shadow-sm transition",
        size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs",
        current
          ? "border-zinc-950 bg-zinc-950 text-white"
          : completed
            ? "border-zinc-300 bg-white text-zinc-950"
            : locked
              ? "border-zinc-200 bg-white text-zinc-300"
              : "border-zinc-300 bg-white text-zinc-600",
      ].join(" ")}
    >
      {step.key === "cart" ? (
        <ShoppingBag className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      ) : completed ? (
        <Check className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      ) : locked ? (
        <Lock className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      ) : (
        step.id
      )}
    </div>
  );
}

export default function CheckoutSteps({
  active,
  done,
  onStepClick,
}: {
  active: StepKey;
  done: DoneState;
  onStepClick?: (step: StepKey) => void;
}) {
  const activeVisual = getVisualActive(active, done);
  const activeIdx = Math.max(0, visualIndex(activeVisual));
  const pct = Math.max(0, Math.min(100, (activeIdx / (steps.length - 1)) * 100));
  const activeStep = steps[activeIdx] ?? steps[0];
  const desktopFillPct = Math.max(0, Math.min(84, pct * 0.84));

  return (
    <div
      className={[
        "rounded-[20px] border border-zinc-200 bg-white",
        "px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]",
        "sm:rounded-[24px] sm:px-4 sm:py-3.5",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-black tracking-tight text-zinc-950 sm:text-[16px]">
            إتمام الطلب
          </div>

          <div className="mt-0.5 text-[11px] leading-4 text-zinc-500 sm:text-[12px]">
            {activeStep.title} — {getStatusLabel(activeStep.key, activeVisual, done)}
          </div>
        </div>

        <div className="inline-flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-black text-zinc-700">
          {activeIdx + 1} / 5
        </div>
      </div>

      {/* Mobile */}
      <div className="mt-2.5 sm:hidden">
        <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-zinc-950 transition-all duration-300"
            style={{
              width: `${pct}%`,
              marginInlineStart: "auto",
            }}
          />
        </div>

        <div className="mt-1.5 grid grid-cols-5 gap-0.5">
          {steps.map((step) => {
            const current = step.key === activeVisual;
            const completed = isCompleted(step.key, done);
            const locked = isLocked(step.key, done);
            const clickable = Boolean(
              step.realKey && onStepClick && (current || completed) && !locked,
            );

            return (
              <button
                key={step.key}
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (!clickable || !step.realKey) return;
                  onStepClick?.(step.realKey);
                }}
                className={[
                  "flex min-w-0 flex-col items-center rounded-2xl px-1 py-1.5 transition",
                  current ? "bg-zinc-50" : "",
                  clickable ? "active:scale-[0.98]" : "",
                ].join(" ")}
              >
                <StepMark
                  step={step}
                  current={current}
                  completed={completed}
                  locked={locked}
                  size="sm"
                />

                <div
                  className={[
                    "mt-1 max-w-full truncate text-[10px] font-black leading-4",
                    current
                      ? "text-zinc-950"
                      : completed
                        ? "text-zinc-600"
                        : "text-zinc-400",
                  ].join(" ")}
                >
                  {step.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop */}
      <div className="relative mt-4 hidden sm:block">
        <div className="relative px-2">
          <div className="absolute left-[8%] right-[8%] top-4 h-px bg-zinc-200" />

          <div
            className="absolute right-[8%] top-4 h-[2px] rounded-full bg-zinc-950 transition-all duration-300"
            style={{ width: `${desktopFillPct}%` }}
          />

          <div className="relative z-10 grid grid-cols-5 gap-2">
            {steps.map((step) => {
              const current = step.key === activeVisual;
              const completed = isCompleted(step.key, done);
              const locked = isLocked(step.key, done);
              const clickable = Boolean(
                step.realKey &&
                  onStepClick &&
                  (current || completed) &&
                  !locked,
              );

              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (!clickable || !step.realKey) return;
                    onStepClick?.(step.realKey);
                  }}
                  className={[
                    "group flex flex-col items-center text-center transition",
                    clickable ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                >
                  <StepMark
                    step={step}
                    current={current}
                    completed={completed}
                    locked={locked}
                  />

                  <div
                    className={[
                      "mt-2 text-[12px] font-black leading-4",
                      current
                        ? "text-zinc-950"
                        : completed
                          ? "text-zinc-700"
                          : "text-zinc-500",
                    ].join(" ")}
                  >
                    {step.title}
                  </div>

                  <div
                    className={[
                      "mt-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                      current
                        ? "bg-zinc-950 text-white"
                        : completed
                          ? "bg-zinc-100 text-zinc-700"
                          : locked
                            ? "bg-zinc-50 text-zinc-400"
                            : "bg-zinc-100 text-zinc-500",
                    ].join(" ")}
                  >
                    {getStatusLabel(step.key, activeVisual, done)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}