//apps/storefront/src/themes/malak/screens-mobile/account/_components/MobileOrderDetails.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import MobileOrderReviewSheet from "./MobileOrderReviewSheet";
import type { OrdersApiRow } from "../../../screens/account/_components/OrdersTable";

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
};

type ApiErrorPayload = {
  ok?: boolean;
  error?: string;
  detail?: any;
  debug?: any;
  received?: any;
  order?: any;
  items?: any[];
  extra?:
    | {
        customer?: {
          full_name?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
        } | null;
        address_label?: string | null;
        address?: any | null;
        shipping_name?: string | null;
        coupon_code?: string | null;
      }
    | any;
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

function safeStr(x: any) {
  return String(x ?? "").trim();
}

function money(x: unknown, c: unknown) {
  const n = Number(x ?? 0);
  const cur = String(c ?? "");
  return `${n.toFixed(2)} ${cur}`.trim();
}

function fmtDate(iso: any) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

function normalizeSelectedOptions(x: any): SelectedOption[] {
  if (!Array.isArray(x)) return [];
  const out: SelectedOption[] = [];
  for (const row of x) {
    const name = String(row?.name ?? "").trim();
    const value = String(row?.value ?? "").trim();
    const id = row?.id ? String(row.id) : undefined;
    if (name && value) out.push({ name, value, id });
  }
  return out;
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
  return safeStr(code);
}

function orderStatusAr(code: string) {
  const v = safeStr(code).toLowerCase();
  if (v === "pending") return "قيد الانتظار";
  if (v === "paid") return "مدفوع";
  if (v === "failed") return "فشل";
  if (v === "cancelled") return "ملغي";
  if (v === "shipped") return "تم الشحن";
  if (v === "completed") return "مكتمل";
  return code || "-";
}

function paymentStatusAr(code: string) {
  const v = safeStr(code).toLowerCase();
  if (v === "unpaid") return "غير مدفوع";
  if (v === "paid") return "مدفوع";
  if (v === "failed") return "فشل";
  if (v === "refunded") return "مسترجع";
  return code || "-";
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

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: strong ? 14 : 13,
          color: strong ? "#111827" : "#64748b",
          fontWeight: strong ? 900 : 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: strong ? 15 : 13,
          color: "#111827",
          fontWeight: strong ? 950 : 900,
          textAlign: "left",
          direction: "ltr",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        padding: "0 10px",
        borderRadius: 999,
        border: "1px solid rgba(17,24,39,0.08)",
        background: "#f8fafc",
        color: "#334155",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function MobileOrderDetails({ orderNo }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let alive = true;

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

        if (res.status === 401) return setState({ kind: "unauth" });
        if (res.status === 404) return setState({ kind: "notfound" });

        if (!res.ok) {
          return setState({
            kind: "error",
            status: res.status,
            payload: json || { error: "REQUEST_FAILED" },
          });
        }

        const o = (json as any)?.order ?? null;
        const extra = (json as any)?.extra ?? null;

        const itemsRaw = Array.isArray((json as any)?.items)
          ? (json as any).items
          : [];

        if (!o?.id) return setState({ kind: "notfound" });

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

        const order: OrderDetails = {
          id: String(o.id),
          public_no: Number(o.public_no ?? 0),
          order_number: Number(o.order_number ?? 0),
          status: String(o.status ?? ""),
          payment_status: String(o.payment_status ?? "unpaid"),
          payment_method: o.payment_method ? String(o.payment_method) : null,

          currency: String(o.currency ?? "SAR"),
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

          customer: customerNormalized,
          address: extra?.address ?? null,
        };

        const items: OrderItem[] = itemsRaw.map((it: any) => ({
          id: String(it.id ?? ""),
          order_id: String(it.order_id ?? ""),
          product_id: String(it.product_id ?? ""),
          variant_id: it.variant_id ? String(it.variant_id) : null,
          name: String(it.name ?? ""),
          sku: it.sku ? String(it.sku) : null,
          qty: Number(it.qty ?? 0),
          currency: String(it.currency ?? order.currency),
          unit_price: Number(it.unit_price ?? 0),
          total_price: Number(it.total_price ?? 0),
          created_at: String(it.created_at ?? ""),
          selected_options: normalizeSelectedOptions(
            it.selected_options ?? it.selectedOptions ?? [],
          ),
        }));

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

    run();
    return () => {
      alive = false;
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

const reviewOrder: OrdersApiRow | null = useMemo(() => {
  if (state.kind !== "ready") return null;

  return {
    id: state.order.id,
    public_no: state.order.public_no,
    order_number: state.order.order_number,
    status: state.order.status,
    payment_status: state.order.payment_status,
    total_amount: state.order.total_amount,
    currency: state.order.currency,
    created_at: state.order.created_at,

    items_count: state.items.length,
    items_qty: state.items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0),
    remaining_items_count: Math.max(state.items.length - 3, 0),
    items_preview: state.items.slice(0, 3).map((item) => ({
      id: item.id,
      product_id: item.product_id || null,
      name: item.name || "منتج",
      qty: Number(item.qty ?? 1),
      image_url: null,
      image_alt: item.name || null,
    })),
  };
}, [state]);

  if (state.kind === "loading") {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(17,24,39,0.06)",
          borderRadius: 24,
          padding: 18,
          color: "#6b7280",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        جاري تحميل تفاصيل الطلب...
      </div>
    );
  }

  if (state.kind === "unauth") {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(17,24,39,0.06)",
          borderRadius: 24,
          padding: 18,
          color: "#6b7280",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        لازم تسجل دخول أولاً.
      </div>
    );
  }

  if (state.kind === "notfound") {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(17,24,39,0.06)",
          borderRadius: 24,
          padding: 18,
          color: "#6b7280",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        الطلب غير موجود.
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(17,24,39,0.06)",
          borderRadius: 24,
          padding: 18,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 900, color: "#111827" }}>
          حصل خطأ أثناء جلب تفاصيل الطلب
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          {state.payload?.error || "REQUEST_FAILED"} ({state.status})
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {isReviewableOrderStatus(state.order.status) ? (
          <div
            style={{
              borderRadius: 24,
              background: "linear-gradient(135deg,#cbb794,#e8dcc8)",
              color: "#3b2d16",
              padding: 18,
              boxShadow: "0 12px 30px rgba(203,183,148,0.22)",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              تقييم الطلب
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                lineHeight: 1.9,
                color: "#4b3a23",
              }}
            >
              قيّم المتجر والمنتجات والشحن لتحسين التجربة بشكل أفضل.
            </div>

            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              style={{
                marginTop: 14,
                height: 42,
                padding: "0 18px",
                borderRadius: 999,
                border: "none",
                background: "#fff",
                color: "#7b6849",
                fontWeight: 950,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              تقييم الآن
            </button>
          </div>
        ) : null}

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.06)",
            borderRadius: 24,
            padding: 16,
            boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                رقم الطلب
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 20,
                  fontWeight: 950,
                  color: "#111827",
                }}
              >
                #{state.order.order_number || state.order.public_no}
              </div>
            </div>

            <Tag>{orderStatusAr(state.order.status)}</Tag>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <SummaryRow
              label="تاريخ الطلب"
              value={fmtDate(state.order.created_at)}
            />
            <SummaryRow
              label="حالة الدفع"
              value={paymentStatusAr(state.order.payment_status)}
            />
            <SummaryRow
              label="طريقة الدفع"
              value={paymentMethodAr(state.order.payment_method)}
            />
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.06)",
            borderRadius: 24,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 950,
              color: "#111827",
              marginBottom: 14,
            }}
          >
            المنتجات
          </div>

          {state.items.length === 0 ? (
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              لا توجد عناصر في هذا الطلب.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {state.items.map((it) => {
                const extras = parseItemExtras(it.selected_options);

                return (
                  <div
                    key={it.id}
                    style={{
                      borderRadius: 20,
                      border: "1px solid rgba(17,24,39,0.06)",
                      background: "#fff",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#111827",
                            lineHeight: 1.7,
                          }}
                        >
                          {it.name}
                        </div>

                        {it.sku ? (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: "#94a3b8",
                              fontWeight: 700,
                            }}
                          >
                            SKU: {it.sku}
                          </div>
                        ) : null}
                      </div>

                      <Tag>الكمية: {it.qty}</Tag>
                    </div>

                    {extras.visibleOptions.length ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        {extras.visibleOptions.map((op, idx) => (
                          <Tag key={`${it.id}-visible-${idx}`}>
                            {op.name}: {op.value}
                          </Tag>
                        ))}
                      </div>
                    ) : null}

                    {extras.customerNote ? (
                      <div
                        style={{
                          marginTop: 12,
                          borderRadius: 16,
                          border: "1px solid rgba(17,24,39,0.06)",
                          background: "#f8fafc",
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 6,
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#334155",
                          }}
                        >
                          ملاحظة العميل
                        </div>

                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: 13,
                            lineHeight: 1.8,
                            color: "#475569",
                          }}
                        >
                          {extras.customerNote}
                        </div>
                      </div>
                    ) : null}

                    {extras.attachments.length ? (
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            marginBottom: 8,
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#334155",
                          }}
                        >
                          الصور المرفقة
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                            gap: 8,
                          }}
                        >
                          {extras.attachments.map((att) => (
                            <div
                              key={`${it.id}-att-${att.index}`}
                              style={{
                                overflow: "hidden",
                                borderRadius: 16,
                                border: "1px solid rgba(17,24,39,0.06)",
                                background: "#fff",
                              }}
                            >
                              <div
                                style={{
                                  aspectRatio: "1 / 1",
                                  background: "#f8fafc",
                                }}
                              >
                                {att.url && isImageUrlLike(att) ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewImage({
                                        url: att.url || "",
                                        title: att.name || `صورة ${att.index}`,
                                      })
                                    }
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      padding: 0,
                                      width: "100%",
                                      height: "100%",
                                      display: "block",
                                      cursor: "zoom-in",
                                    }}
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name || `attachment-${att.index}`}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 24,
                                    }}
                                  >
                                    📎
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                      <SummaryRow
                        label="سعر الوحدة"
                        value={money(it.unit_price, it.currency)}
                      />
                      <SummaryRow
                        label="الإجمالي"
                        value={money(it.total_price, it.currency)}
                        strong
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.06)",
            borderRadius: 24,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 950,
              color: "#111827",
              marginBottom: 14,
            }}
          >
            ملخص الفاتورة
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <SummaryRow
              label="الحالة"
              value={orderStatusAr(state.order.status)}
            />
            <SummaryRow
              label="حالة الدفع"
              value={paymentStatusAr(state.order.payment_status)}
            />
            <SummaryRow
              label="طريقة الدفع"
              value={paymentMethodAr(state.order.payment_method)}
            />
            <SummaryRow
              label="المجموع الفرعي"
              value={money(state.order.subtotal, state.order.currency)}
            />
            <SummaryRow
              label="الشحن"
              value={money(state.order.shipping_amount, state.order.currency)}
            />
            <SummaryRow
              label="الضريبة"
              value={money(state.order.tax_amount, state.order.currency)}
            />
            <SummaryRow
              label="الخصم"
              value={`- ${money(
                state.order.discount_amount,
                state.order.currency,
              )}`}
            />

            <div
              style={{
                height: 1,
                background: "rgba(17,24,39,0.08)",
                margin: "6px 0",
              }}
            />

            <SummaryRow
              label="الإجمالي"
              value={money(state.order.total_amount, state.order.currency)}
              strong
            />
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.06)",
            borderRadius: 24,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 950,
              color: "#111827",
              marginBottom: 14,
            }}
          >
            بيانات العميل
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <SummaryRow
              label="الاسم"
              value={state.order.customer?.full_name || "-"}
            />
            <SummaryRow
              label="الجوال"
              value={state.order.customer?.phone || "-"}
            />
            <SummaryRow
              label="البريد"
              value={state.order.customer?.email || "-"}
            />
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.06)",
            borderRadius: 24,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 950,
              color: "#111827",
              marginBottom: 14,
            }}
          >
            الشحن والخصم
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <SummaryRow
              label="شركة/طريقة الشحن"
              value={state.order.shipping_name || "-"}
            />
            <SummaryRow
              label="كود الخصم"
              value={state.order.coupon_code || "-"}
            />
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.06)",
            borderRadius: 24,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 950,
              color: "#111827",
              marginBottom: 10,
            }}
          >
            عنوان العميل
          </div>

          {state.order.address_label ? (
            <div
              style={{
                marginBottom: 10,
                fontSize: 13,
                fontWeight: 800,
                color: "#334155",
              }}
            >
              {state.order.address_label}
            </div>
          ) : null}

          <div
            style={{
              whiteSpace: "pre-wrap",
              borderRadius: 16,
              background: "#f8fafc",
              padding: 12,
              fontSize: 13,
              lineHeight: 1.8,
              color: "#475569",
            }}
          >
            {renderAddress(state.order.address || state.order.shipping_address)}
          </div>
        </div>
      </div>

      <MobileOrderReviewSheet
        open={reviewOpen}
        order={reviewOrder}
        onClose={() => setReviewOpen(false)}
      />

      {previewImage ? (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.74)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "88vh",
              overflow: "hidden",
              borderRadius: 24,
              background: "#fff",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: "1px solid rgba(17,24,39,0.08)",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#111827",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewImage.title}
              </div>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(17,24,39,0.08)",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                إغلاق
              </button>
            </div>

            <div
              style={{
                maxHeight: "calc(88vh - 60px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8fafc",
                padding: 12,
              }}
            >
              <img
                src={previewImage.url}
                alt={previewImage.title}
                style={{
                  maxHeight: "78vh",
                  width: "auto",
                  maxWidth: "100%",
                  borderRadius: 16,
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type Props = {
  orderNo: string;
};