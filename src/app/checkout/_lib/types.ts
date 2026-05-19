// FILE: apps/storefront/src/app/checkout/_lib/types.ts
export type CheckoutSummary = {
  cart_id: string;
  currency: string;
  lines: Array<{
    item_id: string;
    product_id: string;
    variant_id: string | null;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  discount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  coupon: null | {
    id: string;
    code: string;
    discount_type: "P" | "F";
    amount: number;
    maximum_amount: number | null;
    free_shipping: boolean;
  };
};

export type CheckoutPrepareRes =
  | { ok: true; cart: any; summary: CheckoutSummary }
  | { ok: false; error: string };

export type ApplyCouponRes =
  | { ok: true; cart: any; summary: CheckoutSummary }
  | { ok: false; error: string };

export type SubmitRes =
  | { ok: true; order: any; summary: CheckoutSummary }
  | { ok: false; error: string };

export type ShippingAddress = {
  recipient_name: string;
  phone_e164: string;
  address_line1: string;
  address_line2?: string;
  city_id?: string;
  notes?: string;
};
