// FILE: apps/storefront/src/themes/basit/bootstrap/types.ts

import type { SeoUrlMode } from "@/data/store/settings";
import type { ThemeCustomCode } from "@/theme-engine/injectors/custom-code";

export type MalakBootstrapCategory = {
  id: string;
  name: string;
  slug?: string | null;
  href: string;
  public_no?: number | null;
  short_url?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
  depth?: number | null;
  path?: string | null;
  image?: { url: string; alt?: string | null } | null;
  children: MalakBootstrapCategory[];
};

/* =========================
   Store Currencies
   مصدرها: stores.default_currency + store_currencies
   ========================= */

export type MalakBootstrapCurrency = {
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

export type MalakBootstrapCurrencies = {
  enabled: boolean;
  has_multiple: boolean;

  default_code: string;
  active_code: string;
  selected_code: string;

  selected_cookie_name: string;

  items: MalakBootstrapCurrency[];

  default_currency?: MalakBootstrapCurrency | null;
  active_currency?: MalakBootstrapCurrency | null;
};

/* =========================
   Store Tax Settings
   مصدرها: store_tax_settings + store_tax_rates
   ========================= */

export type MalakBootstrapTaxRate = {
  country_code: string;
  countryCode: string;

  country_name_ar: string;
  countryNameAr: string;

  country_name_en: string | null;
  countryNameEn: string | null;

  rate: number;

  is_active: boolean;
  isActive: boolean;

  sort_order: number;
  sortOrder: number;

  metadata?: Record<string, any>;
};

export type MalakBootstrapTax = {
  enabled: boolean;

  tax_label: string;
  taxLabel: string;
  label: string;

  tax_number: string | null;
  taxNumber: string | null;

  tax_certificate_url: string | null;
  taxCertificateUrl: string | null;

  certificate_url: string | null;
  certificateUrl: string | null;

  prices_include_tax: boolean;
  pricesIncludeTax: boolean;

  shipping_include_tax: boolean;
  shippingIncludeTax: boolean;

  show_tax_number_in_footer: boolean;
  showTaxNumberInFooter: boolean;

  show_tax_certificate_icon: boolean;
  showTaxCertificateIcon: boolean;

  default_country_code: string | null;
  defaultCountryCode: string | null;

  default_rate: number;
  defaultRate: number;

  effective_rate: number;
  effectiveRate: number;

  rate: number;

  rates: MalakBootstrapTaxRate[];

  metadata: Record<string, any>;
};

export type MalakBootstrapMegaMenuBanner = {
  id: string;
  title?: string;
  image_url: string;
  href?: string;
  sort_order: number;
  is_enabled: boolean;
};

export type MalakBootstrapMegaMenuCategorySettings = {
  enabled: boolean;
  layout: "links_only" | "links_with_banners";
  banners: MalakBootstrapMegaMenuBanner[];
};

export type MalakBootstrapMegaMenuValue = {
  categories: Record<string, MalakBootstrapMegaMenuCategorySettings>;
};

export type MalakBootstrapFooterLink = {
  id: string;
  label: string;
  href: string;
  group?: string | null;
  sort_order?: number | null;
};

export type MalakBootstrapHelpItem = {
  title: string;
  value: string;
  icon: string;
  href: string;
};

export type MalakBootstrapSocial = {
  label: string;
  icon: string;
  href: string;
};

export type MalakBootstrapPayment = {
  label: string;
  image_url: string;
};

export type MalakBootstrapAnnouncement = {
  enabled: boolean;
  icon: string | null;
  title: string;
  content: string;
  text: string;
  href: string;
  link_type: string;
  link_value: string;
  link_label: string;
  ends_at: string | null;
  pages: string[] | string;
  text_color: string;
  background_color: string;
};

export type MalakBootstrapFooterApp = {
  ios: string;
  android: string;
};

export type MalakBootstrapBusinessCertificate = {
  enabled: boolean;
  title: string;
  image_url: string;
  link: string;
};

export type MalakBootstrapFloatingActions = {
  scroll_top_enabled: boolean;
  scroll_top_position: "left" | "right";
  scroll_top_color: string;

  wa_enabled: boolean;
  wa_number: string;
  wa_btn_bg: string;
  wa_btn_text_color: string;
  wa_btn_text: string;
  interactive_wa: boolean;
  wa_position: "left" | "right";

  phone_btn_enabled: boolean;
  phone_number: string;
  phone_position: "left" | "right";
};

export type MalakBootstrapFooterOptions = {
  footer_logo_width: number;
  footer_logo_height: number;

  enable_bottom_nav: boolean;
  mobile_bottom_nav_style: "solid" | "frosted";
  mobile_bottom_nav_bg: string;
  mobile_bottom_nav_text_color: string;

  footer_is_dark: boolean;
  footer_bg: string;
  footer_text_color: string;
  bottom_footer_bg: string;

  show_basic_footer: boolean;

  enhanced_links: boolean;
  links_with_bullits: boolean;

  enhanced_social_icons: boolean;
  rounded_contacts: boolean;

  mini_sbc: boolean;

  footer_show_newsletter: boolean;
  show_footer_logos: boolean;
  footer_logos?: unknown;
};

export type MalakBootstrapProductOptions = {
  show_singleSelection: boolean;
  show_multipleOption: boolean;

  enable_add_product_toast: boolean;

  activate_zoom: boolean;

  enhanced_brand_senction: boolean;

  desktop_product_thumbnails_position: "bottom" | "side";
  thumbs_bottom: boolean;
  disable_thumbs_in_mobile: boolean;

  show_payments_in_product_single: boolean;
  show_category_in_product_single: boolean;

  hide_ratings: boolean;

  replace_slider_text: boolean;

  hide_countdown: boolean;
  show_discounted_amount: boolean;

  update_both_prices: boolean;
  hide_top_price: boolean;

  top_details_tabs: boolean;
  mini_offers_box: boolean;

  show_product_features: boolean;
  show_sidebar: boolean;

  show_sticky_product: boolean;
  sticky_add_to_cart: boolean;

  show_tags: boolean;

  slider_background_size: "cover" | "contain" | "fill";
};

export type MalakBootstrapHeaderOptions = {
  background_color: string;
  text_color: string;

  sticky_header: boolean;
  centered_logo: boolean;
  mobile_only_centered_logo: boolean;

  hide_topnav: boolean;
  hide_topnav_links: boolean;
  hide_topnav_contacts: boolean;
  topnav_dark: boolean;

  default_menu: boolean;
  desktop_sidemenu: boolean;

  transparent_header: boolean;
  slider_overlay: boolean;

  logo_width: number;
  logo_height: number;

  reversed_logo: string | null;
  show_reversed_logo: boolean;
  show_reversed_logo_in_footer: boolean;
  show_original_logo_on_scroll: boolean;
};

/* =========================
   Marketing Tools
   ========================= */

export type MalakBootstrapMarketingSearchItem = {
  id: string;
  title: string;
  label?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  href: string;
  url?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  img?: string | null;
  logo_url?: string | null;
  icon?: string | null;
  type?: "keyword" | "brand" | "category" | "product" | "link" | string;
  enabled: boolean;
  sort_order: number;
};

export type MalakBootstrapMarketingSearchGroup = {
  id: string;
  title: string;
  name?: string;
  description?: string;
  style: "chips" | "circles" | "cards" | "logos" | "compact" | string;
  enabled: boolean;
  sort_order: number;
  items: MalakBootstrapMarketingSearchItem[];
};

export type MalakBootstrapMarketingSearch = {
  enabled: boolean;
  title: string;
  placeholder: string;
  groups: MalakBootstrapMarketingSearchGroup[];
};

export type MalakBootstrapMarketing = {
  search: MalakBootstrapMarketingSearch;
};

export type MalakBootstrapPwaOnboardingSlide = {
  id: string;
  enabled: boolean;
  image: string;
  title: string;
  description: string;
  sort_order: number;
};

export type MalakBootstrapPwa = {
  enabled: boolean;
  app_name: string;
  short_name: string;
  theme_color: string;
  background_color: string;
  language: string;

  icon: {
    source: string;
    apple_180: string;
    pwa_192: string;
    pwa_512: string;
    maskable_512: string;
  };

  splash: {
    enabled: boolean;
    image: string;
    background_color: string;
    duration: "short" | "normal";
  };

  onboarding: {
    enabled: boolean;
    version: number;
    slides: MalakBootstrapPwaOnboardingSlide[];
  };

  install_prompt: {
    enabled: boolean;
    android_enabled: boolean;
    ios_enabled: boolean;
    title: string;
    description: string;
  };
};

export type MalakBootstrapRatingSettings = {
  publishTestimonials: boolean;
  publishRatings: boolean;
  allowAttachImages: boolean;
  allowLikes: boolean;
  showRatingSummary: boolean;
  showRecommendation: boolean;
  allowContactSupport: boolean;
  allowUpdate: boolean;
  allowUpdatePeriod: number;

  testimonialsEnabled: boolean;
  shippingEnabled: boolean;
  productsEnabled: boolean;
  allowHiddenNames: boolean;
  displayTestimonials: boolean;
  displayCustomerReviews: boolean;
  displayProductReviewsOnApp: boolean;

  orderStatuses: string[];
  thanksMessage: string;

  ratingEnabled: boolean;
  ratingHoursPeriod: number;
  channels: string[];
  ratingMessageTitle: string;
  ratingMessage: string;
};
export type MalakBootstrapCatalogFilters = {
  enabled: boolean;

  show_in_search: boolean;
  showInSearch: boolean;

  show_in_category: boolean;
  showInCategory: boolean;

  show_categories: boolean;
  showCategories: boolean;

  show_brands: boolean;
  showBrands: boolean;

  show_price: boolean;
  showPrice: boolean;

  show_rating: boolean;
  showRating: boolean;

  show_product_options: boolean;
  showProductOptions: boolean;

  show_availability: boolean;
  showAvailability: boolean;

  show_discounted: boolean;
  showDiscounted: boolean;

  category_depth: number;
  categoryDepth: number;
};
export type MalakBootstrap = {
  version: number;

  store: {
    id: string;
    slug?: string | null;
    name: string;
    logo_url: string | null;
    favicon_url?: string | null;
    description?: string | null;
  };

  seoMode: SeoUrlMode;

  currencies?: MalakBootstrapCurrencies;

  tax?: MalakBootstrapTax;

  pwa?: MalakBootstrapPwa;

  customCode?: ThemeCustomCode;
  catalogFilters?: MalakBootstrapCatalogFilters;
  appearance?: Record<string, any>;

  header: {
    logo_url: string | null;
    logo_alt: string;
    favicon_url?: string | null;

    slogan: string | null;
    slogan_icon?: string;
    show_slogan: boolean;

    show_search: boolean;
    show_account: boolean;
    show_cart: boolean;
    show_categories: boolean;

    background_color: string;
    text_color: string;

    header_bg?: string;
    header_text_color?: string;

    sticky_header: boolean;
    header_is_sticky?: boolean;

    centered_logo: boolean;
    mobile_only_centered_logo: boolean;

    hide_topnav: boolean;
    hide_topnav_links: boolean;
    hide_topnav_contacts: boolean;
    topnav_dark: boolean;
    topnav_is_dark?: boolean;

    default_menu: boolean;
    activate_default_menu?: boolean;

    desktop_sidemenu: boolean;
    enable_desktop_sidemenu?: boolean;

    transparent_header: boolean;
    trans_header?: boolean;

    slider_overlay: boolean;
    slider_has_overlay?: boolean;

    logo_width: number;
    logo_height: number;
    header_logo_width?: number;
    header_logo_height?: number;

    reversed_logo: string | null;
    show_reversed_logo: boolean;
    show_reversed_logo_in_footer: boolean;
    show_original_logo_on_scroll: boolean;
  };

  announcement?: MalakBootstrapAnnouncement;

  navigation: {
    categories: MalakBootstrapCategory[];
    mega_menu?: MalakBootstrapMegaMenuValue;
  };

  marketing?: MalakBootstrapMarketing;

  ratingSettings?: MalakBootstrapRatingSettings;

  product?: {
    options: MalakBootstrapProductOptions;
  };

  footer: {
    enabled: boolean;

    help?: {
      title: string;
      subtitle: string;
      center_title?: string;
      center_url?: string;
      background_color?: string;
      text_color?: string;
    };

    help_title?: string;
    help_subtitle?: string;
    help_center_title?: string;
    help_center_url?: string;
    help_background_color?: string;
    help_text_color?: string;

    help_items: MalakBootstrapHelpItem[];

    columns: {
      title: string;
      items: MalakBootstrapFooterLink[];
    }[];

    store_pages?: MalakBootstrapFooterLink[];

    floating_actions?: MalakBootstrapFloatingActions;

    options?: MalakBootstrapFooterOptions;

    socials: MalakBootstrapSocial[];

    app?: MalakBootstrapFooterApp;

    business_certificate?: MalakBootstrapBusinessCertificate;

    payments: MalakBootstrapPayment[];

    copyright: string | null;
    copyright_text?: string | null;

    commercial_register: string | null;
    tax_number: string | null;

    show_payments?: boolean;
    show_apps?: boolean;
    show_social?: boolean;
  };
};