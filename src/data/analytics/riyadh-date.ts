// FILE: apps/storefront/src/data/analytics/riyadh-date.ts

const RIYADH_TIME_ZONE = "Asia/Riyadh";

type RiyadhDateParts = {
  year: number;
  month: number;
  day: number;
};

function numericPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value ?? "";
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

export function getRiyadhDateParts(value: Date = new Date()): RiyadhDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RIYADH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: numericPart(parts, "year"),
    month: numericPart(parts, "month"),
    day: numericPart(parts, "day"),
  };
}

export function riyadhDateKey(value: Date = new Date()) {
  const { year, month, day } = getRiyadhDateParts(value);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function previousRiyadhDateKey(value: Date = new Date()) {
  // السعودية لا تطبق التوقيت الصيفي، لذلك 24 ساعة سابقة آمنة لاستخراج يوم الأمس.
  return riyadhDateKey(new Date(value.getTime() - 24 * 60 * 60 * 1000));
}
