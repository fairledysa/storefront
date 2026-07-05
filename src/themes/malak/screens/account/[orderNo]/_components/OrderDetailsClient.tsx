// FILE: apps/storefront/src/themes/malak/screens/account/[orderNo]/_components/OrderDetailsClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  FileText,
  ImageIcon,
  ListChecks,
  MapPin,
  Package,
  Paperclip,
  ReceiptText,
  Truck,
  User,
  WalletCards,
  X,
} from "lucide-react";
import OrderReviewModal from "../../_components/OrderReviewModal";

type OrderOptionChoice = {
  id?: string | null;
  label: string;
  price_customer?: number;
  priceCustomer?: number;
  currency?: string | null;
};

type OrderOptionLine = {
  id: string;
  option_id?: string | null;
  optionId?: string | null;

  name: string;
  option_name?: string;
  optionName?: string;

  type: string;
  option_type?: string;
  optionType?: string;

  value?: string | null;

  choice_ids?: string[];
  choiceIds?: string[];

  choices?: OrderOptionChoice[];

  metadata?: Record<string, any>;
  snapshot?: Record<string, any>;

  price_customer: number;
  priceCustomer?: number;

  currency: string;
};

type OrderDetails = {
  id: string;
  public_no: number;
  order_number: number;
  status: string;
  payment_status: string;
  payment_method?: string | null;

  currency: string;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;

  shipping_address: any | null;

  address_id?: string | null;
  shipping_id?: string | null;

  coupon_code?: string | null;
  shipping_name?: string | null;
  address_label?: string | null;

  order_options: OrderOptionLine[];
  order_options_fee: number;

  customer?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;

  address?: any | null;
};

type SelectedOption = {
  name: string;
  value: string;
  id?: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string | null;
  qty: number;
  currency: string;
  unit_price: number;
  total_price: number;
  created_at: string;
  selected_options?: SelectedOption[];
  image_url?: string | null;
  image_alt?: string | null;
};

type ApiErrorPayload = {
  ok?: boolean;
  error?: string;
  detail?: any;
  debug?: any;
  received?: any;
  order?: any;
  items?: any[];
  order_options?: any[];
  orderOptions?: any[];
  extra?:
    | {
        customer?: {
          full_name?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          phone_e164?: string | null;
        } | null;
        address_label?: string | null;
        address?: any | null;
        shipping_name?: string | null;
        coupon_code?: string | null;
        order_options?: any[];
        orderOptions?: any[];
        order_options_fee?: number | string | null;
        orderOptionsFee?: number | string | null;
      }
    | any;
};

type I18n = {
  orderStatusAr: Record<string, string>;
  paymentStatusAr: Record<string, string>;
};

type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "notfound" }
  | { kind: "error"; status: number; payload: ApiErrorPayload }
  | { kind: "ready"; order: OrderDetails; items: OrderItem[] };

type ParsedAttachment = {
  index: number;
  name: string | null;
  type: string | null;
  size: string | null;
  url: string | null;
};

function safeNumber(x: unknown) {
  const n = Number(x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(x: unknown) {
  return Math.round(safeNumber(x) * 100) / 100;
}

function money(x: unknown, c: unknown) {
  const n = Number(x ?? 0);
  const cur = String(c ?? "SAR");
  return `${cur} ${n.toFixed(2)}`.trim();
}

function safeStr(x: any) {
  return String(x ?? "").trim();
}

function fmtDate(iso: any) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function fmtShortDate(value: any) {
  const raw = safeStr(value);
  if (!raw) return "";

  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;

  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function normalizeSelectedOptions(x: any): SelectedOption[] {
  if (!Array.isArray(x)) return [];

  const out: SelectedOption[] = [];

  for (const row of x) {
    const name = safeStr(row?.name);
    const value = safeStr(row?.value);
    const id = row?.id ? String(row.id) : undefined;

    if (name && value) {
      out.push({ name, value, id });
    }
  }

  return out;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

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

function normalizeOrderOptions(input: any, fallbackCurrency: string) {
  const rows = Array.isArray(input) ? input : [];

  return rows
    .map((row: any, index: number): OrderOptionLine | null => {
      const snapshot = safeObject(row?.snapshot);
      const metadata = safeObject(row?.metadata);

      const name =
        safeStr(row?.name) ||
        safeStr(row?.option_name) ||
        safeStr(row?.optionName) ||
        safeStr(snapshot.option_name) ||
        safeStr(snapshot.name) ||
        "خيار الطلب";

      const type =
        safeStr(row?.type) ||
        safeStr(row?.option_type) ||
        safeStr(row?.optionType) ||
        safeStr(snapshot.option_type) ||
        "text";

      const choicesRaw = safeArray(row?.choices).length
        ? safeArray(row?.choices)
        : safeArray(row?.choices_snapshot).length
          ? safeArray(row?.choices_snapshot)
          : safeArray(snapshot.choices);

      const choices = choicesRaw
        .map((choice: any): OrderOptionChoice => {
          const label =
            safeStr(choice?.label) ||
            safeStr(choice?.name) ||
            safeStr(choice?.value);

          return {
            id: choice?.id ? String(choice.id) : null,
            label,
            price_customer: round2(
              choice?.price_customer ?? choice?.priceCustomer ?? 0,
            ),
            priceCustomer: round2(
              choice?.price_customer ?? choice?.priceCustomer ?? 0,
            ),
            currency: safeStr(choice?.currency) || fallbackCurrency,
          };
        })
        .filter((choice: OrderOptionChoice) => Boolean(choice.label));

      const value =
        safeStr(row?.value) ||
        choices.map((choice) => choice.label).filter(Boolean).join("، ");

      if (!name || (!value && choices.length === 0)) return null;

      return {
        id:
          safeStr(row?.id) ||
          safeStr(row?.option_id) ||
          safeStr(row?.optionId) ||
          `${name}-${index}`,

        option_id: safeStr(row?.option_id) || safeStr(row?.optionId) || null,
        optionId: safeStr(row?.option_id) || safeStr(row?.optionId) || null,

        name,
        option_name: name,
        optionName: name,

        type,
        option_type: type,
        optionType: type,

        value: value || null,

        choice_ids: Array.isArray(row?.choice_ids)
          ? row.choice_ids.map(String).filter(Boolean)
          : [],
        choiceIds: Array.isArray(row?.choiceIds)
          ? row.choiceIds.map(String).filter(Boolean)
          : [],

        choices,
        metadata,
        snapshot,

        price_customer: round2(row?.price_customer ?? row?.priceCustomer ?? 0),
        priceCustomer: round2(row?.price_customer ?? row?.priceCustomer ?? 0),

        currency: safeStr(row?.currency) || fallbackCurrency,
      };
    })
    .filter(Boolean) as OrderOptionLine[];
}

function paymentMethodAr(code: any) {
  const v = safeStr(code).toLowerCase();

  if (!v) return "-";
  if (v === "cod" || v.includes("cash")) return "الدفع عند الاستلام";
  if (v.includes("mada")) return "مدى";
  if (v.includes("visa")) return "فيزا";
  if (v.includes("master")) return "ماستر كارد";
  if (v.includes("card")) return "بطاقة";
  if (v.includes("apple")) return "Apple Pay";
  if (v.includes("stc")) return "STC Pay";
  if (v.includes("bank")) return "تحويل بنكي";

  return safeStr(code);
}

function renderAddress(addr: any) {
  if (!addr) return "-";
  if (typeof addr === "string") return addr;

  const name =
    safeStr(addr?.recipient_name) ||
    safeStr(addr?.name) ||
    safeStr(addr?.full_name) ||
    safeStr(addr?.customer_name) ||
    "";

  const phone =
    safeStr(addr?.phone_e164) ||
    safeStr(addr?.phone) ||
    safeStr(addr?.mobile) ||
    "";

  const country = safeStr(addr?.country || addr?.country_name || "");
  const city = safeStr(addr?.city || addr?.city_name || "");
  const district = safeStr(addr?.district || addr?.district_name || "");
  const postal = safeStr(addr?.postal_code || addr?.zip || "");
  const line1 = safeStr(addr?.address_line1 || addr?.street || "");
  const line2 = safeStr(addr?.address_line2 || "");
  const notes = safeStr(addr?.notes || "");

  const partsTop = [city, district].filter(Boolean).join(" - ");
  const partsAddr = [line1, line2].filter(Boolean).join("\n");

  const lines = [
    name,
    phone ? `جوال: ${phone}` : "",
    partsTop,
    partsAddr,
    postal ? `الرمز البريدي: ${postal}` : "",
    country,
    notes ? `ملاحظات: ${notes}` : "",
  ].filter((x) => Boolean(safeStr(x)));

  return lines.join("\n");
}

function lineRow(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-[var(--mk-text-muted)]">{label}</span>
      <span className="min-w-0 text-left font-bold text-[var(--mk-text-main)]">
        {value}
      </span>
    </div>
  );
}

function isCustomerNoteKey(name: string) {
  const n = safeStr(name).toLowerCase();
  return n === "ملاحظة" || n === "note" || n === "__note";
}

function parseItemExtras(selectedOptions?: SelectedOption[]) {
  const rows = Array.isArray(selectedOptions) ? selectedOptions : [];

  const visibleOptions: SelectedOption[] = [];
  let customerNote: string | null = null;

  const attachmentMap = new Map<number, ParsedAttachment>();

  for (const row of rows) {
    const name = safeStr(row?.name);
    const value = safeStr(row?.value);

    if (!name || !value) continue;

    if (isCustomerNoteKey(name)) {
      customerNote = value;
      continue;
    }

    const m = name.match(/^__?attachment_(\d+)_(name|type|size|url)$/i);

    if (m) {
      const index = Number(m[1]);
      const field = m[2].toLowerCase() as "name" | "type" | "size" | "url";

      const current = attachmentMap.get(index) ?? {
        index,
        name: null,
        type: null,
        size: null,
        url: null,
      };

      current[field] = value;
      attachmentMap.set(index, current);
      continue;
    }

    if (!name.startsWith("__")) {
      visibleOptions.push({ name, value, id: row?.id });
    }
  }

  const attachments = Array.from(attachmentMap.values())
    .filter((x) => x.url || x.name)
    .sort((a, b) => a.index - b.index);

  return {
    visibleOptions,
    customerNote,
    attachments,
  };
}

function isImageUrlLike(att: ParsedAttachment) {
  const t = safeStr(att.type).toLowerCase();
  const u = safeStr(att.url).toLowerCase();
  const n = safeStr(att.name).toLowerCase();

  if (
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "image/webp"
  ) {
    return true;
  }

  return [u, n].some((x) =>
    [".jpg", ".jpeg", ".png", ".webp"].some((ext) => x.includes(ext)),
  );
}

function isReviewableOrderStatus(status: string) {
  const v = safeStr(status).toLowerCase();
  return v === "completed" || v === "shipped";
}

function cardClass(extra = "") {
  return [
    "rounded-[24px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] shadow-[0_18px_60px_rgba(15,23,42,0.045)]",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function sectionTitle(icon: React.ReactNode, title: string) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h3 className="text-[18px] font-black text-[var(--mk-text-main)]">
        {title}
      </h3>

      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--mk-color-primary)_9%,white)] text-[var(--mk-color-primary)] ring-1 ring-[var(--mk-primary-border)]">
        {icon}
      </span>
    </div>
  );
}

function statusTone(status: string) {
  const v = safeStr(status).toLowerCase();

  if (v === "completed" || v === "shipped" || v === "paid") return "green";
  if (v === "cancelled" || v === "failed" || v === "refunded") return "red";

  return "primary";
}

function statusPill(
  label: string,
  tone: "green" | "red" | "primary" = "primary",
) {
  const cls =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_8%,white)] text-[var(--mk-color-primary)]";

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-black ${cls}`}
    >
      {label}
    </span>
  );
}

function optionTypeLabel(type: string) {
  const v = safeStr(type).toLowerCase();

  if (v === "text") return "نص";
  if (v === "number") return "رقم";
  if (v === "choices") return "اختيارات";
  if (v === "appointment") return "موعد";

  return "خيار";
}

function formatOptionValue(option: OrderOptionLine) {
  const metadata = safeObject(option.metadata);
  const type = safeStr(option.type).toLowerCase();

  if (type === "appointment") {
    const date = safeStr(metadata.date);
    const from = safeStr(metadata.from);
    const to = safeStr(metadata.to);

    if (date && from && to) {
      return `${fmtShortDate(date)} من ${from} إلى ${to}`;
    }

    if (date) return fmtShortDate(date);
  }

  const choices = Array.isArray(option.choices) ? option.choices : [];
  if (choices.length > 0) {
    return choices.map((choice) => choice.label).filter(Boolean).join("، ");
  }

  return safeStr(option.value) || "-";
}

function OrderOptionsCard({
  options,
  currency,
}: {
  options: OrderOptionLine[];
  currency: string;
}) {
  const total = options.reduce(
    (sum, option) => sum + safeNumber(option.price_customer),
    0,
  );

  if (!options.length) return null;

  return (
    <div className={cardClass("p-6")}>
      {sectionTitle(<ListChecks size={20} strokeWidth={2.1} />, "خيارات الطلب")}

      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_6%,white)] px-4 py-3">
        <div className="text-sm font-black text-[var(--mk-text-main)]">
          الخيارات الإضافية التي تم اختيارها أثناء الدفع
        </div>

        {total > 0 ? (
          <span
            dir="ltr"
            className="shrink-0 rounded-full bg-[var(--mk-bg-card)] px-3 py-1 text-xs font-black text-[var(--mk-color-primary)] ring-1 ring-[var(--mk-primary-border)]"
          >
            + {money(total, currency)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        {options.map((option, index) => {
          const value = formatOptionValue(option);
          const price = safeNumber(option.price_customer);
          const type = safeStr(option.type).toLowerCase();

          return (
            <div
              key={`${option.id}-${index}`}
              className="rounded-[20px] border border-[#eadcc9] bg-[#fffbf6] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[15px] font-black text-[var(--mk-text-main)]">
                      {option.name}
                    </div>

                    <span className="rounded-full border border-[#eadcc9] bg-white px-2.5 py-1 text-[11px] font-black text-[#9b6b2d]">
                      {optionTypeLabel(option.type)}
                    </span>
                  </div>

                  <div className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-7 text-[var(--mk-text-muted)]">
                    {value}
                  </div>

                  {type === "appointment" ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--mk-text-main)] ring-1 ring-[#eadcc9]">
                      <CalendarDays size={14} strokeWidth={2.1} />
                      موعد محدد
                    </div>
                  ) : null}
                </div>

                {price > 0 ? (
                  <div
                    dir="ltr"
                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--mk-color-primary)] ring-1 ring-[var(--mk-primary-border)]"
                  >
                    + {money(price, option.currency || currency)}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetailsClient({
  orderNo,
  i18n,
}: {
  orderNo: string;
  i18n: I18n;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const tOrderStatus = useMemo(() => {
    const map = i18n?.orderStatusAr ?? {};
    return (code: string) => map[String(code ?? "")] || String(code ?? "-");
  }, [i18n]);

  const tPaymentStatus = useMemo(() => {
    const map = i18n?.paymentStatusAr ?? {};
    return (code: string) => map[String(code ?? "")] || String(code ?? "-");
  }, [i18n]);

  useEffect(() => {
    let alive = true;

    type PreviewImage = {
      image_url: string | null;
      image_alt: string | null;
    };

    async function loadPreviewImages(publicNo: number, orderNumber: number) {
      const byProductId = new Map<string, PreviewImage>();
      const byName = new Map<string, PreviewImage>();

      try {
        const res = await fetch("/api/account/orders", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.orders) ? json.orders : [];

        const match = rows.find((row: any) => {
          const rowPublicNo = Number(row?.public_no ?? 0);
          const rowOrderNumber = Number(row?.order_number ?? 0);

          return (
            (publicNo > 0 && rowPublicNo === publicNo) ||
            (orderNumber > 0 && rowOrderNumber === orderNumber)
          );
        });

        const previews = Array.isArray(match?.items_preview)
          ? match.items_preview
          : [];

        for (const item of previews) {
          const productId = item?.product_id ? String(item.product_id) : "";
          const name = safeStr(item?.name || item?.title);

          const imageUrl =
            item?.image_url ??
            item?.imageUrl ??
            item?.product_image_url ??
            item?.thumbnail_url ??
            null;

          const imageAlt =
            item?.image_alt ?? item?.imageAlt ?? item?.name ?? name ?? null;

          if (!imageUrl) continue;

          const image = {
            image_url: String(imageUrl),
            image_alt: imageAlt ? String(imageAlt) : null,
          };

          if (productId && !byProductId.has(productId)) {
            byProductId.set(productId, image);
          }

          if (name && !byName.has(name)) {
            byName.set(name, image);
          }
        }
      } catch {}

      return { byProductId, byName };
    }

    async function run() {
      try {
        setState({ kind: "loading" });

        const url = `/api/account/orders/${encodeURIComponent(orderNo)}`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        const json: ApiErrorPayload = await res.json().catch(() => ({}));

        if (!alive) return;

        if (res.status === 401) {
          setState({ kind: "unauth" });
          return;
        }

        if (res.status === 404) {
          setState({ kind: "notfound" });
          return;
        }

        if (!res.ok) {
          setState({
            kind: "error",
            status: res.status,
            payload: json || { error: "REQUEST_FAILED" },
          });
          return;
        }

        const o = (json as any)?.order ?? null;
        const extra = (json as any)?.extra ?? null;

        const itemsRaw = Array.isArray((json as any)?.items)
          ? (json as any).items
          : [];

        if (!o?.id) {
          setState({ kind: "notfound" });
          return;
        }

        const publicNo = Number(o.public_no ?? 0);
        const orderNumber = Number(o.order_number ?? 0);

        const previewImages = await loadPreviewImages(publicNo, orderNumber);

        if (!alive) return;

        const extraCustomer = extra?.customer ?? null;

        const customerNormalized =
          extraCustomer && typeof extraCustomer === "object"
            ? {
                full_name:
                  extraCustomer.full_name ??
                  extraCustomer.name ??
                  extraCustomer.fullName ??
                  null,
                email: extraCustomer.email ?? null,
                phone: extraCustomer.phone ?? extraCustomer.phone_e164 ?? null,
              }
            : null;

        const currency = String(o.currency ?? "SAR");

        const orderOptions = normalizeOrderOptions(
          (json as any)?.order_options ??
            (json as any)?.orderOptions ??
            extra?.order_options ??
            extra?.orderOptions ??
            o?.order_options ??
            o?.orderOptions ??
            [],
          currency,
        );

        const orderOptionsFeeFromRows = orderOptions.reduce(
          (sum, option) => sum + safeNumber(option.price_customer),
          0,
        );

        const orderOptionsFee = round2(
          o?.order_options_fee ??
            o?.orderOptionsFee ??
            extra?.order_options_fee ??
            extra?.orderOptionsFee ??
            orderOptionsFeeFromRows,
        );

        const order: OrderDetails = {
          id: String(o.id),
          public_no: publicNo,
          order_number: orderNumber,
          status: String(o.status ?? ""),
          payment_status: String(o.payment_status ?? "unpaid"),
          payment_method: o.payment_method ? String(o.payment_method) : null,

          currency,
          subtotal: Number(o.subtotal ?? 0),
          shipping_amount: Number(o.shipping_amount ?? 0),
          tax_amount: Number(o.tax_amount ?? 0),
          discount_amount: Number(o.discount_amount ?? 0),
          total_amount: Number(o.total_amount ?? 0),
          created_at: String(o.created_at ?? ""),

          shipping_address: o.shipping_address ?? null,
          address_id: o.address_id ? String(o.address_id) : null,
          shipping_id: o.shipping_id ? String(o.shipping_id) : null,

          coupon_code:
            (extra?.coupon_code ? String(extra.coupon_code) : null) ??
            (o.coupon_code ? String(o.coupon_code) : null),

          shipping_name:
            (extra?.shipping_name ? String(extra.shipping_name) : null) ??
            (o.shipping_name ? String(o.shipping_name) : null),

          address_label:
            (extra?.address_label ? String(extra.address_label) : null) ??
            (o.address_label ? String(o.address_label) : null),

          order_options: orderOptions,
          order_options_fee: orderOptionsFee,

          customer: customerNormalized,
          address: extra?.address ?? null,
        };

        const items: OrderItem[] = itemsRaw.map((it: any) => {
          const productId = it.product_id ? String(it.product_id) : "";
          const name = String(it.name ?? "");

          const fallbackImage =
            (productId ? previewImages.byProductId.get(productId) : null) ??
            previewImages.byName.get(name) ??
            null;

          return {
            id: String(it.id ?? ""),
            order_id: String(it.order_id ?? ""),
            product_id: productId,
            variant_id: it.variant_id ? String(it.variant_id) : null,
            name,
            sku: it.sku ? String(it.sku) : null,
            qty: Number(it.qty ?? 0),
            currency: String(it.currency ?? order.currency),
            unit_price: Number(it.unit_price ?? 0),
            total_price: Number(it.total_price ?? 0),
            created_at: String(it.created_at ?? ""),
            selected_options: normalizeSelectedOptions(
              it.selected_options ?? it.selectedOptions ?? [],
            ),
            image_url:
              it.image_url ??
              it.imageUrl ??
              it.product_image_url ??
              it.thumbnail_url ??
              fallbackImage?.image_url ??
              null,
            image_alt:
              it.image_alt ??
              it.imageAlt ??
              fallbackImage?.image_alt ??
              it.name ??
              null,
          };
        });

        setState({ kind: "ready", order, items });
      } catch (e: any) {
        if (!alive) return;

        setState({
          kind: "error",
          status: 500,
          payload: { error: "UNHANDLED", detail: e?.message ?? String(e) },
        });
      }
    }

    const timer = window.setTimeout(() => {
      void run();
    }, 0);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [orderNo]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewImage(null);
    }

    if (previewImage) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [previewImage]);

  const displayOrderNo =
    state.kind === "ready"
      ? state.order.order_number || state.order.public_no || orderNo
      : orderNo;

  return (
    <>
      <div dir="rtl" className="w-full pb-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--mk-text-muted)]">
              رقم الطلب
            </div>
            <div className="mt-1 text-2xl font-black leading-none text-[var(--mk-text-main)]">
              #{displayOrderNo}
            </div>
          </div>

          <Link
            href="/account/orders"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--mk-primary-border)] bg-[var(--mk-bg-card)] px-4 text-sm font-black text-[var(--mk-color-primary)] transition hover:bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)]"
          >
            <ArrowRight size={17} strokeWidth={2.2} />
            الرجوع للطلبات
          </Link>
        </div>

        {state.kind === "loading" ? (
          <div
            className={cardClass(
              "p-7 text-sm font-bold text-[var(--mk-text-muted)]",
            )}
          >
            جاري تحميل تفاصيل الطلب...
          </div>
        ) : state.kind === "unauth" ? (
          <div
            className={cardClass(
              "p-7 text-sm font-bold text-[var(--mk-text-muted)]",
            )}
          >
            لازم تسجل دخول أولاً.
          </div>
        ) : state.kind === "notfound" ? (
          <div
            className={cardClass(
              "p-7 text-sm font-bold text-[var(--mk-text-muted)]",
            )}
          >
            الطلب غير موجود.
          </div>
        ) : state.kind === "error" ? (
          <div className={cardClass("p-7")}>
            <div className="font-black text-[var(--mk-text-main)]">
              حصل خطأ أثناء جلب تفاصيل الطلب.
            </div>

            <div className="mt-3 text-sm font-bold text-[var(--mk-text-muted)]">
              <div>
                <span>HTTP:</span> {state.status}
              </div>

              <div className="mt-1">
                <span>Error:</span> {state.payload?.error || "REQUEST_FAILED"}
              </div>

              {state.payload?.detail ? (
                <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-[var(--mk-bg-soft)] p-4 text-xs">
                  {JSON.stringify(state.payload.detail, null, 2)}
                </pre>
              ) : null}

              {state.payload?.debug ? (
                <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-[var(--mk-bg-soft)] p-4 text-xs">
                  {JSON.stringify(state.payload.debug, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className={cardClass("overflow-hidden")}>
              <div className="grid divide-y divide-[var(--mk-border-soft)] md:grid-cols-2 md:divide-x md:divide-x-reverse md:divide-y-0">
                <div className="flex min-h-[88px] items-center justify-center gap-5 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--mk-color-primary)_9%,white)] text-[var(--mk-color-primary)] ring-1 ring-[var(--mk-primary-border)]">
                    <ReceiptText size={21} strokeWidth={2.1} />
                  </span>

                  <div>
                    <div className="text-sm font-bold text-[var(--mk-text-muted)]">
                      حالة الطلب
                    </div>

                    <div className="mt-1 text-lg font-black text-[var(--mk-text-main)]">
                      {tOrderStatus(state.order.status)}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-[88px] items-center justify-center gap-5 p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--mk-color-primary)_9%,white)] text-[var(--mk-color-primary)] ring-1 ring-[var(--mk-primary-border)]">
                    <WalletCards size={21} strokeWidth={2.1} />
                  </span>

                  <div>
                    <div className="text-sm font-bold text-[var(--mk-text-muted)]">
                      حالة الدفع
                    </div>

                    <div className="mt-1 text-lg font-black text-[var(--mk-color-primary)]">
                      {tPaymentStatus(state.order.payment_status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isReviewableOrderStatus(state.order.status) ? (
              <div className="rounded-[24px] border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_12%,white)] p-6 text-[var(--mk-text-main)] shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-2xl font-black">تقييم الطلب</div>

                    <div className="mt-2 text-sm font-bold leading-7 text-[var(--mk-text-muted)]">
                      تقييم الطلب من خدمة المتجر والمنتجات والشحن يساعدنا على
                      تحسين خدماتنا وتقديمها بشكل أفضل.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReviewOpen(true)}
                    className="shrink-0 rounded-full bg-[var(--mk-bg-card)] px-7 py-3 text-sm font-black text-[var(--mk-color-primary)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)]"
                  >
                    تقييم
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-5">
                <div className={cardClass("p-6")}>
                  {sectionTitle(
                    <Package size={20} strokeWidth={2.1} />,
                    "المنتجات",
                  )}

                  {state.items.length === 0 ? (
                    <div className="text-sm font-bold text-[var(--mk-text-muted)]">
                      لا توجد عناصر في هذا الطلب.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {state.items.map((it) => {
                        const extras = parseItemExtras(it.selected_options);

                        return (
                          <div
                            key={it.id}
                            className="rounded-[20px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] p-4"
                          >
                            <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)_190px] md:items-start">
                              <div>
                                <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-soft)]">
                                  {it.image_url ? (
                                    <img
                                      src={it.image_url}
                                      alt={it.image_alt || it.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="grid h-full w-full place-items-center text-[var(--mk-color-primary)]">
                                      <Package size={30} strokeWidth={1.7} />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="text-lg font-black leading-7 text-[var(--mk-text-main)]">
                                  {it.name || "منتج"}
                                </div>

                                {it.sku ? (
                                  <div className="mt-1 text-xs font-bold text-[var(--mk-text-muted)]">
                                    SKU: {it.sku}
                                  </div>
                                ) : null}

                                {extras.visibleOptions.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {extras.visibleOptions.map((op, idx) => (
                                      <span
                                        key={`${it.id}-visible-${idx}`}
                                        className="rounded-full border border-[var(--mk-primary-border)] bg-[color-mix(in_srgb,var(--mk-color-primary)_7%,white)] px-3 py-1 text-xs font-black text-[var(--mk-color-primary)]"
                                      >
                                        {op.name}: {op.value}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}

                                {extras.customerNote ? (
                                  <div className="mt-4 rounded-2xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-soft)] p-3">
                                    <div className="mb-1 text-xs font-black text-[var(--mk-text-main)]">
                                      ملاحظة العميل
                                    </div>

                                    <div className="whitespace-pre-wrap break-words text-sm font-bold leading-7 text-[var(--mk-text-muted)]">
                                      {extras.customerNote}
                                    </div>
                                  </div>
                                ) : null}

                                {extras.attachments.length ? (
                                  <div className="mt-4">
                                    <div className="mb-2 flex items-center gap-2 text-xs font-black text-[var(--mk-text-main)]">
                                      <Paperclip size={14} />
                                      الصور المرفقة
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                      {extras.attachments.map((att) => (
                                        <div
                                          key={`${it.id}-att-${att.index}`}
                                          className="overflow-hidden rounded-2xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)]"
                                        >
                                          <div className="aspect-square bg-[var(--mk-bg-soft)]">
                                            {att.url && isImageUrlLike(att) ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setPreviewImage({
                                                    url: att.url || "",
                                                    title:
                                                      att.name ||
                                                      `صورة ${att.index}`,
                                                  })
                                                }
                                                className="block h-full w-full cursor-zoom-in"
                                              >
                                                <img
                                                  src={att.url}
                                                  alt={
                                                    att.name ||
                                                    `attachment-${att.index}`
                                                  }
                                                  loading="lazy"
                                                  decoding="async"
                                                  className="h-full w-full object-cover"
                                                />
                                              </button>
                                            ) : (
                                              <div className="grid h-full place-items-center text-[var(--mk-color-primary)]">
                                                <ImageIcon size={26} />
                                              </div>
                                            )}
                                          </div>

                                          <div className="p-2">
                                            <div
                                              className="truncate text-xs font-bold text-[var(--mk-text-main)]"
                                              title={att.name || ""}
                                            >
                                              {att.name || `صورة ${att.index}`}
                                            </div>

                                            {att.url && isImageUrlLike(att) ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setPreviewImage({
                                                    url: att.url || "",
                                                    title:
                                                      att.name ||
                                                      `صورة ${att.index}`,
                                                  })
                                                }
                                                className="mt-1 text-xs font-black text-[var(--mk-color-primary)] hover:underline"
                                              >
                                                عرض الصورة
                                              </button>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-2xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-soft)] p-4 text-sm">
                                <div className="grid gap-3">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-[13px] font-bold text-[var(--mk-text-muted)]">
                                      الكمية
                                    </span>
                                    <strong
                                      dir="ltr"
                                      className="text-left text-[15px] font-black text-[var(--mk-text-main)]"
                                    >
                                      {it.qty}
                                    </strong>
                                  </div>

                                  <div className="h-px bg-[var(--mk-border-soft)]" />

                                  <div className="flex items-start justify-between gap-4">
                                    <span className="text-[13px] font-bold text-[var(--mk-text-muted)]">
                                      سعر الوحدة
                                    </span>
                                    <strong
                                      dir="ltr"
                                      className="text-left text-[14px] font-black leading-5 text-[var(--mk-text-main)]"
                                    >
                                      {money(it.unit_price, it.currency)}
                                    </strong>
                                  </div>

                                  <div className="h-px bg-[var(--mk-border-soft)]" />

                                  <div className="flex items-start justify-between gap-4">
                                    <span className="text-[13px] font-black text-[var(--mk-text-main)]">
                                      الإجمالي
                                    </span>
                                    <strong
                                      dir="ltr"
                                      className="text-left text-[15px] font-black leading-5 text-[var(--mk-color-primary)]"
                                    >
                                      {money(it.total_price, it.currency)}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <OrderOptionsCard
                  options={state.order.order_options}
                  currency={state.order.currency}
                />
              </div>

              <div className="grid gap-5">
                <div className={cardClass("overflow-hidden p-0")}>
                  <div className="p-6">
                    {sectionTitle(
                      <FileText size={20} strokeWidth={2.1} />,
                      "ملخص الفاتورة",
                    )}

                    <div className="grid gap-3">
                      {lineRow("الحالة", tOrderStatus(state.order.status))}
                      {lineRow(
                        "حالة الدفع",
                        tPaymentStatus(state.order.payment_status),
                      )}
                      {lineRow(
                        "طريقة الدفع",
                        paymentMethodAr(state.order.payment_method),
                      )}
                      {lineRow("تاريخ الطلب", fmtDate(state.order.created_at))}

                      <div className="my-1 h-px bg-[var(--mk-border-soft)]" />

                      {lineRow(
                        "المجموع الفرعي",
                        money(state.order.subtotal, state.order.currency),
                      )}
                      {lineRow(
                        "الشحن",
                        money(
                          state.order.shipping_amount,
                          state.order.currency,
                        ),
                      )}

                      {state.order.order_options_fee > 0 ? (
                        lineRow(
                          "خيارات الطلب",
                          money(
                            state.order.order_options_fee,
                            state.order.currency,
                          ),
                        )
                      ) : null}

                      {lineRow(
                        "الضريبة",
                        money(state.order.tax_amount, state.order.currency),
                      )}
                      {lineRow(
                        "الخصم",
                        `- ${money(
                          state.order.discount_amount,
                          state.order.currency,
                        )}`,
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-[var(--mk-border-soft)] bg-[var(--mk-bg-soft)] px-6 py-5">
                    <span className="text-lg font-black text-[var(--mk-text-main)]">
                      الإجمالي
                    </span>
                    <span className="text-xl font-black text-[var(--mk-color-primary)]">
                      {money(state.order.total_amount, state.order.currency)}
                    </span>
                  </div>
                </div>

                <div className={cardClass("p-6")}>
                  {sectionTitle(
                    <CreditCard size={20} strokeWidth={2.1} />,
                    "بيانات الدفع",
                  )}

                  <div className="grid gap-3">
                    {lineRow(
                      "حالة الدفع",
                      statusPill(
                        tPaymentStatus(state.order.payment_status),
                        statusTone(state.order.payment_status),
                      ),
                    )}
                    {lineRow(
                      "طريقة الدفع",
                      paymentMethodAr(state.order.payment_method),
                    )}
                  </div>
                </div>

                <div className={cardClass("p-6")}>
                  {sectionTitle(
                    <Truck size={20} strokeWidth={2.1} />,
                    "الشحن والخصم",
                  )}

                  <div className="grid gap-3">
                    {lineRow(
                      "شركة الشحن",
                      state.order.shipping_name
                        ? state.order.shipping_name
                        : "-",
                    )}
                    {lineRow(
                      "كود الخصم",
                      state.order.coupon_code ? state.order.coupon_code : "-",
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <div className={cardClass("p-6")}>
                {sectionTitle(
                  <User size={20} strokeWidth={2.1} />,
                  "بيانات العميل",
                )}

                <div className="grid gap-3">
                  {lineRow(
                    "الاسم",
                    state.order.customer?.full_name
                      ? state.order.customer.full_name
                      : "-",
                  )}
                  {lineRow(
                    "الجوال",
                    state.order.customer?.phone
                      ? state.order.customer.phone
                      : "-",
                  )}
                  {lineRow(
                    "البريد",
                    state.order.customer?.email
                      ? state.order.customer.email
                      : "-",
                  )}
                </div>
              </div>

              <div className={cardClass("p-6 xl:col-span-2")}>
                {sectionTitle(
                  <MapPin size={20} strokeWidth={2.1} />,
                  "عنوان العميل",
                )}

                {state.order.address_label ? (
                  <div className="mb-2 text-sm font-black text-[var(--mk-text-main)]">
                    {state.order.address_label}
                  </div>
                ) : null}

                <div className="whitespace-pre-wrap rounded-2xl bg-[var(--mk-bg-soft)] p-4 text-sm font-bold leading-8 text-[var(--mk-text-muted)]">
                  {renderAddress(
                    state.order.address || state.order.shipping_address,
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {state.kind === "ready" ? (
        <OrderReviewModal
          open={reviewOpen}
          order={{
            id: state.order.id,
            public_no: state.order.public_no,
            order_number: state.order.order_number,
            status: state.order.status,
            payment_status: state.order.payment_status,
            total_amount: state.order.total_amount,
            currency: state.order.currency,
            created_at: state.order.created_at,
            items_count: state.items.length,
            items_qty: state.items.reduce(
              (sum, item) => sum + Number(item.qty ?? 0),
              0,
            ),
            remaining_items_count: Math.max(state.items.length - 3, 0),
            items_preview: state.items.slice(0, 3).map((item) => ({
              id: item.id,
              product_id: item.product_id || null,
              name: item.name || "منتج",
              qty: Number(item.qty ?? 1),
              image_url: item.image_url ?? null,
              image_alt: item.image_alt ?? item.name ?? null,
            })),
          }}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}

      {previewImage && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setPreviewImage(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                dir="rtl"
                className="relative flex max-h-[88vh] max-w-[92vw] flex-col overflow-hidden rounded-[24px] border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] shadow-[0_30px_90px_rgba(0,0,0,0.32)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] px-4">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--mk-border-soft)] bg-[var(--mk-bg-card)] text-[var(--mk-text-main)] transition hover:bg-[var(--mk-bg-soft)]"
                    aria-label="إغلاق"
                  >
                    <X size={18} strokeWidth={2.4} />
                  </button>

                  <div
                    dir="ltr"
                    className="min-w-0 flex-1 truncate text-left text-sm font-black text-[var(--mk-text-main)]"
                    title={previewImage.title}
                  >
                    {previewImage.title}
                  </div>
                </div>

                <div className="flex min-h-[260px] items-center justify-center bg-[var(--mk-bg-soft)] p-4">
                  <img
                    src={previewImage.url}
                    alt={previewImage.title}
                    className="block max-h-[calc(88vh-88px)] max-w-[min(86vw,760px)] rounded-[18px] object-contain shadow-[0_14px_45px_rgba(0,0,0,0.16)]"
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}