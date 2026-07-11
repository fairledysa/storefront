// FILE: apps/storefront/src/themes/malak/screens-mobile/thankyou/ThankYouMobileScreen.tsx
"use client";

import Link from "next/link";
import {
  Check,
  Clock3,
  CreditCard,
  Download,
  Headphones,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  ReceiptText,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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

type ThankYouData = {
  route?: string;

  paymentSubmitted?: boolean | number | string | null;
  payment_submitted?: boolean | number | string | null;
  bankTransferSubmitted?: boolean | number | string | null;
  bank_transfer_submitted?: boolean | number | string | null;

  orderNo?: string | number;
  invoiceDownloadUrl?: string | null;
  invoice_download_url?: string | null;
  order_no?: string | number;
  orderNumber?: string | number;
  order_number?: string | number;

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

  discountAmount?: number | string | null;
  discount?: number | string | null;

  taxAmount?: number | string | null;
  tax?: number | string | Record<string, any> | null;
  vatAmount?: number | string | null;

  paymentFee?: number | string | null;
  payment_fee?: number | string | null;
  paymentFeeAmount?: number | string | null;
  payment_fee_amount?: number | string | null;
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

type Props = {
  data?: ThankYouData;
  orderNo?: string | number;
  totalAmount?: number | string;
  currency?: string;
  bootstrap?: MalakBootstrap | null;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function n(value: any) {
  const x = Number(value ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function round2(value: any) {
  return Math.round(n(value) * 100) / 100;
}

function hasValue(value: any) {
  return value !== null && value !== undefined && s(value) !== "";
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (hasValue(value)) return value;
  }

  return null;
}

function pickText(...values: any[]) {
  for (const value of values) {
    const out = s(value);
    if (out) return out;
  }

  return "";
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
  };
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mk-mthank-card">
      <div className="mk-mthank-card__head">
        <strong>{title}</strong>

        {icon ? <span>{icon}</span> : null}
      </div>

      {children}
    </section>
  );
}

function MoneyRow({
  label,
  value,
  strong = false,
  negative = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={[
        "mk-mthank-moneyRow",
        strong ? "is-strong" : "",
        negative ? "is-negative" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <strong dir="ltr">{value}</strong>
    </div>
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
  const done = state === "completed";
  const current = state === "current";

  return (
    <div
      className={[
        "mk-mthank-step",
        done ? "is-done" : "",
        current ? "is-current" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="mk-mthank-step__dot">
        {done ? <Check size={15} /> : number}
      </span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Detail({
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
    <div className="mk-mthank-detail">
      <span className="mk-mthank-detail__icon">{icon}</span>

      <div>
        <strong>{title}</strong>
        <div className="mk-mthank-detail__value">{value}</div>
        {hint ? <div className="mk-mthank-detail__hint">{hint}</div> : null}
      </div>
    </div>
  );
}

function ProductRow({
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
  const title = s(item.title) || "منتج";
  const imageUrl = s(item.imageUrl);
  const specialOfferAdjustment = readSpecialOfferAdjustment(item);

  return (
    <div className="mk-mthank-product">
      <div className="mk-mthank-product__img">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" decoding="async" />
        ) : (
          <ShoppingBag size={20} />
        )}
      </div>

      <div className="mk-mthank-product__text">
        <strong>{title}</strong>

        {s(item.subtitle) ? <span>{item.subtitle}</span> : null}

        <em>{qty} قطعة</em>

        {specialOfferAdjustment ? (
          <small className="mk-mthank-product__gift">
            {specialOfferAdjustment.label}
          </small>
        ) : null}
      </div>

      <div className="mk-mthank-product__price" dir="ltr">
        {formatMoney(currency, lineTotal, currencyDecimals)}
      </div>
    </div>
  );
}

function readSpecialOfferAdjustment(item: OrderItem) {
  const source = item.specialOfferAdjustment ?? item.special_offer_adjustment;
  if (!source || typeof source !== "object") return null;

  const discount = n(source.discount);
  if (!Number.isFinite(discount) || discount <= 0) return null;

  return {
    label: s(source.label) || "هدية العرض",
    offerTitle: s(source.offerTitle ?? source.offer_title),
    productName: s(item.title),
    discount,
  };
}

function readThankYouSpecialOffers(data: ThankYouData, items: OrderItem[]) {
  const source =
    data.specialOffers && typeof data.specialOffers === "object"
      ? data.specialOffers
      : data.special_offers && typeof data.special_offers === "object"
        ? data.special_offers
        : {};
  const discount = n(source.discount);
  const appliedOffers = Array.isArray(source.appliedOffers)
    ? source.appliedOffers
    : Array.isArray(source.applied_offers)
      ? source.applied_offers
      : [];
  const messages = Array.isArray(source.messages)
    ? source.messages.map(s).filter(Boolean)
    : [];
  const lineAdjustments = Array.isArray(source.lineAdjustments)
    ? source.lineAdjustments
    : Array.isArray(source.line_adjustments)
      ? source.line_adjustments
      : [];

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
    titles: Array.from(
      new Set([
        ...appliedOffers
          .map((offer: any) => s(offer?.title ?? offer?.message))
          .filter(Boolean),
        ...messages,
      ]),
    ),
    gifts: lineAdjustments
      .filter((row: any) => n(row?.discount) > 0)
      .map((row: any) => {
        const productId = s(row?.productId ?? row?.product_id);
        return {
          productName: s(itemByProductId.get(productId)?.title),
          offerTitle: s(row?.offerTitle ?? row?.offer_title),
        };
      })
      .filter((row: any) => row.productName || row.offerTitle),
  };
}

function SpecialOffersSection({
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

  return (
    <div className="mk-mthank-special">
      <div className="mk-mthank-special__head">
        <strong>العروض الخاصة</strong>
        {specialOffers.discount > 0 ? (
          <span dir="ltr">- {money(specialOffers.discount)}</span>
        ) : null}
      </div>

      <div className="mk-mthank-special__list">
        {specialOffers.titles.map((title) => (
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
  const source =
    data.cartOffers && typeof data.cartOffers === "object"
      ? data.cartOffers
      : data.cart_offers && typeof data.cart_offers === "object"
        ? data.cart_offers
        : {};

  const discount = n(source.discount);
  const appliedOffers = Array.isArray(source.appliedOffers)
    ? source.appliedOffers
    : Array.isArray(source.applied_offers)
      ? source.applied_offers
      : [];
  const messages = Array.isArray(source.messages)
    ? source.messages.map(s).filter(Boolean)
    : [];

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

function CartOffersSection({
  data,
  money,
}: {
  data: ThankYouData;
  money: (amount: number) => string;
}) {
  const cartOffers = readThankYouCartOffers(data);

  if (!cartOffers) return null;

  return (
    <div className="mk-mthank-special">
      <div className="mk-mthank-special__head">
        <strong>عروض السلة</strong>
        {cartOffers.discount > 0 ? (
          <span dir="ltr">- {money(cartOffers.discount)}</span>
        ) : null}
      </div>

      {cartOffers.titles.length > 0 ? (
        <div className="mk-mthank-special__list">
          {cartOffers.titles.map((title) => (
            <div key={title}>{title}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ThankYouMobileScreen(props: Props) {
  const data = props.data ?? {};
  const isPaymentSubmitted = usePaymentSubmittedFlag(data);

  const orderNo =
    s(
      firstValue(
        props.orderNo,
        data.orderNo,
        data.order_no,
        data.orderNumber,
        data.order_number,
      ),
    ) || "-";

  const currency =
    pickText(
      props.currency,
      data.currency_symbol,
      data.currencySymbol,
      data.symbol,
      data.currency,
      data.currency_code,
      data.currencyCode,
    ) || "SAR";

  const currencyDecimals = clampDecimals(
    firstValue(
      data.currency_decimals,
      data.currencyDecimals,
      data.decimal_digits,
      data.decimalDigits,
    ),
    inferCurrencyDecimals(currency),
  );

  const subtotal = hasValue(firstValue(data.subtotal, data.subtotalAmount))
    ? n(firstValue(data.subtotal, data.subtotalAmount))
    : 0;

  const shippingAmount = hasValue(firstValue(data.shippingAmount, data.shipping))
    ? n(firstValue(data.shippingAmount, data.shipping))
    : 0;

  const discountAmount = hasValue(firstValue(data.discountAmount, data.discount))
    ? n(firstValue(data.discountAmount, data.discount))
    : 0;

  const taxAmount = hasValue(
    firstValue(
      data.taxAmount,
      data.vatAmount,
      typeof data.tax === "object" ? (data.tax as any)?.amount : data.tax,
    ),
  )
    ? n(
        firstValue(
          data.taxAmount,
          data.vatAmount,
          typeof data.tax === "object" ? (data.tax as any)?.amount : data.tax,
        ),
      )
    : 0;

  const paymentFeeAmount = hasValue(
    firstValue(
      data.paymentFeeAmount,
      data.payment_fee_amount,
      data.paymentFee,
      data.payment_fee,
      data.codFee,
      data.cod_fee,
    ),
  )
    ? n(
        firstValue(
          data.paymentFeeAmount,
          data.payment_fee_amount,
          data.paymentFee,
          data.payment_fee,
          data.codFee,
          data.cod_fee,
        ),
      )
    : 0;

  const rawTotal = firstValue(
    props.totalAmount,
    data.totalAmount,
    data.total,
    data.grandTotal,
  );

  const computedTotal = hasValue(rawTotal)
    ? n(rawTotal)
    : Math.max(
        0,
        subtotal + shippingAmount + taxAmount + paymentFeeAmount - discountAmount,
      );

  const money = (amount: number) =>
    formatMoney(currency, amount, currencyDecimals);

  const paymentLabel = isPaymentSubmitted
    ? "تحويل بنكي"
    : s(data.paymentLabel) || "طريقة الدفع المسجلة";

  const paymentStatusLabel = isPaymentSubmitted
    ? "بانتظار مراجعة التحويل"
    : s(data.paymentStatusLabel) || "قيد المعالجة";

  const baseStatusKey = normalizeOrderStatusKey(
    firstValue(
      data.baseStatusKey,
      data.base_status_key,
      data.statusKey,
      data.status_key,
      data.status,
    ),
  );

  const paymentReview =
    isPaymentSubmitted &&
    ["", "pending", "pending_review", "pending_payment"].includes(baseStatusKey);

  const statusLabel =
    s(data.statusLabel) ||
    (paymentReview ? "بانتظار اعتماد الدفع" : "تم استلام الطلب");

  const statusDescription =
    s(data.statusDescription) ||
    (paymentReview
      ? "تم استلام طلب اعتماد التحويل، وسيقوم المتجر بمراجعته وتحديث حالة الطلب."
      : "تم استلام الطلب وجاري مراجعته.");

  const orderTimeline = buildOrderTimeline({
    statusKey: baseStatusKey,
    statusLabel,
    statusDescription,
    paymentReview,
  });

  const estimatedDeliveryText =
    s(data.estimatedDeliveryText) || "سيتم تحديده قريبًا";
  const deliveryAddressText =
    s(data.deliveryAddressText) || "العنوان المختار أثناء إتمام الطلب";

  const items = Array.isArray(data.items) ? data.items : [];

  const discountBreakdown = buildThankYouDiscountBreakdown(
    data,
    items,
    discountAmount,
  );

  const couponDiscountAmount = discountBreakdown.couponDiscount;
  const otherDiscountAmount = discountBreakdown.otherDiscount;

  const bootstrap = props.bootstrap || data.bootstrap || data.theme?.bootstrap;
  const supportContacts = getFooterSupportContacts(bootstrap);

  const hasWhatsapp = Boolean(supportContacts.whatsappHref);
  const hasEmail = Boolean(supportContacts.emailHref);

  const invoiceDownloadUrl = s(data.invoiceDownloadUrl ?? data.invoice_download_url);

  const paymentFeeLabel =
    pickText(data.paymentFeeLabel, data.payment_fee_label, data.codFeeLabel) ||
    (paymentLabel === "الدفع عند الاستلام"
      ? "رسوم الدفع عند الاستلام"
      : "رسوم الدفع");

  const walletUsedAmount = Math.max(0, n(firstValue(data.walletUsedAmount, data.wallet_used_amount)));
  const walletRemainingAmount = Math.max(0, n(firstValue(data.walletRemainingAmount, data.wallet_remaining_amount)));
  const walletRefundedAmount = Math.max(0, n(firstValue(data.walletRefundedAmount, data.wallet_refunded_amount)));
  const hasWalletPayment = walletUsedAmount > 0;

  return (
    <main dir="rtl" className="mk-mthank">
      <section className="mk-mthank-hero">
        <div className="mk-mthank-hero__check">
          <Check size={34} />
        </div>

        <div className="mk-mthank-hero__eyebrow">
          {paymentReview ? "تم إرسال طلب الاعتماد" : "تم تأكيد الطلب"}
        </div>

        <h1>
          {paymentReview
            ? "تم إرسال طلب اعتماد التحويل"
            : "تم استلام طلبك بنجاح"}
        </h1>

        <p>
          {paymentReview
            ? "تم تسجيل طلب اعتماد التحويل لهذا الطلب. سيقوم المتجر بمراجعته وتحديث حالة الدفع بعد التحقق."
            : "شكرًا لك، ستظهر هنا حالة طلبك الحالية فور تحديثها من المتجر."}
        </p>

        <div className="mk-mthank-hero__chips">
          <span>
            <ReceiptText size={15} />
            رقم الطلب
            <strong dir="ltr">#{orderNo}</strong>
          </span>

          <span>
            <Package size={15} />
            {statusLabel}
          </span>
        </div>
      </section>

      {hasWalletPayment ? (
        <section className="mk-mthank-card mk-mthank-wallet">
          <div className="mk-mthank-card__head">
            <CreditCard size={18} />
            <strong>تفاصيل الدفع بالمحفظة</strong>
          </div>
          <div className="mk-mthank-wallet__grid">
            <div><span>المدفوع من المحفظة</span><strong>{money(walletUsedAmount)}</strong></div>
            <div><span>المتبقي على العميل</span><strong>{money(walletRemainingAmount)}</strong></div>
            {walletRefundedAmount > 0 ? <div><span>المسترجع إلى المحفظة</span><strong>{money(walletRefundedAmount)}</strong></div> : null}
          </div>
        </section>
      ) : null}

      <section className="mk-mthank-total">
        <div>
          <span>إجمالي الطلب</span>
          <strong dir="ltr">{money(computedTotal)}</strong>
        </div>

        <div>
          <span>طريقة الدفع</span>
          <strong>{paymentLabel}</strong>
        </div>
      </section>

      <section className="mk-mthank-actions">
        <Link href="/account/orders" className="mk-mthank-action is-primary">
          <Package size={17} />
          تتبع الطلب
        </Link>

        <Link href="/" className="mk-mthank-action">
          <ShoppingBag size={17} />
          متابعة التسوق
        </Link>

        {invoiceDownloadUrl ? (
          <a href={invoiceDownloadUrl} className="mk-mthank-action">
            <Download size={17} />
            الفاتورة
          </a>
        ) : null}
      </section>

      <Section title={orderTimeline.title} icon={<Clock3 size={19} />}>
        <div className="mk-mthank-timelineIntro">{orderTimeline.description}</div>

        {orderTimeline.terminal ? (
          <div
            className={[
              "mk-mthank-statusAlert",
              orderTimeline.terminal.tone === "danger"
                ? "is-danger"
                : "is-warning",
            ].join(" ")}
          >
            <strong>{orderTimeline.terminal.title}</strong>
            <p>{orderTimeline.terminal.description}</p>
          </div>
        ) : (
          <div className="mk-mthank-timeline">
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
        )}
      </Section>

      <Section title="ملخص الطلب" icon={<ShoppingBag size={19} />}>
        {items.length > 0 ? (
          <div className="mk-mthank-products">
            {items.map((item, index) => (
              <ProductRow
                key={String(item.id ?? index)}
                item={item}
                currency={currency}
                currencyDecimals={currencyDecimals}
              />
            ))}
          </div>
        ) : (
          <div className="mk-mthank-empty">لا توجد منتجات ظاهرة في الملخص.</div>
        )}

        <div className="mk-mthank-moneyBox">
          <SpecialOffersSection data={data} items={items} money={money} />
          <CartOffersSection data={data} money={money} />

          <MoneyRow label="مجموع المنتجات" value={money(subtotal)} />
          <MoneyRow label="الشحن" value={money(shippingAmount)} />

          {paymentFeeAmount > 0 ? (
            <MoneyRow label={paymentFeeLabel} value={money(paymentFeeAmount)} />
          ) : null}

          {taxAmount > 0 ? (
            <MoneyRow label="ضريبة القيمة المضافة" value={money(taxAmount)} />
          ) : null}

          {couponDiscountAmount > 0 ? (
            <MoneyRow
              label="كوبون الخصم"
              value={`- ${money(couponDiscountAmount)}`}
              negative
            />
          ) : null}

          {otherDiscountAmount > 0 ? (
            <MoneyRow
              label="خصومات أخرى"
              value={`- ${money(otherDiscountAmount)}`}
              negative
            />
          ) : null}

          <MoneyRow label="الإجمالي" value={money(computedTotal)} strong />
        </div>
      </Section>

      <Section title="تفاصيل الطلب" icon={<ReceiptText size={19} />}>
        <div className="mk-mthank-details">
          <Detail
            icon={<Truck size={18} />}
            title="موعد التوصيل المتوقع"
            value={estimatedDeliveryText}
            hint="بحسب شركة الشحن والمنطقة المختارة."
          />

          <Detail
            icon={<MapPin size={18} />}
            title="عنوان التوصيل"
            value={deliveryAddressText}
            hint="سيتم استخدام العنوان المسجل في الطلب."
          />

          <Detail
            icon={<CreditCard size={18} />}
            title="حالة الدفع"
            value={paymentLabel}
            hint={
              <span className="mk-mthank-payStatus">{paymentStatusLabel}</span>
            }
          />

          <Detail
            icon={<Package size={18} />}
            title="حالة الطلب"
            value={statusLabel}
            hint={statusDescription}
          />
        </div>
      </Section>

      <Section title="هل تحتاج مساعدة؟" icon={<Headphones size={19} />}>
        <div className="mk-mthank-support">
          <p>
            {hasWhatsapp || hasEmail
              ? "تواصل معنا عبر وسائل الدعم المسجلة في المتجر."
              : "يمكنك الرجوع للرئيسية أو متابعة طلبك من حسابك."}
          </p>

          <div className="mk-mthank-support__actions">
            {hasWhatsapp ? (
              <a
                href={supportContacts.whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} />
                واتساب
              </a>
            ) : null}

            {hasEmail ? (
              <a href={supportContacts.emailHref}>
                <Mail size={17} />
                البريد الإلكتروني
              </a>
            ) : null}

            <Link href="/">
              <Home size={17} />
              الرئيسية
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}