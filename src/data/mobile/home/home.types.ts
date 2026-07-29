import type { StoreOptions } from "@/lib/store-options";

export type MobileHomeSection = {
  id: string;
  type: string;
  enabled: boolean;
  title: string | null;
  subtitle: string | null;
  display_style: string;
  item_count: number;
  image_size: string;
  radius: string;
  spacing: string;
  colors: { background: string; text: string };
  config: Record<string, unknown>;
};

export type MobileCategoryCard = {
  id: string;
  name: string;
  slug: string;
  public_no: number;
  image_url: string | null;
};



export type MobileCurrencyItem = {
  code: string;
  currency_code: string;
  symbol: string;
  name: string;
  name_ar: string;
  name_en: string | null;
  rate: number;
  decimal_digits: number;
  decimals: number;
  is_default: boolean;
  is_enabled: boolean;
  enabled: boolean;
  sort_order: number;
};

export type MobileCurrencies = {
  enabled: boolean;
  has_multiple: boolean;
  default_code: string;
  active_code: string;
  selected_code: string;
  selected_cookie_name: string;
  items: MobileCurrencyItem[];
  default_currency?: MobileCurrencyItem | null;
  active_currency?: MobileCurrencyItem | null;
};

export type MobileTaxContext = {
  enabled: boolean;
  tax_label: string;
  taxLabel: string;
  label: string;
  prices_include_tax: boolean;
  pricesIncludeTax: boolean;
  shipping_include_tax: boolean;
  shippingIncludeTax: boolean;
  default_rate: number;
  defaultRate: number;
  effective_rate: number;
  effectiveRate: number;
  rate: number;
};

export type MobileProductTax = {
  enabled: boolean;
  label: string;
  rate: number;
  prices_include_tax: boolean;
  should_add_tax_to_price: boolean;
  is_included_in_price: boolean;
  display_label: string | null;
};

export type MobileProductMarketing = {
  collection_id: string;
  slug: string;
  type: string;
  name: string;
  title: string;
  badge_text: string;
  badge_bg: string;
  badge_color: string;
  badge_icon: string;
  href: string;
};

export type MobileProductCard = {
  id: string;
  public_no: number | null;
  name: string;
  image_url: string | null;
  currency: string;
  currency_code: string;
  currency_symbol: string;
  decimal_digits: number;
  price: number | null;
  sale_price: number | null;
  price_mode: "normal" | "start_from";
  min_price: number | null;
  max_price: number | null;
  in_stock: boolean;
  stock_quantity: number | null;
  unlimited_quantity: boolean;
  has_variants: boolean;
  show_tax_included: boolean;
  tax: MobileProductTax;
  promotional_title: string | null;
  rating: number | null;
  review_count: number | null;
  sold_qty: number;
  show_rating: boolean;
  show_purchase_count: boolean;
  marketing?: MobileProductMarketing | null;
  options: Array<{
    id: string;
    name: string;
    option_field_type: string | null;
    display_type: string | null;
    values: Array<{
      id: string;
      name: string;
      display_value: string | null;
      image_url: string | null;
      color?: string | null;
      quantity?: number | null;
      unlimited_quantity?: boolean;
      available?: boolean;
    }>;
  }>;
};


export type MobileStoreReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  published_at: string | null;
  is_verified_purchase: boolean;
  is_featured: boolean;
  helpful_count: number;
};

export type MobileRatingSettings = {
  enabled: boolean;
  allow_hidden_names: boolean;
  show_rating_summary: boolean;
  show_recommendation: boolean;
  display_testimonials: boolean;
  display_customer_reviews: boolean;
};

export type MobileCommerceSettings = {
  checkout: {
    prefill_from_last_order: boolean;
    company_purchase_enabled: boolean;
  };
  tax: {
    enabled: boolean;
    prices_include_tax: boolean;
    shipping_include_tax: boolean;
    tax_label: string;
  };
  wallet: {
    enabled: boolean;
    checkout_enabled: boolean;
    partial_payment_enabled: boolean;
    gifting_enabled: boolean;
  };
  payment_methods: Array<{
    provider_code: string;
    enabled: boolean;
    status: string;
    sort_order: number;
  }>;
  order_options_enabled: boolean;
  store_options: StoreOptions;
};

export type MobileHomePayload = {
  config_version: number;
  app_name_ar: string;
  branding: Record<string, unknown>;
  navigation: Record<string, unknown>;
  sections: MobileHomeSection[];
  categories: MobileCategoryCard[];
  products: MobileProductCard[];
  best_selling_products: MobileProductCard[];
  reviews: MobileStoreReview[];
  rating_settings: MobileRatingSettings;
  currencies: MobileCurrencies;
  tax: MobileTaxContext;
  commerce: MobileCommerceSettings;
};
