// FILE: apps/storefront/src/app/checkout/_components/CheckoutOrderOptions.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquareText,
} from "lucide-react";

type OrderOptionType = "text" | "number" | "choices" | "appointment";

type Choice = {
  id: string;
  label: string;
  price_customer?: number | string | null;
};

type OrderOption = {
  id: string;
  type: OrderOptionType;
  name: string;
  description?: string | null;
  is_required: boolean;
  text_size?: "small" | "large" | null;
  allow_multiple?: boolean | null;
  price_customer?: number | string | null;
  metadata?: any;
  choices?: Choice[];
};

type CurrencyInfo = {
  code: string;
  symbol: string;
  decimal_digits: number;
};

export type CheckoutOrderOptionAnswer = {
  option_id: string;
  type: OrderOptionType;
  value?: string;
  choice_ids?: string[];
  metadata?: Record<string, any>;
};

type AnswersState = Record<string, CheckoutOrderOptionAnswer>;

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
};

const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "active", "enabled"].includes(v)) return true;
    if (["false", "0", "no", "off", "inactive", "disabled"].includes(v)) return false;
  }

  return fallback;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => s(value)).filter(Boolean)));
}

function formatMoney(currency: CurrencyInfo | null, value: any) {
  const amount = n(value);

  if (!(amount > 0)) return "";

  const code = currency?.code || "SAR";

  return `${code} ${amount.toLocaleString("en-US")}`;
}

function getAppointmentConfig(
  option: OrderOption,
): Record<string, any> & { days: Record<string, any> } {
  const meta = safeObject(option.metadata);
  const appointment = safeObject(meta.appointment ?? meta.schedule ?? meta.booking);

  return {
    ...appointment,
    days: safeObject(appointment.days),
  };
}

function getAppointmentMode(option: OrderOption) {
  const config = getAppointmentConfig(option);
  const mode = s(config.scheduleMode ?? config.schedule_mode ?? config.mode);

  return mode === "days_times" || mode === "days-times" || mode === "daysAndTimes"
    ? "days_times"
    : "days";
}

function toISODate(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return toISODate(d);
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(`${baseISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function getDayKeyFromDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  const day = d.getDay();

  if (day === 0) return "sunday";
  if (day === 1) return "monday";
  if (day === 2) return "tuesday";
  if (day === 3) return "wednesday";
  if (day === 4) return "thursday";
  if (day === 5) return "friday";

  return "saturday";
}

function readLeadDays(option: OrderOption) {
  const config = getAppointmentConfig(option);

  const raw =
    config.minimumLeadDays ??
    config.minimum_lead_days ??
    config.bookingLeadDays ??
    config.booking_lead_days ??
    config.reserveAfterDays ??
    config.reserve_after_days ??
    config.preparationDays ??
    config.preparation_days ??
    0;

  return Math.max(0, Math.floor(n(raw)));
}

function readMaxAdvanceDays(option: OrderOption) {
  const config = getAppointmentConfig(option);

  const raw =
    config.maxAdvanceDays ??
    config.max_advance_days ??
    config.maximumAdvanceDays ??
    config.maximum_advance_days ??
    config.availableForDays ??
    config.available_for_days ??
    null;

  if (raw === null || raw === undefined || raw === "") return null;

  const value = Math.floor(n(raw));

  return value > 0 ? value : null;
}

function exceptionDates(option: OrderOption) {
  const config = getAppointmentConfig(option);

  const raw = safeArray(
    config.exceptions ??
      config.disabledDates ??
      config.disabled_dates ??
      config.blockedDates ??
      config.blocked_dates,
  );

  const dates: string[] = [];

  for (const item of raw) {
    const date = s(item?.date ?? item?.day ?? item);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.push(date);
  }

  return new Set(dates);
}

function getRangesForDate(option: OrderOption, date: string) {
  if (!date) return [];

  const config = getAppointmentConfig(option);
  const dayKey = getDayKeyFromDate(date);
  const day = safeObject(config.days?.[dayKey]);

  if (day.enabled === false) return [];
  if (day.enabled === 0) return [];

  const ranges = safeArray(day.ranges ?? day.times ?? day.slots);

  return ranges
    .map((range) => ({
      from: s(range?.from ?? range?.start ?? range?.startTime),
      to: s(range?.to ?? range?.end ?? range?.endTime),
    }))
    .filter((range) => range.from && range.to);
}

function isDateAllowed(option: OrderOption, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const today = todayISO();
  const minDate = addDaysISO(today, readLeadDays(option));

  if (date < minDate) return false;

  const maxAdvanceDays = readMaxAdvanceDays(option);

  if (maxAdvanceDays != null) {
    const maxDate = addDaysISO(today, maxAdvanceDays);
    if (date > maxDate) return false;
  }

  if (exceptionDates(option).has(date)) return false;

  const config = getAppointmentConfig(option);
  const dayKey = getDayKeyFromDate(date);
  const day = safeObject(config.days?.[dayKey]);

  if (Object.keys(config.days).length === 0) return true;

  return bool(day.enabled, false);
}

function validateAnswer(
  option: OrderOption,
  answer: CheckoutOrderOptionAnswer | undefined,
) {
  if (!option.is_required) return true;

  if (option.type === "text") return Boolean(s(answer?.value));

  if (option.type === "number") {
    const value = s(answer?.value);
    if (!value) return false;
    return Number.isFinite(Number(value));
  }

  if (option.type === "choices") {
    return Array.isArray(answer?.choice_ids) && answer.choice_ids.length > 0;
  }

  if (option.type === "appointment") {
    const date = s(answer?.metadata?.date);
    if (!date) return false;
    if (!isDateAllowed(option, date)) return false;

    if (getAppointmentMode(option) === "days_times") {
      return Boolean(s(answer?.metadata?.from) && s(answer?.metadata?.to));
    }

    return true;
  }

  return true;
}

function dispatchOrderOptionsChange(detail: {
  valid: boolean;
  loading?: boolean;
  answers: CheckoutOrderOptionAnswer[];
  requiredCount: number;
}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("checkout:orderOptionsChange", {
      detail,
    }),
  );
}

function dispatchSummaryPatch(summary: any) {
  if (typeof window === "undefined" || !summary) return;

  window.dispatchEvent(
    new CustomEvent("checkout:summaryPatch", {
      detail: {
        summary,
        reconcile: false,
      },
    }),
  );
}

function buildInitialAppointmentMonth(selectedDate: string) {
  if (selectedDate) {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  const d = new Date();
  d.setDate(1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function buildSelectedChoiceMetadata(option: OrderOption, choiceIds: string[]) {
  const choices = Array.isArray(option.choices) ? option.choices : [];
  const choiceMap = new Map<string, Choice>();

  for (const choice of choices) {
    const id = s(choice.id);
    if (id) choiceMap.set(id, choice);
  }

  const selected = choiceIds
    .map((id) => choiceMap.get(id))
    .filter(Boolean) as Choice[];

  return {
    selected_choice_ids: uniq([
      ...choiceIds,
      ...selected.map((choice) => s(choice.label)),
    ]),
    selected_choices: selected.map((choice) => ({
      id: s(choice.id),
      label: s(choice.label),
      price_customer: choice.price_customer ?? 0,
    })),
  };
}

export default function CheckoutOrderOptions({
  enabled,
}: {
  enabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<OrderOption[]>([]);
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const readyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);

  const requiredCount = useMemo(
    () => options.filter((option) => option.is_required).length,
    [options],
  );

  const answersList = useMemo(
    () => Object.values(answers).filter((answer) => s(answer.option_id)),
    [answers],
  );

  const localValid = useMemo(() => {
    if (loading) return false;

    return options.every((option) => validateAnswer(option, answers[option.id]));
  }, [loading, options, answers]);

  const valid = localValid && !loading && !saving && !saveError;

  useEffect(() => {
    dispatchOrderOptionsChange({
      valid,
      loading: loading || saving,
      answers: answersList,
      requiredCount,
    });
  }, [valid, loading, saving, answersList, requiredCount]);

  useEffect(() => {
    if (!enabled) {
      readyRef.current = false;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      setLoading(false);
      setSaving(false);
      setOptions([]);
      setAnswers({});
      setCurrency(null);
      setError("");
      setSaveError("");

      dispatchOrderOptionsChange({
        valid: true,
        loading: false,
        answers: [],
        requiredCount: 0,
      });

      return;
    }

    let cancelled = false;

    async function load() {
      readyRef.current = false;
      setLoading(true);
      setSaving(false);
      setError("");
      setSaveError("");

      dispatchOrderOptionsChange({
        valid: false,
        loading: true,
        answers: [],
        requiredCount: 0,
      });

      try {
        const r = await fetch("/api/checkout/order-options", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        const j = await r.json().catch(() => ({}));

        if (!r.ok || !j?.ok) {
          throw new Error(j?.error || "ORDER_OPTIONS_FAILED");
        }

        if (cancelled) return;

        const rows = Array.isArray(j.data) ? j.data : [];

        setOptions(rows);
        setCurrency(j.currency ?? null);
        setAnswers({});

        window.setTimeout(() => {
          if (!cancelled) readyRef.current = true;
        }, 0);

        dispatchOrderOptionsChange({
          valid: rows.every((option: OrderOption) => !option.is_required),
          loading: false,
          answers: [],
          requiredCount: rows.filter((option: OrderOption) => option.is_required)
            .length,
        });
      } catch (e: any) {
        if (cancelled) return;

        setError(e?.message || "تعذر تحميل خيارات الطلب");

        dispatchOrderOptionsChange({
          valid: false,
          loading: false,
          answers: [],
          requiredCount: 0,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      readyRef.current = false;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || loading || !readyRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveAnswers();
    }, 350);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loading, answersList]);

  async function saveAnswers() {
    const seq = ++saveSeqRef.current;

    setSaving(true);
    setSaveError("");

    dispatchOrderOptionsChange({
      valid: false,
      loading: true,
      answers: answersList,
      requiredCount,
    });

    try {
      const r = await fetch("/api/checkout/order-options/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          answers: answersList,
        }),
      });

      const j = await r.json().catch(() => ({}));

      if (seq !== saveSeqRef.current) return;

      if (!r.ok || !j?.ok) {
        throw new Error(j?.message_ar || j?.error || "ORDER_OPTIONS_SAVE_FAILED");
      }

      if (j.summary) {
        dispatchSummaryPatch(j.summary);
      }
    } catch (e: any) {
      if (seq !== saveSeqRef.current) return;

      setSaveError(e?.message || "تعذر حفظ خيارات الطلب.");
    } finally {
      if (seq === saveSeqRef.current) {
        setSaving(false);
      }
    }
  }

  function patchAnswer(
    option: OrderOption,
    patch: Partial<CheckoutOrderOptionAnswer>,
  ) {
    setSaveError("");

    setAnswers((prev) => {
      const current: CheckoutOrderOptionAnswer = prev[option.id] ?? {
        option_id: option.id,
        type: option.type,
      };

      return {
        ...prev,
        [option.id]: {
          ...current,
          ...patch,
          option_id: option.id,
          type: option.type,
        },
      };
    });
  }

  function toggleChoice(option: OrderOption, choiceId: string) {
    const current = answers[option.id]?.choice_ids ?? [];

    const next = option.allow_multiple
      ? current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId]
      : [choiceId];

    const choiceMetadata = buildSelectedChoiceMetadata(option, next);

    patchAnswer(option, {
      choice_ids: next,
      metadata: {
        ...(answers[option.id]?.metadata ?? {}),
        ...choiceMetadata,
      },
    });
  }

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="rounded-[26px] border border-zinc-200 bg-white p-4 text-right shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="inline-flex items-center gap-2 text-[13px] font-black text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري تحميل خيارات الطلب...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[22px] border border-red-500/15 bg-red-500/5 px-4 py-3 text-center text-[12px] font-bold text-red-700">
        {error}
      </div>
    );
  }

  if (options.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-4 text-right shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[15px] font-black text-zinc-950">
            <MessageSquareText className="h-4 w-4" />
            خيارات الطلب
          </div>

          <div className="mt-1 text-[12px] leading-6 text-zinc-500">
            أضف التفاصيل المطلوبة من المتجر قبل تأكيد الطلب.
          </div>
        </div>

        {valid ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-black text-zinc-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            مكتمل
          </span>
        ) : saving ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-black text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            حفظ
          </span>
        ) : (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
            مطلوب
          </span>
        )}
      </div>

      {saveError ? (
        <div className="mt-3 rounded-[18px] border border-red-500/15 bg-red-500/5 px-3 py-2 text-[12px] font-bold leading-6 text-red-700">
          {saveError}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {options.map((option) => {
          const answer = answers[option.id];
          const invalid = option.is_required && !validateAnswer(option, answer);

          return (
            <div
              key={option.id}
              className={[
                "rounded-[22px] border bg-zinc-50/60 p-3",
                invalid ? "border-amber-300" : "border-zinc-200",
              ].join(" ")}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <label className="text-[13px] font-black text-zinc-950">
                    {option.name}
                    {option.is_required ? (
                      <span className="ms-1 text-amber-700">*</span>
                    ) : null}
                  </label>

                  {option.description ? (
                    <div className="mt-0.5 text-[11px] leading-5 text-zinc-500">
                      {option.description}
                    </div>
                  ) : null}
                </div>

                {option.price_customer && n(option.price_customer) > 0 ? (
                  <span
                    dir="ltr"
                    className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-black text-zinc-700"
                  >
                    + {formatMoney(currency, option.price_customer)}
                  </span>
                ) : null}
              </div>

              {option.type === "text" ? (
                option.text_size === "large" ? (
                  <textarea
                    className="min-h-[92px] w-full rounded-[18px] border border-zinc-200 bg-white px-3 py-2 text-[13px] font-bold text-zinc-900 outline-none transition focus:border-zinc-950/30 focus:ring-4 focus:ring-zinc-950/5"
                    value={answer?.value ?? ""}
                    onChange={(e) =>
                      patchAnswer(option, { value: e.target.value })
                    }
                    placeholder="اكتب التفاصيل هنا"
                  />
                ) : (
                  <input
                    className="h-11 w-full rounded-[18px] border border-zinc-200 bg-white px-3 text-[13px] font-bold text-zinc-900 outline-none transition focus:border-zinc-950/30 focus:ring-4 focus:ring-zinc-950/5"
                    value={answer?.value ?? ""}
                    onChange={(e) =>
                      patchAnswer(option, { value: e.target.value })
                    }
                    placeholder="اكتب هنا"
                  />
                )
              ) : null}

              {option.type === "number" ? (
                <input
                  className="h-11 w-full rounded-[18px] border border-zinc-200 bg-white px-3 text-left text-[13px] font-bold text-zinc-900 outline-none transition focus:border-zinc-950/30 focus:ring-4 focus:ring-zinc-950/5"
                  dir="ltr"
                  inputMode="numeric"
                  value={answer?.value ?? ""}
                  onChange={(e) =>
                    patchAnswer(option, { value: e.target.value })
                  }
                  placeholder="0"
                />
              ) : null}

              {option.type === "choices" ? (
                <div className="space-y-2">
                  {(option.choices ?? []).map((choice) => {
                    const checked = Boolean(
                      answer?.choice_ids?.includes(choice.id),
                    );

                    return (
                      <label
                        key={choice.id}
                        className={[
                          "flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border bg-white px-3 py-2.5 transition",
                          checked
                            ? "border-zinc-950 bg-zinc-50"
                            : "border-zinc-200",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type={option.allow_multiple ? "checkbox" : "radio"}
                            checked={checked}
                            onChange={() => toggleChoice(option, choice.id)}
                            className="h-4 w-4 accent-zinc-950"
                          />
                          <span className="text-[13px] font-black text-zinc-900">
                            {choice.label}
                          </span>
                        </span>

                        {choice.price_customer && n(choice.price_customer) > 0 ? (
                          <span
                            dir="ltr"
                            className="text-[12px] font-black text-zinc-700"
                          >
                            + {formatMoney(currency, choice.price_customer)}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {option.type === "appointment" ? (
                <AppointmentField
                  option={option}
                  answer={answer}
                  patchAnswer={patchAnswer}
                />
              ) : null}

              {invalid ? (
                <div className="mt-2 text-[11px] font-bold text-amber-800">
                  يرجى تعبئة خيار الطلب: {option.name}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentField({
  option,
  answer,
  patchAnswer,
}: {
  option: OrderOption;
  answer?: CheckoutOrderOptionAnswer;
  patchAnswer: (
    option: OrderOption,
    patch: Partial<CheckoutOrderOptionAnswer>,
  ) => void;
}) {
  const selectedDate = s(answer?.metadata?.date);
  const mode = getAppointmentMode(option);
  const ranges = getRangesForDate(option, selectedDate);

  const [monthDate, setMonthDate] = useState(() =>
    buildInitialAppointmentMonth(selectedDate),
  );

  useEffect(() => {
    if (!selectedDate) return;

    const timer = window.setTimeout(() => {
      setMonthDate(buildInitialAppointmentMonth(selectedDate));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedDate]);

  function patchMetadata(next: Record<string, any>) {
    const metadata = {
      ...(answer?.metadata ?? {}),
      ...next,
    };

    patchAnswer(option, {
      metadata,
      value: metadata.date ?? answer?.value,
    });
  }

  function selectDate(date: string) {
    if (!isDateAllowed(option, date)) return;

    patchMetadata({
      date,
      from: "",
      to: "",
    });
  }

  function moveMonth(delta: number) {
    setMonthDate((cur) => {
      const next = new Date(cur);
      next.setMonth(next.getMonth() + delta);
      next.setDate(1);
      next.setHours(12, 0, 0, 0);
      return next;
    });
  }

  const config = getAppointmentConfig(option);
  const enabledDays = DAY_KEYS.filter((key) =>
    bool(config.days?.[key]?.enabled, false),
  );
  const leadDays = readLeadDays(option);
  const maxAdvanceDays = readMaxAdvanceDays(option);

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-zinc-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
            aria-label="الشهر السابق"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-[13px] font-black text-zinc-950">
              <CalendarDays className="h-4 w-4" />
              {MONTHS_AR[monthDate.getMonth()]} {monthDate.getFullYear()}
            </div>

            <div className="mt-0.5 text-[11px] text-zinc-500">
              اختر اليوم المناسب للحجز
            </div>
          </div>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
            aria-label="الشهر التالي"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <CalendarGrid
          option={option}
          monthDate={monthDate}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-zinc-500">
          {leadDays > 0 ? (
            <span className="rounded-full bg-zinc-50 px-2.5 py-1">
              الحجز بعد {leadDays} يوم
            </span>
          ) : null}

          {maxAdvanceDays != null ? (
            <span className="rounded-full bg-zinc-50 px-2.5 py-1">
              متاح حتى {maxAdvanceDays} يوم
            </span>
          ) : null}

          {enabledDays.length > 0 ? (
            <span className="rounded-full bg-zinc-50 px-2.5 py-1">
              الأيام المتاحة:{" "}
              {enabledDays.map((key) => DAY_LABELS[key]).join("، ")}
            </span>
          ) : null}
        </div>
      </div>

      {mode === "days_times" && selectedDate ? (
        <div className="rounded-[20px] border border-zinc-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-zinc-950">
            <Clock3 className="h-4 w-4" />
            اختر وقت الموعد
          </div>

          {ranges.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {ranges.map((range, index) => {
                const from = s(range.from);
                const to = s(range.to);
                const checked =
                  s(answer?.metadata?.from) === from &&
                  s(answer?.metadata?.to) === to;

                return (
                  <button
                    key={`${from}-${to}-${index}`}
                    type="button"
                    className={[
                      "rounded-[18px] border px-3 py-2 text-[12px] font-black transition",
                      checked
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    ].join(" ")}
                    onClick={() =>
                      patchMetadata({
                        from,
                        to,
                      })
                    }
                  >
                    من {from} إلى {to}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800">
              لا توجد أوقات متاحة لهذا اليوم.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CalendarGrid({
  option,
  monthDate,
  selectedDate,
  onSelectDate,
}: {
  option: OrderOption;
  monthDate: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const cells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const first = new Date(year, month, 1, 12, 0, 0, 0);
    const startDay = first.getDay();

    const start = new Date(first);
    start.setDate(first.getDate() - startDay);
    start.setHours(12, 0, 0, 0);

    return Array.from({ length: 42 }).map((_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      d.setHours(12, 0, 0, 0);

      const iso = toISODate(d);
      const inMonth = d.getMonth() === month;
      const allowed = inMonth && isDateAllowed(option, iso);

      return {
        iso,
        day: d.getDate(),
        inMonth,
        allowed,
        selected: selectedDate === iso,
      };
    });
  }, [monthDate, option, selectedDate]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-zinc-500">
        <div>الأحد</div>
        <div>الإثنين</div>
        <div>الثلاثاء</div>
        <div>الأربعاء</div>
        <div>الخميس</div>
        <div>الجمعة</div>
        <div>السبت</div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <button
            key={cell.iso}
            type="button"
            disabled={!cell.allowed}
            onClick={() => onSelectDate(cell.iso)}
            className={[
              "aspect-square rounded-2xl border text-[12px] font-black transition",
              cell.selected
                ? "border-zinc-950 bg-zinc-950 text-white"
                : cell.allowed
                  ? "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                  : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300",
              !cell.inMonth ? "opacity-30" : "",
            ].join(" ")}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  );
}