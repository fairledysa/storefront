// FILE: apps/storefront/src/themes/malak/screens/thankyou/ThankYouScreen.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  Clock3,
  CreditCard,
  Download,
  Headphones,
  Home,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  ReceiptText,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { MalakBootstrap } from "../../bootstrap/types";

type OrderItem = {
  id?: string | number;
  title?: string;
  subtitle?: string;
  qty?: number | string;
  price?: number | string;
  imageUrl?: string | null;
  specialOfferAdjustment?: any;
  special_offer_adjustment?: any;
};

type OrderOptionChoice = {
  id?: string | number | null;
  label?: string | null;
  price_customer?: number | string | null;
  priceCustomer?: number | string | null;
};

type OrderOptionLine = {
  id?: string | number | null;
  option_id?: string | null;
  optionId?: string | null;
  name?: string | null;
  option_name?: string | null;
  optionName?: string | null;
  type?: string | null;
  option_type?: string | null;
  optionType?: string | null;
  value?: string | number | null;
  choices?: OrderOptionChoice[] | null;
  choices_snapshot?: OrderOptionChoice[] | null;
  choicesSnapshot?: OrderOptionChoice[] | null;
  metadata?: Record<string, any> | null;
  snapshot?: Record<string, any> | null;
  price_customer?: number | string | null;
  priceCustomer?: number | string | null;
  currency?: string | null;
};

type ThankYouData = {
  orderNo?: string | number;
  invoiceDownloadUrl?: string | null;
  invoice_download_url?: string | null;

  paymentSubmitted?: boolean | number | string | null;
  payment_submitted?: boolean | number | string | null;
  bankTransferSubmitted?: boolean | number | string | null;
  bank_transfer_submitted?: boolean | number | string | null;

  totalAmount?: number | string;
  total?: number | string;
  grandTotal?: number | string;

  currency?: string;
  currency_code?: string;
  currencyCode?: string;
  currency_symbol?: string;
  currencySymbol?: string;
  symbol?: string;

  currency_decimals?: number | string | null;
  currencyDecimals?: number | string | null;
  decimal_digits?: number | string | null;
  decimalDigits?: number | string | null;

  subtotal?: number | string | null;
  subtotalAmount?: number | string | null;

  shippingAmount?: number | string | null;
  shipping?: number | string | null;
  shippingTotalAmount?: number | string | null;
  shipping_total?: number | string | null;
  shippingTotal?: number | string | null;
  shippingTaxAmount?: number | string | null;
  shipping_tax?: number | string | null;
  shippingTax?: number | string | null;
  shippingIncludeTax?: boolean | number | string | null;
  shipping_include_tax?: boolean | number | string | null;

  discountAmount?: number | string | null;
  discount?: number | string | null;

  orderOptions?: OrderOptionLine[] | null;
  order_options?: OrderOptionLine[] | null;
  orderOptionsFee?: number | string | null;
  order_options_fee?: number | string | null;

  taxAmount?: number | string | Record<string, any> | null;
  tax?: number | string | Record<string, any> | null;
  vatAmount?: number | string | null;

  taxEnabled?: boolean | number | string | null;
  tax_enabled?: boolean | number | string | null;

  taxLabel?: string | null;
  tax_label?: string | null;

  taxRate?: number | string | null;
  tax_rate?: number | string | null;

  pricesIncludeTax?: boolean | number | string | null;
  prices_include_tax?: boolean | number | string | null;

  paymentFee?: number | string | null;
  payment_fee?: number | string | null;
  paymentFeeAmount?: number | string | null;
  payment_fee_amount?: number | string | null;
  paymentFeeTotalAmount?: number | string | null;
  payment_fee_total?: number | string | null;
  paymentFeeTotal?: number | string | null;
  paymentFeeTaxAmount?: number | string | null;
  payment_fee_tax?: number | string | null;
  paymentFeeTax?: number | string | null;
  paymentFeeIncludeTax?: boolean | number | string | null;
  payment_fee_include_tax?: boolean | number | string | null;
  paymentFeeLabel?: string | null;
  payment_fee_label?: string | null;
  codFeeLabel?: string | null;

  codFee?: number | string | null;
  cod_fee?: number | string | null;

  paymentLabel?: string | null;
  paymentStatusLabel?: string | null;
  walletUsedAmount?: number | string | null;
  wallet_used_amount?: number | string | null;
  walletRemainingAmount?: number | string | null;
  wallet_remaining_amount?: number | string | null;
  walletRefundedAmount?: number | string | null;
  wallet_refunded_amount?: number | string | null;
  walletPaymentStatus?: string | null;
  wallet_payment_status?: string | null;
  walletExternalPaymentMethod?: string | null;
  wallet_external_payment_method?: string | null;

  estimatedDeliveryText?: string | null;
  deliveryAddressText?: string | null;

  statusLabel?: string | null;
  statusDescription?: string | null;
  baseStatusKey?: string | null;
  base_status_key?: string | null;
  statusKey?: string | null;
  status_key?: string | null;
  status?: string | null;

  items?: OrderItem[];
  specialOffers?: any;
  special_offers?: any;
  cartOffers?: any;
  cart_offers?: any;

  bootstrap?: MalakBootstrap | null;
  theme?: {
    bootstrap?: MalakBootstrap | null;
  };
};

type AnyProps = {
  orderNo?: string | number;
  totalAmount?: number | string;
  currency?: string;
  data?: ThankYouData;
  bootstrap?: MalakBootstrap | null;
};

function s(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(value: any) {
  return Math.round(n(value) * 100) / 100;
}

function hasValue(v: any) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (hasValue(value)) return value;
  }

  return null;
}

function pickText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off"].includes(text)) return false;
  }

  if (value && typeof value === "object") {
    if ("enabled" in value) return readBool(value.enabled, fallback);
    if ("value" in value) return readBool(value.value, fallback);
    if ("checked" in value) return readBool(value.checked, fallback);
  }

  return fallback;
}

function clampDecimals(value: any, fallback = 2) {
  const raw = Number(value ?? fallback);
  if (!Number.isFinite(raw)) return fallback;

  return Math.max(0, Math.min(4, Math.floor(raw)));
}

function inferCurrencyDecimals(currency: string) {
  const code = s(currency).toUpperCase();

  if (code === "YER") return 0;

  return 2;
}

function formatMoney(currency: string, amount: number, decimalDigits = 2) {
  const value = Number(amount ?? 0);
  const safeValue = Number.isFinite(value) ? value : 0;
  const cleanCurrency = s(currency) || "SAR";
  const decimals = clampDecimals(
    decimalDigits,
    inferCurrencyDecimals(cleanCurrency),
  );

  const formatted = safeValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${cleanCurrency} ${formatted}`;
}

function normalizeWhatsappHref(value: any) {
  const raw = s(value);
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const clean = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!clean) return "";

  return `https://wa.me/${clean}`;
}

function normalizeEmailHref(value: any) {
  const raw = s(value);
  if (!raw) return "";

  if (raw.startsWith("mailto:")) return raw;

  const clean = raw.replace(/^mailto:/i, "").trim();
  if (!clean || !clean.includes("@")) return "";

  return `mailto:${clean}`;
}

function getFooterSupportContacts(bootstrap?: MalakBootstrap | null) {
  const footer: any = bootstrap?.footer || {};
  const floating: any = footer?.floating_actions || {};
  const helpItems = Array.isArray(footer?.help_items) ? footer.help_items : [];

  let whatsappRaw =
    readBool(floating?.wa_enabled, false) && s(floating?.wa_number)
      ? s(floating.wa_number)
      : "";

  let emailRaw = "";

  for (const item of helpItems) {
    const title = s(item?.title).toLowerCase();
    const value = s(item?.value);
    const href = s(item?.href);

    const isWhatsapp =
      title.includes("واتساب") ||
      title.includes("whatsapp") ||
      href.includes("wa.me") ||
      href.includes("whatsapp");

    const isEmail =
      title.includes("بريد") ||
      title.includes("email") ||
      title.includes("mail") ||
      href.startsWith("mailto:") ||
      value.includes("@");

    if (!whatsappRaw && isWhatsapp) {
      whatsappRaw = pickText(href, value);
    }

    if (!emailRaw && isEmail) {
      emailRaw = pickText(href, value);
    }
  }

  return {
    whatsappHref: normalizeWhatsappHref(whatsappRaw),
    emailHref: normalizeEmailHref(emailRaw),
  };
}

function normalizeOrderOptionChoice(choice: any): OrderOptionChoice | null {
  const label = s(
    choice?.label ?? choice?.name ?? choice?.title ?? choice?.value,
  );

  if (!label) return null;

  const price = round2(choice?.price_customer ?? choice?.priceCustomer ?? 0);

  return {
    id: choice?.id ?? null,
    label,
    price_customer: price,
    priceCustomer: price,
  };
}

function normalizeOrderOptions(data: ThankYouData) {
  const rawRows = Array.isArray(data?.orderOptions)
    ? data.orderOptions
    : Array.isArray(data?.order_options)
      ? data.order_options
      : [];

  return rawRows
    .map((row: any, index: number) => {
      const metadata = safeObject(row?.metadata);
      const snapshot = safeObject(row?.snapshot);

      const rawChoices =
        safeArray(row?.choices).length > 0
          ? safeArray(row?.choices)
          : safeArray(row?.choices_snapshot).length > 0
            ? safeArray(row?.choices_snapshot)
            : safeArray(row?.choicesSnapshot).length > 0
              ? safeArray(row?.choicesSnapshot)
              : safeArray(snapshot?.choices);

      const choices = rawChoices
        .map((choice) => normalizeOrderOptionChoice(choice))
        .filter(Boolean) as OrderOptionChoice[];

      const choicesFee = choices.reduce(
        (acc, choice) =>
          acc + round2(choice.price_customer ?? choice.priceCustomer ?? 0),
        0,
      );

      const price = round2(
        firstValue(
          row?.price_customer,
          row?.priceCustomer,
          snapshot?.price_customer,
          snapshot?.priceCustomer,
          choicesFee,
        ),
      );

      const name =
        pickText(
          row?.name,
          row?.option_name,
          row?.optionName,
          snapshot?.option_name,
          snapshot?.optionName,
        ) || `خيار الطلب ${index + 1}`;

      const type = pickText(
        row?.type,
        row?.option_type,
        row?.optionType,
        snapshot?.option_type,
      );

      const value = pickText(row?.value, metadata?.value, snapshot?.value);

      return {
        id: row?.id ?? row?.option_id ?? row?.optionId ?? index,
        option_id: s(row?.option_id ?? row?.optionId),
        optionId: s(row?.option_id ?? row?.optionId),
        name,
        option_name: name,
        optionName: name,
        type,
        option_type: type,
        optionType: type,
        value,
        choices,
        metadata,
        snapshot,
        price_customer: price,
        priceCustomer: price,
        currency: s(row?.currency),
      };
    })
    .filter((row) => row.name);
}

function orderOptionDisplayValue(option: OrderOptionLine) {
  const choices = safeArray(option.choices)
    .map((choice: any) => s(choice?.label))
    .filter(Boolean);

  if (choices.length > 0) return choices.join("، ");

  const directValue = s(option.value);
  if (directValue) return directValue;

  const metadata = safeObject(option.metadata);
  const date = s(metadata.date);
  const from = s(metadata.from);
  const to = s(metadata.to);

  if (date && from && to) return `${date} من ${from} إلى ${to}`;
  if (date) return date;

  return "";
}

function usePaymentSubmittedFlag(data: ThankYouData) {
  const fromData = readBool(
    firstValue(
      data?.paymentSubmitted,
      data?.payment_submitted,
      data?.bankTransferSubmitted,
      data?.bank_transfer_submitted,
    ),
    false,
  );

  const [fromUrl, setFromUrl] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      setFromUrl(
        params.get("payment_submitted") === "1" ||
          params.get("bank_transfer_submitted") === "1",
      );
    } catch {
      setFromUrl(false);
    }
  }, []);

  return fromData || fromUrl;
}

type TimelineState = "completed" | "current" | "upcoming";

type OrderTimelineStep = {
  key: "confirmation" | "processing" | "delivery";
  title: string;
  text: string;
  state: TimelineState;
};

type OrderTimeline = {
  title: string;
  description: string;
  steps: OrderTimelineStep[];
  progressSegments: number;
  terminal?: {
    title: string;
    description: string;
    tone: "danger" | "warning";
  };
};

function normalizeOrderStatusKey(value: unknown) {
  return s(value).toLowerCase().replace(/[-\s]+/g, "_");
}

function buildOrderTimeline(args: {
  statusKey: string;
  statusLabel: string;
  statusDescription: string;
  paymentReview: boolean;
}): OrderTimeline {
  const key = normalizeOrderStatusKey(args.statusKey);
  const statusLabel = args.statusLabel || "حالة الطلب";
  const statusDescription = args.statusDescription || "سيتم تحديث حالة طلبك من المتجر.";

  if (["cancelled", "canceled", "refunded", "failed"].includes(key)) {
    const fallback =
      key === "refunded"
        ? "تم استرجاع هذا الطلب."
        : key === "failed"
          ? "تعذر إتمام هذا الطلب."
          : "تم إلغاء هذا الطلب.";

    return {
      title: "حالة الطلب",
      description: "تم تحديث حالة الطلب من المتجر.",
      progressSegments: 0,
      steps: [],
      terminal: {
        title: statusLabel,
        description: statusDescription || fallback,
        tone: key === "failed" ? "warning" : "danger",
      },
    };
  }

  if (args.paymentReview && ["", "pending", "pending_review", "pending_payment"].includes(key)) {
    return {
      title: "ماذا يحدث الآن؟",
      description: "ينتظر طلبك اعتماد التحويل قبل بدء التجهيز.",
      progressSegments: 0,
      steps: [
        {
          key: "confirmation",
          title: "اعتماد التحويل",
          text: "تم استلام طلب التحويل وسيقوم المتجر بمراجعته.",
          state: "current",
        },
        {
          key: "processing",
          title: "جاري التجهيز",
          text: "بعد اعتماد التحويل يبدأ تجهيز طلبك.",
          state: "upcoming",
        },
        {
          key: "delivery",
          title: "الشحن والتسليم",
          text: "سيتم شحن طلبك وتسليمه إلى عنوانك.",
          state: "upcoming",
        },
      ],
    };
  }

  const steps: OrderTimelineStep[] = [
    {
      key: "confirmation",
      title: key === "pending_review" || key === "pending" ? statusLabel : "تأكيد الطلب",
      text:
        key === "pending_review" || key === "pending"
          ? statusDescription
          : "تم تأكيد بيانات الطلب وانتقل إلى المرحلة التالية.",
      state: "current",
    },
    {
      key: "processing",
      title: key === "processing" ? statusLabel : "جاري التجهيز",
      text:
        key === "processing"
          ? statusDescription
          : "نقوم بتجهيز طلبك بعناية قبل الشحن.",
      state: "upcoming",
    },
    {
      key: "delivery",
      title:
        key === "shipped" || key === "delivered" || key === "completed"
          ? statusLabel
          : "الشحن والتسليم",
      text:
        key === "shipped" || key === "delivered" || key === "completed"
          ? statusDescription
          : "سيتم شحن طلبك وتسليمه إلى عنوانك.",
      state: "upcoming",
    },
  ];

  if (key === "processing") {
    steps[0].state = "completed";
    steps[1].state = "current";
  } else if (key === "shipped") {
    steps[0].state = "completed";
    steps[1].state = "completed";
    steps[2].state = "current";
  } else if (["delivered", "completed"].includes(key)) {
    steps[0].state = "completed";
    steps[1].state = "completed";
    steps[2].state = "completed";
  }

  const completedBeforeLast = steps.slice(0, -1).filter((step) => step.state === "completed").length;

  return {
    title: "ماذا يحدث الآن؟",
    description:
      key === "processing"
        ? "طلبك قيد التجهيز الآن."
        : key === "shipped"
          ? "تم شحن طلبك وهو في طريقه إليك."
          : ["delivered", "completed"].includes(key)
            ? "اكتملت مراحل معالجة طلبك بنجاح."
            : "هذه هي مراحل معالجة طلبك.",
    steps,
    progressSegments: completedBeforeLast,
  };
}

function SectionCard({
  icon,
  title,
  children,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[24px] border border-zinc-200 bg-white p-5",
        "shadow-[0_10px_30px_rgba(15,23,42,0.035)]",
        className,
      ].join(" ")}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="text-[19px] font-black tracking-tight text-zinc-950">
          {title}
        </div>

        {icon ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500">
            {icon}
          </span>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function ActionLink({
  href,
  children,
  icon,
  dark = false,
}: {
  href: string;
  children: ReactNode;
  icon: ReactNode;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-12 min-w-[168px] items-center justify-center gap-2 rounded-[14px] px-7",
        "text-sm font-black transition active:scale-[0.99]",
        dark
          ? "bg-zinc-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] hover:bg-zinc-800"
          : "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50",
      ].join(" ")}
    >
      <span className={dark ? "text-white" : "text-zinc-900"}>{icon}</span>
      <span className={dark ? "text-white" : "text-zinc-950"}>
        {children}
      </span>
    </Link>
  );
}

function TimelineStep({
  number,
  title,
  text,
  state = "upcoming",
}: {
  number: number;
  title: string;
  text: string;
  state?: TimelineState;
}) {
  const completed = state === "completed";
  const current = state === "current";

  return (
    <div className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center">
      <div
        className={[
          "grid h-11 w-11 place-items-center rounded-full border text-sm font-black shadow-sm",
          completed
            ? "border-emerald-600 bg-emerald-600 text-white"
            : current
              ? "border-[#0d3b45] bg-[#0d3b45] text-white"
              : "border-[#eadfd1] bg-[#fcfaf7] text-zinc-800",
        ].join(" ")}
      >
        {completed ? <Check className="h-5 w-5" /> : number}
      </div>

      <div className="mt-4 text-[15px] font-black text-zinc-950">{title}</div>

      <div className="mt-2 max-w-[165px] text-[12px] leading-6 text-zinc-500">
        {text}
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
  negative = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div
        className={
          strong
            ? "text-[18px] font-black text-zinc-950"
            : "text-[14px] font-bold text-zinc-500"
        }
      >
        {label}
      </div>

      <div
        dir="ltr"
        className={[
          "text-left",
          strong
            ? "text-[27px] font-black tracking-tight text-zinc-950"
            : negative
              ? "text-[15px] font-black text-[#b96c1d]"
              : "text-[15px] font-black text-zinc-950",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function OrderItemRow({
  item,
  currency,
  currencyDecimals,
}: {
  item: OrderItem;
  currency: string;
  currencyDecimals: number;
}) {
  const qty = Math.max(1, Math.floor(n(item.qty || 1)));
  const unitPrice = n(item.price || 0);
  const lineTotal = unitPrice * qty;
  const specialOfferAdjustment = readSpecialOfferAdjustment(item);

  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 py-4 last:border-b-0">
      <div
        dir="ltr"
        className="flex min-w-[112px] items-center justify-start gap-3 text-[15px] font-black text-zinc-950"
      >
        <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-[#f4f1ec] px-2 text-[13px] font-black text-zinc-700">
          {qty}x
        </span>

        <span>{formatMoney(currency, lineTotal, currencyDecimals)}</span>
      </div>

      <div className="min-w-0 flex-1 text-right">
        <div className="truncate text-[16px] font-black text-zinc-950">
          {s(item.title) || "منتج"}
        </div>

        {s(item.subtitle) ? (
          <div className="mt-1 truncate text-[13px] text-zinc-500">
            {item.subtitle}
          </div>
        ) : null}

        {specialOfferAdjustment ? (
          <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
            {specialOfferAdjustment.label}
          </div>
        ) : null}
      </div>

      <div className="grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-50">
        {s(item.imageUrl) ? (
          <img
            src={s(item.imageUrl)}
            alt={s(item.title) || "product"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ShoppingBag className="h-6 w-6 text-zinc-400" />
        )}
      </div>
    </div>
  );
}

function readSpecialOfferAdjustment(item: OrderItem) {
  const source = item.specialOfferAdjustment ?? item.special_offer_adjustment;
  if (!source || typeof source !== "object") return null;

  const discount = round2(source.discount);
  if (discount <= 0) return null;

  return {
    label: s(source.label) || "هدية العرض",
    offerTitle: s(source.offerTitle ?? source.offer_title),
    productName: s(item.title),
    discount,
  };
}

function readThankYouSpecialOffers(data: ThankYouData, items: OrderItem[]) {
  const source = safeObject(data.specialOffers ?? data.special_offers);
  const discount = round2(source.discount);

  const appliedOffers = safeArray(
    source.appliedOffers ?? source.applied_offers,
  );
  const messages = safeArray(source.messages).map(s).filter(Boolean);
  const lineAdjustments = safeArray(
    source.lineAdjustments ?? source.line_adjustments,
  );

  if (discount <= 0 && !appliedOffers.length && !messages.length) return null;

  const itemByProductId = new Map<string, OrderItem>();
  for (const item of items) {
    const adjustmentSource =
      item.specialOfferAdjustment ?? item.special_offer_adjustment;
    const productId = s(
      adjustmentSource?.productId ?? adjustmentSource?.product_id,
    );
    if (productId) itemByProductId.set(productId, item);
  }

  return {
    discount,
    appliedOffers,
    messages,
    gifts: lineAdjustments
      .filter((row: any) => round2(row?.discount) > 0)
      .map((row: any) => {
        const productId = s(row?.productId ?? row?.product_id);
        const productName = s(itemByProductId.get(productId)?.title);

        return {
          productName,
          offerTitle: s(row?.offerTitle ?? row?.offer_title),
        };
      })
      .filter((row: any) => row.productName || row.offerTitle),
  };
}

function SpecialOffersBlock({
  data,
  items,
  money,
}: {
  data: ThankYouData;
  items: OrderItem[];
  money: (amount: number) => string;
}) {
  const specialOffers = readThankYouSpecialOffers(data, items);

  if (!specialOffers) return null;

  const offerTitles = specialOffers.appliedOffers
    .map((offer: any) => s(offer?.title ?? offer?.message))
    .filter(Boolean);
  const titles = Array.from(
    new Set([...offerTitles, ...specialOffers.messages]),
  );

  return (
    <div className="mk-thank-special">
      <div className="mk-thank-special__head">
        <strong>العروض الخاصة</strong>
        {specialOffers.discount > 0 ? (
          <span dir="ltr">- {money(specialOffers.discount)}</span>
        ) : null}
      </div>

      <div className="mk-thank-special__list">
        {titles.map((title) => (
          <div key={title}>تم تطبيق عرض: {title}</div>
        ))}

        {specialOffers.gifts.map((gift: any, index: number) => (
          <div key={`${gift.productName}-${gift.offerTitle}-${index}`}>
            {gift.productName
              ? `هدية العرض: ${gift.productName}`
              : `هدية العرض بسبب: ${gift.offerTitle}`}
          </div>
        ))}
      </div>
    </div>
  );
}

function readThankYouCartOffers(data: ThankYouData) {
  const source = safeObject(data.cartOffers ?? data.cart_offers);
  const discount = round2(source.discount);
  const appliedOffers = safeArray(
    source.appliedOffers ?? source.applied_offers,
  );
  const messages = safeArray(source.messages).map(s).filter(Boolean);

  if (discount <= 0 && !appliedOffers.length && !messages.length) return null;

  return {
    discount,
    titles: Array.from(
      new Set([
        ...appliedOffers
          .map((offer: any) => s(offer?.message) || s(offer?.title))
          .filter(Boolean),
        ...messages,
      ]),
    ),
  };
}

function readExplicitCouponDiscount(data: ThankYouData) {
  const raw: any = data ?? {};
  const coupon =
    raw.coupon ??
    raw.coupon_snapshot ??
    raw.couponSnapshot ??
    raw.appliedCoupon ??
    raw.applied_coupon ??
    {};

  return round2(
    firstValue(
      raw.couponDiscount,
      raw.coupon_discount,
      raw.couponDiscountAmount,
      raw.coupon_discount_amount,
      raw.couponAmount,
      raw.coupon_amount,
      coupon?.discount,
      coupon?.discountAmount,
      coupon?.discount_amount,
      coupon?.amount,
    ),
  );
}

function buildThankYouDiscountBreakdown(
  data: ThankYouData,
  items: OrderItem[],
  discountAmount: number,
) {
  const totalDiscount = round2(discountAmount);
  const specialOffers = readThankYouSpecialOffers(data, items);
  const cartOffers = readThankYouCartOffers(data);

  const knownOffersDiscount = round2(
    round2(specialOffers?.discount ?? 0) + round2(cartOffers?.discount ?? 0),
  );

  const remainingDiscount = Math.max(
    0,
    round2(totalDiscount - knownOffersDiscount),
  );

  const explicitCouponDiscount = readExplicitCouponDiscount(data);

  const couponDiscount =
    explicitCouponDiscount > 0
      ? Math.min(
          remainingDiscount > 0 ? remainingDiscount : explicitCouponDiscount,
          explicitCouponDiscount,
        )
      : remainingDiscount;

  const otherDiscount =
    explicitCouponDiscount > 0
      ? Math.max(0, round2(remainingDiscount - couponDiscount))
      : 0;

  return {
    couponDiscount: round2(couponDiscount),
    otherDiscount: round2(otherDiscount),
  };
}

function CartOffersBlock({
  data,
  money,
}: {
  data: ThankYouData;
  money: (amount: number) => string;
}) {
  const cartOffers = readThankYouCartOffers(data);

  if (!cartOffers) return null;

  return (
    <div className="mk-thank-special">
      <div className="mk-thank-special__head">
        <strong>عروض السلة</strong>
        {cartOffers.discount > 0 ? (
          <span dir="ltr">- {money(cartOffers.discount)}</span>
        ) : null}
      </div>

      {cartOffers.titles.length > 0 ? (
        <div className="mk-thank-special__list">
          {cartOffers.titles.map((title) => (
            <div key={title}>{title}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrderOptionRow({
  option,
  currency,
  currencyDecimals,
}: {
  option: OrderOptionLine;
  currency: string;
  currencyDecimals: number;
}) {
  const value = orderOptionDisplayValue(option);
  const price = round2(option.price_customer ?? option.priceCustomer ?? 0);

  return (
    <div className="rounded-[16px] border border-[#eadcc9] bg-[#fffaf5] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <div className="text-[13px] font-black text-zinc-950">
            {s(option.name ?? option.option_name ?? option.optionName)}
          </div>

          {value ? (
            <div className="mt-1 text-[12px] font-bold leading-5 text-zinc-500">
              {value}
            </div>
          ) : null}
        </div>

        {price > 0 ? (
          <div
            dir="ltr"
            className="shrink-0 rounded-full border border-[#eadcc9] bg-white px-2.5 py-1 text-[12px] font-black text-zinc-800"
          >
            + {formatMoney(currency, price, currencyDecimals)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="h-full rounded-[22px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="text-[17px] font-black text-zinc-950">{title}</div>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600">
          {icon}
        </span>
      </div>

      <div className="text-[16px] font-black leading-7 text-zinc-900">
        {value}
      </div>

      {hint ? (
        <div className="mt-2 text-[13px] leading-6 text-zinc-500">{hint}</div>
      ) : null}
    </div>
  );
}

export default function ThankYouScreen(props: AnyProps) {
  const data = props?.data ?? {};
  const isPaymentSubmitted = usePaymentSubmittedFlag(data);

  const orderNo = s(firstValue(props?.orderNo, data?.orderNo)) || "-";

  const currency =
    pickText(
      props?.currency,
      data?.currency_symbol,
      data?.currencySymbol,
      data?.symbol,
      data?.currency,
      data?.currency_code,
      data?.currencyCode,
    ) || "SAR";

  const rawCurrencyDecimals = firstValue(
    data?.currency_decimals,
    data?.currencyDecimals,
    data?.decimal_digits,
    data?.decimalDigits,
  );

  const currencyDecimals = clampDecimals(
    rawCurrencyDecimals,
    inferCurrencyDecimals(currency),
  );

  const subtotal = hasValue(firstValue(data?.subtotal, data?.subtotalAmount))
    ? n(firstValue(data?.subtotal, data?.subtotalAmount))
    : 0;

  const shippingAmount = hasValue(
    firstValue(data?.shippingAmount, data?.shipping),
  )
    ? n(firstValue(data?.shippingAmount, data?.shipping))
    : 0;

  const discountAmount = hasValue(
    firstValue(data?.discountAmount, data?.discount),
  )
    ? n(firstValue(data?.discountAmount, data?.discount))
    : 0;

  const orderOptions = normalizeOrderOptions(data);

  const orderOptionsFeeFromData = firstValue(
    data?.orderOptionsFee,
    data?.order_options_fee,
  );

  const orderOptionsFee = hasValue(orderOptionsFeeFromData)
    ? round2(orderOptionsFeeFromData)
    : round2(
        orderOptions.reduce(
          (acc, option) =>
            acc + round2(option.price_customer ?? option.priceCustomer ?? 0),
          0,
        ),
      );

  const taxAmount = hasValue(
    firstValue(
      data?.taxAmount,
      data?.vatAmount,
      typeof data?.tax === "object" ? (data?.tax as any)?.amount : data?.tax,
    ),
  )
    ? n(
        firstValue(
          data?.taxAmount,
          data?.vatAmount,
          typeof data?.tax === "object" ? (data?.tax as any)?.amount : data?.tax,
        ),
      )
    : 0;

  const rawPaymentFeeAmount = firstValue(
    data?.paymentFeeAmount,
    data?.payment_fee_amount,
    data?.paymentFee,
    data?.payment_fee,
    data?.codFee,
    data?.cod_fee,
  );

  const rawPaymentFeeTotalAmount = firstValue(
    data?.paymentFeeTotalAmount,
    data?.payment_fee_total,
    data?.paymentFeeTotal,
  );

  const rawTotal = firstValue(
    props?.totalAmount,
    data?.totalAmount,
    data?.total,
    data?.grandTotal,
  );
  const totalAmountFromOrder = hasValue(rawTotal) ? n(rawTotal) : 0;

  const knownTotalWithoutPaymentFee = Math.max(
    0,
    subtotal + taxAmount + shippingAmount + orderOptionsFee - discountAmount,
  );

  const inferredPaymentFeeAmount =
    totalAmountFromOrder > 0
      ? Math.max(
          0,
          Math.round((totalAmountFromOrder - knownTotalWithoutPaymentFee) * 100) /
            100,
        )
      : 0;

  const paymentFeeAmount = hasValue(rawPaymentFeeAmount)
    ? n(rawPaymentFeeAmount)
    : hasValue(rawPaymentFeeTotalAmount)
      ? n(rawPaymentFeeTotalAmount)
      : inferredPaymentFeeAmount;

  const paymentFeeLabel =
    pickText(data?.paymentFeeLabel, data?.payment_fee_label, data?.codFeeLabel) ||
    (s(data?.paymentLabel) === "الدفع عند الاستلام"
      ? "رسوم الدفع عند الاستلام"
      : "رسوم الدفع");

  const taxRate = n(
    firstValue(
      data?.taxRate,
      data?.tax_rate,
      typeof data?.tax === "object" ? (data?.tax as any)?.rate : null,
      0,
    ),
  );

  const taxEnabled = readBool(
    firstValue(
      data?.taxEnabled,
      data?.tax_enabled,
      typeof data?.tax === "object" ? (data?.tax as any)?.enabled : null,
    ),
    taxAmount > 0 || taxRate > 0,
  );

  const pricesIncludeTax = readBool(
    firstValue(
      data?.pricesIncludeTax,
      data?.prices_include_tax,
      typeof data?.tax === "object"
        ? (data?.tax as any)?.pricesIncludeTax ??
            (data?.tax as any)?.prices_include_tax
        : null,
    ),
    false,
  );

  const rawTaxLabel = pickText(
    data?.taxLabel,
    data?.tax_label,
    typeof data?.tax === "object" ? (data?.tax as any)?.label : null,
  );

  const taxLabel =
    !rawTaxLabel || rawTaxLabel.toLowerCase() === "vat"
      ? "ضريبة القيمة المضافة"
      : rawTaxLabel;

  const items = Array.isArray(data?.items) ? data.items : [];

  const discountBreakdown = buildThankYouDiscountBreakdown(
    data,
    items,
    discountAmount,
  );

  const couponDiscountAmount = discountBreakdown.couponDiscount;
  const otherDiscountAmount = discountBreakdown.otherDiscount;

  const showTaxLine = Boolean(taxEnabled && taxAmount > 0);
  const showPaymentFeeLine = paymentFeeAmount > 0;
  const showOrderOptionsLine = orderOptionsFee > 0;
  const showCouponDiscountLine = couponDiscountAmount > 0;
  const showOtherDiscountLine = otherDiscountAmount > 0;

  const computedFromParts = Math.max(
    0,
    subtotal +
      taxAmount +
      shippingAmount +
      paymentFeeAmount +
      orderOptionsFee -
      discountAmount,
  );

  const computedTotal =
    totalAmountFromOrder > 0 ? totalAmountFromOrder : computedFromParts;

  const money = (amount: number) =>
    formatMoney(currency, amount, currencyDecimals);

  const paymentLabel = isPaymentSubmitted
    ? "تحويل بنكي"
    : s(data?.paymentLabel) || "طريقة الدفع المسجلة";

  const paymentStatusLabel = isPaymentSubmitted
    ? "بانتظار مراجعة التحويل"
    : s(data?.paymentStatusLabel) || "قيد المعالجة";

  const estimatedDeliveryText =
    s(data?.estimatedDeliveryText) || "سيتم تحديده قريبًا";

  const deliveryAddressText =
    s(data?.deliveryAddressText) || "العنوان المختار أثناء إتمام الطلب";

  const baseStatusKey = normalizeOrderStatusKey(
    firstValue(
      data?.baseStatusKey,
      data?.base_status_key,
      data?.statusKey,
      data?.status_key,
      data?.status,
    ),
  );

  const paymentReview =
    isPaymentSubmitted &&
    ["", "pending", "pending_review", "pending_payment"].includes(baseStatusKey);

  const statusLabel =
    s(data?.statusLabel) ||
    (paymentReview ? "بانتظار اعتماد الدفع" : "تم استلام الطلب");

  const statusDescription =
    s(data?.statusDescription) ||
    (paymentReview
      ? "تم استلام طلب اعتماد التحويل، وسيقوم المتجر بمراجعته وتحديث حالة الطلب."
      : "تم استلام الطلب وجاري مراجعته.");

  const orderTimeline = buildOrderTimeline({
    statusKey: baseStatusKey,
    statusLabel,
    statusDescription,
    paymentReview,
  });

  const walletUsedAmount = Math.max(0, n(firstValue(data?.walletUsedAmount, data?.wallet_used_amount)));
  const walletRemainingAmount = Math.max(0, n(firstValue(data?.walletRemainingAmount, data?.wallet_remaining_amount)));
  const walletRefundedAmount = Math.max(0, n(firstValue(data?.walletRefundedAmount, data?.wallet_refunded_amount)));
  const hasWalletPayment = walletUsedAmount > 0;
  const totalText = money(computedTotal);
  const invoiceDownloadUrl = s(data?.invoiceDownloadUrl ?? data?.invoice_download_url);

  const bootstrap = props.bootstrap || data?.bootstrap || data?.theme?.bootstrap;

  const supportContacts = getFooterSupportContacts(bootstrap);
  const hasWhatsapp = Boolean(supportContacts.whatsappHref);
  const hasEmail = Boolean(supportContacts.emailHref);

  return (
    <main
      dir="rtl"
      className="min-h-[72vh] text-zinc-950"
      style={{ backgroundColor: "var(--mk-bg-page)" }}
    >
      <section className="mx-auto w-full max-w-[1240px] px-4 pb-10 pt-8 sm:pt-10">
        <div className="mx-auto max-w-[820px] text-center">
          <div className="relative mx-auto grid h-[84px] w-[84px] place-items-center rounded-full border border-[#d8b98d] bg-[#fbf7f0] text-[#9d6c2a]">
            <Check className="h-11 w-11 stroke-[2.55]" />

            <span className="absolute -left-6 top-6 h-1.5 w-1.5 rounded-full bg-[#d2ad72]" />
            <span className="absolute -right-6 top-8 h-1.5 w-1.5 rounded-full bg-[#d2ad72]" />
            <span className="absolute -top-3 right-4 h-1.5 w-1.5 rounded-full bg-[#d2ad72]" />
            <span className="absolute -bottom-2 left-5 h-1.5 w-1.5 rounded-full bg-[#d2ad72]" />
          </div>

          <h1 className="mt-5 text-[34px] font-black leading-tight tracking-tight text-zinc-950 sm:text-[46px]">
            {paymentReview
              ? "تم إرسال طلب اعتماد التحويل"
              : "تم استلام طلبك بنجاح"}
          </h1>

          <p className="mx-auto mt-2 max-w-[620px] text-[15px] leading-7 text-zinc-500 sm:text-[16px]">
            {paymentReview
              ? "تم تسجيل طلب اعتماد التحويل لهذا الطلب. سيقوم المتجر بمراجعته وتحديث حالة الدفع بعد التحقق."
              : "شكرًا لك، ستظهر هنا حالة طلبك الحالية فور تحديثها من المتجر."}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-[#eadcc9] bg-[#fbf6ee] px-5 py-2.5 text-[14px] font-black text-zinc-950">
              <ReceiptText className="h-4 w-4 text-[#9b6b2d]" />
              رقم الطلب
              <span dir="ltr">#{orderNo}</span>
            </span>

            <span className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-[14px] font-black text-zinc-950">
              <Package className="h-4 w-4 text-zinc-500" />
              {statusLabel}
            </span>
          </div>

          {hasWalletPayment ? (
            <div className="mx-auto mt-5 max-w-[620px] rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-right">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-black text-emerald-900">
                <CreditCard className="h-4 w-4" />
                تفاصيل الدفع بالمحفظة
              </div>
              <div className="grid gap-2 text-[14px] sm:grid-cols-2">
                <div className="rounded-xl bg-white px-3 py-2"><span className="text-zinc-500">المدفوع من المحفظة</span><strong className="mt-1 block text-zinc-950">{money(walletUsedAmount)}</strong></div>
                <div className="rounded-xl bg-white px-3 py-2"><span className="text-zinc-500">المتبقي على العميل</span><strong className="mt-1 block text-zinc-950">{money(walletRemainingAmount)}</strong></div>
                {walletRefundedAmount > 0 ? <div className="rounded-xl bg-white px-3 py-2 sm:col-span-2"><span className="text-zinc-500">المسترجع إلى المحفظة</span><strong className="mt-1 block text-zinc-950">{money(walletRefundedAmount)}</strong></div> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-center gap-2 text-[14px] leading-6 text-zinc-500">
            <Mail className="h-4 w-4 shrink-0" />
            <span>
              {paymentReview
                ? "تم تسجيل طلب اعتماد الدفع، ويمكنك متابعة حالة الطلب من حسابك."
                : "تم إرسال تفاصيل الطلب إلى بريدك الإلكتروني، وتظهر حالة طلبك هنا عند كل تحديث."}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <ActionLink
              href="/account/orders"
              icon={<Package className="h-4 w-4" />}
              dark
            >
              تتبع الطلب
            </ActionLink>

            <ActionLink href="/" icon={<ShoppingBag className="h-4 w-4" />}>
              متابعة التسوق
            </ActionLink>

            {invoiceDownloadUrl ? (
              <a
                href={invoiceDownloadUrl}
                className="inline-flex h-12 min-w-[168px] items-center justify-center gap-2 rounded-[14px] border border-zinc-300 bg-white px-7 text-sm font-black text-zinc-950 transition hover:bg-zinc-50 active:scale-[0.99]"
              >
                <Download className="h-4 w-4" />
                تحميل الفاتورة
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
          <section className="space-y-5">
            <SectionCard
              icon={<Clock3 className="h-5 w-5" />}
              title={orderTimeline.title}
            >
              <div className="text-[13px] text-zinc-500">
                {orderTimeline.description}
              </div>

              {orderTimeline.terminal ? (
                <div
                  className={[
                    "mt-5 rounded-[18px] border px-5 py-4",
                    orderTimeline.terminal.tone === "danger"
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "text-[15px] font-black",
                      orderTimeline.terminal.tone === "danger"
                        ? "text-rose-800"
                        : "text-amber-800",
                    ].join(" ")}
                  >
                    {orderTimeline.terminal.title}
                  </div>
                  <div
                    className={[
                      "mt-1 text-[13px] leading-6",
                      orderTimeline.terminal.tone === "danger"
                        ? "text-rose-700"
                        : "text-amber-700",
                    ].join(" ")}
                  >
                    {orderTimeline.terminal.description}
                  </div>
                </div>
              ) : (
                <div className="relative mt-7">
                  <div className="absolute left-[12%] right-[12%] top-[22px] hidden h-px bg-[#e8ddd0] md:block" />
                  <div
                    className="absolute right-[12%] top-[22px] hidden h-px bg-emerald-500 transition-[width] md:block"
                    style={{ width: `${orderTimeline.progressSegments * 38}%` }}
                  />

                  <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
                    {orderTimeline.steps.map((step, index) => (
                      <TimelineStep
                        key={step.key}
                        number={index + 1}
                        title={step.title}
                        text={step.text}
                        state={step.state}
                      />
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <DetailCard
                icon={<Truck className="h-5 w-5" />}
                title="موعد التوصيل المتوقع"
                value={estimatedDeliveryText}
                hint="بحسب شركة الشحن والمنطقة المختارة."
              />

              <DetailCard
                icon={<MapPin className="h-5 w-5" />}
                title="عنوان التوصيل"
                value={deliveryAddressText}
                hint="سيتم استخدام بيانات العنوان المسجلة في طلبك."
              />

              <DetailCard
                icon={<CreditCard className="h-5 w-5" />}
                title="طريقة الدفع"
                value={paymentLabel}
                hint={
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-black text-emerald-700">
                    {paymentStatusLabel}
                  </span>
                }
              />

              <DetailCard
                icon={<ReceiptText className="h-5 w-5" />}
                title="حالة الطلب"
                value={statusLabel}
                hint={statusDescription}
              />
            </div>
          </section>

          <aside>
            <SectionCard
              icon={<ShoppingBag className="h-5 w-5" />}
              title="ملخص الطلب"
              className="h-full"
            >
              {items.length > 0 ? (
                <div className="divide-y divide-zinc-200">
                  {items.map((item, idx) => (
                    <OrderItemRow
                      key={String(item.id ?? idx)}
                      item={item}
                      currency={currency}
                      currencyDecimals={currencyDecimals}
                    />
                  ))}
                </div>
              ) : null}

              {orderOptions.length > 0 ? (
                <div className={items.length > 0 ? "mt-4" : ""}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-[15px] font-black text-zinc-950">
                      <ListChecks className="h-4 w-4 text-[#9b6b2d]" />
                      خيارات الطلب
                    </div>

                    {orderOptionsFee > 0 ? (
                      <div
                        dir="ltr"
                        className="rounded-full border border-[#eadcc9] bg-[#fbf6ee] px-2.5 py-1 text-[12px] font-black text-zinc-800"
                      >
                        + {money(orderOptionsFee)}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {orderOptions.map((option, index) => (
                      <OrderOptionRow
                        key={String(option.id ?? option.option_id ?? index)}
                        option={option}
                        currency={currency}
                        currencyDecimals={currencyDecimals}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <SpecialOffersBlock data={data} items={items} money={money} />
              <CartOffersBlock data={data} money={money} />

              <div
                className={
                  items.length > 0 || orderOptions.length > 0 ? "mt-4" : ""
                }
              >
                <SummaryLine
                  label={
                    showTaxLine && !pricesIncludeTax
                      ? "مجموع المنتجات (بدون ضريبة)"
                      : "مجموع المنتجات"
                  }
                  value={money(subtotal)}
                />

                <SummaryLine label="الشحن" value={money(shippingAmount)} />

                {showOrderOptionsLine ? (
                  <SummaryLine
                    label="خيارات الطلب"
                    value={money(orderOptionsFee)}
                  />
                ) : null}

                {showPaymentFeeLine ? (
                  <SummaryLine
                    label={paymentFeeLabel}
                    value={money(paymentFeeAmount)}
                  />
                ) : null}

                {showTaxLine ? (
                  <SummaryLine label={taxLabel} value={money(taxAmount)} />
                ) : null}

                {showCouponDiscountLine ? (
                  <SummaryLine
                    label="كوبون الخصم"
                    value={`- ${money(couponDiscountAmount)}`}
                    negative
                  />
                ) : null}

                {showOtherDiscountLine ? (
                  <SummaryLine
                    label="خصومات أخرى"
                    value={`- ${money(otherDiscountAmount)}`}
                    negative
                  />
                ) : null}

                <div className="my-2 h-px bg-zinc-200" />

                <div className="rounded-[16px] bg-[#f6f1e8] px-4">
                  <SummaryLine label="الإجمالي" value={totalText} strong />
                </div>

                {showTaxLine || showPaymentFeeLine || showOrderOptionsLine ? (
                  <div className="mt-3 text-center text-[12px] font-bold leading-5 text-zinc-400">
                    * الإجمالي شامل الضريبة والرسوم إن وجدت
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </aside>
        </div>

        <div className="mt-5 rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.035)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#eadcc9] bg-[#fbf6ee] text-[#9b6b2d]">
                <Headphones className="h-5 w-5" />
              </span>

              <div>
                <div className="text-[19px] font-black text-zinc-950">
                  هل تحتاج مساعدة؟
                </div>

                <div className="mt-1 text-[14px] leading-6 text-zinc-500">
                  {hasWhatsapp || hasEmail
                    ? "تواصل معنا عبر وسائل الدعم المسجلة في المتجر."
                    : "فريقنا جاهز لمساعدتك ومتابعة طلبك في أي وقت."}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {hasWhatsapp ? (
                <a
                  href={supportContacts.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 min-w-[155px] items-center justify-center gap-2 rounded-[14px] border border-zinc-300 bg-white px-6 text-sm font-black text-zinc-950 transition hover:bg-zinc-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
              ) : null}

              {hasEmail ? (
                <a
                  href={supportContacts.emailHref}
                  className="inline-flex h-12 min-w-[155px] items-center justify-center gap-2 rounded-[14px] border border-zinc-300 bg-white px-6 text-sm font-black text-zinc-950 transition hover:bg-zinc-50"
                >
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </a>
              ) : null}

              <Link
                href="/"
                className="inline-flex h-12 min-w-[145px] items-center justify-center gap-2 rounded-[14px] border border-zinc-300 bg-white px-6 text-sm font-black text-zinc-950 transition hover:bg-zinc-50"
              >
                <Home className="h-4 w-4" />
                الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}