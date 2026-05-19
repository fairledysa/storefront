"use client";

import { cn } from "@/lib/utils";

type StepKey = "address" | "payment" | "review";

const steps: Array<{ key: StepKey; title: string; desc: string }> = [
  { key: "address", title: "العنوان", desc: "بيانات الشحن" },
  { key: "payment", title: "الدفع", desc: "اختر طريقة الدفع" },
  { key: "review", title: "المراجعة", desc: "تأكيد الطلب" },
];

export default function StepsHeader(props: {
  step: StepKey;
  onStepChange: (s: StepKey) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4 sm:p-6">
      <div className="grid grid-cols-3 gap-2">
        {steps.map((s, idx) => {
          const active = props.step === s.key;
          const done = steps.findIndex((x) => x.key === props.step) > idx;

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => props.onStepChange(s.key)}
              className={cn(
                "rounded-xl border px-3 py-3 text-right transition",
                active ? "border-primary" : "border-border",
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>

                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
