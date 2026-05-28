// FILE: apps/storefront/src/app/checkout/_components/CheckoutSteps.tsx

"use client";

import type { CSSProperties } from "react";
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

function getProgress(activeVisual: VisualKey) {
  const activeIndex = steps.findIndex((step) => step.key === activeVisual);
  const safeIndex = Math.max(0, activeIndex);

  if (steps.length <= 1) return 0;

  return Math.round((safeIndex / (steps.length - 1)) * 100);
}

function StepIcon({
  step,
  completed,
  locked,
}: {
  step: (typeof steps)[number];
  completed: boolean;
  locked: boolean;
}) {
  return (
    <span className="co-steps__mark" aria-hidden="true">
      {step.key === "cart" ? (
        <ShoppingBag size={14} />
      ) : completed ? (
        <Check size={14} />
      ) : locked ? (
        <Lock size={12} />
      ) : (
        step.id
      )}
    </span>
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
  const progress = getProgress(activeVisual);

  const style = {
    "--co-steps-progress": `${progress}%`,
  } as CSSProperties & Record<"--co-steps-progress", string>;

  return (
    <div
      className="co-steps"
      style={style}
      aria-label="خطوات إتمام الطلب"
      data-active-step={activeVisual}
    >
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
            className={[
              "co-steps__item",
              current ? "is-current" : "",
              completed ? "is-completed" : "",
              locked ? "is-locked" : "",
              clickable ? "is-clickable" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={!clickable}
            aria-current={current ? "step" : undefined}
            aria-disabled={!clickable ? "true" : "false"}
            aria-label={step.title}
            onClick={() => {
              if (!clickable || !step.realKey) return;
              onStepClick?.(step.realKey);
            }}
          >
            <StepIcon step={step} completed={completed} locked={locked} />

            <span className="co-steps__title">{step.title}</span>
            <span className="co-steps__line" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}