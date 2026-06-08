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
};

type ThankYouData = {
  route?: string;

  paymentSubmitted?: boolean | number | string | null;
  payment_submitted?: boolean | number | string | null;
  bankTransferSubmitted?: boolean | number | string | null;
  bank_transfer_submitted?: boolean | number | string | null;

  orderNo?: string | number;
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

  estimatedDeliveryText?: string | null;
  deliveryAddressText?: string | null;

  statusLabel?: string | null;
  statusDescription?: string | null;

  items?: OrderItem[];

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
  done,
  title,
  text,
}: {
  done?: boolean;
  title: string;
  text: string;
}) {
  return (
    <div className={["mk-mthank-step", done ? "is-done" : ""].join(" ")}>
      <span className="mk-mthank-step__dot">
        {done ? <Check size={15} /> : null}
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
      </div>

      <div className="mk-mthank-product__price" dir="ltr">
        {formatMoney(currency, lineTotal, currencyDecimals)}
      </div>
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

  const statusLabel = isPaymentSubmitted
    ? "بانتظار اعتماد الدفع"
    : s(data.statusLabel) || "تم الاستلام";

  const statusDescription = isPaymentSubmitted
    ? "تم استلام طلب اعتماد التحويل، وسيقوم المتجر بمراجعته وتحديث حالة الطلب."
    : s(data.statusDescription) || "تم استلام الطلب وجاري مراجعته.";

  const estimatedDeliveryText =
    s(data.estimatedDeliveryText) || "سيتم تحديده قريبًا";
  const deliveryAddressText =
    s(data.deliveryAddressText) || "العنوان المختار أثناء إتمام الطلب";

  const items = Array.isArray(data.items) ? data.items : [];

  const bootstrap = props.bootstrap || data.bootstrap || data.theme?.bootstrap;
  const supportContacts = getFooterSupportContacts(bootstrap);

  const hasWhatsapp = Boolean(supportContacts.whatsappHref);
  const hasEmail = Boolean(supportContacts.emailHref);

  const paymentFeeLabel =
    pickText(data.paymentFeeLabel, data.payment_fee_label, data.codFeeLabel) ||
    (paymentLabel === "الدفع عند الاستلام"
      ? "رسوم الدفع عند الاستلام"
      : "رسوم الدفع");

  return (
    <main dir="rtl" className="mk-mthank">
      <section className="mk-mthank-hero">
        <div className="mk-mthank-hero__check">
          <Check size={34} />
        </div>

        <div className="mk-mthank-hero__eyebrow">
          {isPaymentSubmitted ? "تم إرسال طلب الاعتماد" : "تم تأكيد الطلب"}
        </div>

        <h1>
          {isPaymentSubmitted
            ? "تم إرسال طلب اعتماد التحويل"
            : "تم استلام طلبك بنجاح"}
        </h1>

        <p>
          {isPaymentSubmitted
            ? "تم تسجيل طلب اعتماد التحويل لهذا الطلب. سيقوم المتجر بمراجعته وتحديث حالة الدفع بعد التحقق."
            : "شكرًا لك، تم استلام الطلب وسيتم البدء في مراجعته وتجهيزه."}
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

        <button
          type="button"
          className="mk-mthank-action"
          onClick={() => window.print()}
        >
          <Download size={17} />
          الفاتورة
        </button>
      </section>

      <Section title="ماذا يحدث الآن؟" icon={<Clock3 size={19} />}>
        <div className="mk-mthank-timeline">
          <TimelineStep
            done
            title={
              isPaymentSubmitted ? "استلام طلب الاعتماد" : "استلام الطلب"
            }
            text={
              isPaymentSubmitted
                ? "وصل طلب اعتماد التحويل للمتجر وتم تسجيله."
                : "وصل طلبك للمتجر وتم تسجيله بنجاح."
            }
          />

          <TimelineStep
            title={isPaymentSubmitted ? "مراجعة التحويل" : "المراجعة والتجهيز"}
            text={
              isPaymentSubmitted
                ? "سيقوم المتجر بمراجعة بيانات التحويل وتحديث حالة الدفع."
                : "سيتم مراجعة بيانات الطلب وتجهيزه للشحن."
            }
          />

          <TimelineStep
            title={isPaymentSubmitted ? "اعتماد الدفع" : "الشحن والتسليم"}
            text={
              isPaymentSubmitted
                ? "بعد الاعتماد سيتم تحديث حالة الطلب."
                : "سيتم تسليم الطلب حسب العنوان وطريقة الشحن."
            }
          />
        </div>
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
          <MoneyRow label="مجموع المنتجات" value={money(subtotal)} />
          <MoneyRow label="الشحن" value={money(shippingAmount)} />

          {paymentFeeAmount > 0 ? (
            <MoneyRow label={paymentFeeLabel} value={money(paymentFeeAmount)} />
          ) : null}

          {taxAmount > 0 ? (
            <MoneyRow label="ضريبة القيمة المضافة" value={money(taxAmount)} />
          ) : null}

          {discountAmount > 0 ? (
            <MoneyRow
              label="الخصم"
              value={`- ${money(discountAmount)}`}
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