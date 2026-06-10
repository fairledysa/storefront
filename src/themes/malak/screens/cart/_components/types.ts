// FILE: apps/storefront/src/themes/malak/screens/cart/_components/types.ts

export type CartItemBase = {
  id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  selected_option_value_ids?: string[] | null;
  selected_options?: Array<{ name: string; value: string }> | null;
};

export type ProductOptionValue = {
  id: string;
  option_id: string;
  name: string;
  display_value?: string | null;
  extra_price?: number | null;
  image_url?: string | null;
  sort_order?: number | null;
  is_default?: boolean | null;
};

export type ProductOption = {
  id: string;
  product_id: string;
  name: string;
  is_required?: boolean;
  option_field_type?: string;
  display_type?: "text" | "image" | "color";
  sort_order?: number | null;
  values: ProductOptionValue[];
};

export type ProductVariant = {
  id: string;
  product_id?: string;
  sku?: string | null;
  stock_quantity?: number | null;
  unlimited_quantity?: boolean | null;
  is_default?: boolean | null;
};

export type VariantLink = {
  variant_id: string;
  option_value_id: string;
};

export type CartItemEnriched = CartItemBase & {
    unit_price?: number | null;
  unitPrice?: number | null;

  compare_at_price?: number | null;
  compareAtPrice?: number | null;

  total_price?: number | null;
  totalPrice?: number | null;

  line_total?: number | null;
  lineTotal?: number | null;

  currency?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;

  currency_symbol?: string | null;
  currencySymbol?: string | null;
  symbol?: string | null;

  currency_decimals?: number | null;
  currencyDecimals?: number | null;
  decimal_digits?: number | null;
  decimalDigits?: number | null;

  special_offer_discount?: number | null;
  specialOfferDiscount?: number | null;
  special_offer_adjustment?: CartSpecialOfferAdjustment | null;
  specialOfferAdjustment?: CartSpecialOfferAdjustment | null;
  special_offer_adjustments?: CartSpecialOfferAdjustment[] | null;
  specialOfferAdjustments?: CartSpecialOfferAdjustment[] | null;
  
  product?: {
    id: string;
    name?: string | null;
    image_url?: string | null;

    price?: number | null;
    sale_price?: number | null;

    currency?: string | null;
    currency_code?: string | null;
    currencyCode?: string | null;

    currency_symbol?: string | null;
    currencySymbol?: string | null;
    symbol?: string | null;

    currency_decimals?: number | null;
    currencyDecimals?: number | null;
    decimal_digits?: number | null;
    decimalDigits?: number | null;
  };
  options?: ProductOption[];
  variants?: ProductVariant[];
  variant_links?: VariantLink[];
};

export type CartSpecialOfferAdjustment = {
  cartItemId: string;
  productId: string;
  discount: number;
  label: string;
  offerId: string;
  offerTitle: string;
  offerType: string;
};

export type CartSummaryMoney = {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;

  currency: string;
  currency_code?: string;
  currencyCode?: string;

  currency_symbol?: string;
  currencySymbol?: string;
  symbol?: string;

  currency_decimals?: number;
  currencyDecimals?: number;
  decimal_digits?: number;
  decimalDigits?: number;

  special_offer_line_adjustments?: CartSpecialOfferAdjustment[];
  specialOfferLineAdjustments?: CartSpecialOfferAdjustment[];
};

export type CartCoupon = null | {
  id: string;
  code: string;
  discount_amount: number;
};

export type CartResponse = {
  data?: {
    cart?: any;
    items?: CartItemEnriched[];
    summary?: CartSummaryMoney;
    coupon?: CartCoupon;
  };
  error?: string;
};
