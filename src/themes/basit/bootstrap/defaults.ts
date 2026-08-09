// FILE: apps/storefront/src/themes/basit/bootstrap/defaults.ts

import type { MalakBootstrap } from "./types";

export function createDefaultMalakBootstrap(input: {
  store: {
    id: string;
    slug?: string | null;
    name: string;
    logo_url?: string | null;
    favicon_url?: string | null;
    description?: string | null;
  };
  seoMode: MalakBootstrap["seoMode"];
}): MalakBootstrap {
  const logoUrl = input.store.logo_url ?? null;
  const faviconUrl = input.store.favicon_url ?? null;
  const storeName = input.store.name || "المتجر";

  return {
    version: 1,

    store: {
      id: input.store.id,
      slug: input.store.slug ?? null,
      name: storeName,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      description: input.store.description ?? null,
    },

    seoMode: input.seoMode,

    tax: {
      enabled: false,

      tax_label: "VAT",
      taxLabel: "VAT",
      label: "VAT",

      tax_number: null,
      taxNumber: null,

      tax_certificate_url: null,
      taxCertificateUrl: null,

      certificate_url: null,
      certificateUrl: null,

      prices_include_tax: false,
      pricesIncludeTax: false,

      shipping_include_tax: false,
      shippingIncludeTax: false,

      show_tax_number_in_footer: false,
      showTaxNumberInFooter: false,

      show_tax_certificate_icon: false,
      showTaxCertificateIcon: false,

      default_country_code: null,
      defaultCountryCode: null,

      default_rate: 0,
      defaultRate: 0,

      effective_rate: 0,
      effectiveRate: 0,

      rate: 0,

      rates: [],

      metadata: {},
    },

    appearance: {},

    header: {
      logo_url: logoUrl,
      logo_alt: storeName,
      favicon_url: faviconUrl,

      slogan: "موقع التسوق الأول لمنتجاتك المميزة",
      slogan_icon: "",
      show_slogan: true,

      show_search: true,
      show_account: true,
      show_cart: true,
      show_categories: true,

      background_color: "#ffffff",
      text_color: "#111827",

      header_bg: "#ffffff",
      header_text_color: "#111827",

      sticky_header: true,
      header_is_sticky: true,

      centered_logo: false,
      mobile_only_centered_logo: false,

      hide_topnav: false,
      hide_topnav_links: false,
      hide_topnav_contacts: false,
      topnav_dark: false,
      topnav_is_dark: false,

      default_menu: true,
      activate_default_menu: true,

      desktop_sidemenu: false,
      enable_desktop_sidemenu: false,

      transparent_header: false,
      trans_header: false,

      slider_overlay: false,
      slider_has_overlay: false,

      logo_width: 170,
      logo_height: 59,
      header_logo_width: 170,
      header_logo_height: 59,

      reversed_logo: null,
      show_reversed_logo: false,
      show_reversed_logo_in_footer: false,
      show_original_logo_on_scroll: true,
    },

    announcement: {
      enabled: false,
      icon: null,
      title: "",
      content: "",
      text: "",
      href: "",
      link_type: "no_link",
      link_value: "",
      link_label: "",
      ends_at: null,
      pages: "all",
      text_color: "#111827",
      background_color: "#bdf5ea",
    },

    navigation: {
      categories: [],
      mega_menu: {
        categories: {},
      },
    },

    marketing: {
      search: {
        enabled: false,
        title: "",
        placeholder: "ابحث عن منتجك",
        groups: [],
      },
    },
    ratingSettings: {
      publishTestimonials: true,
      publishRatings: true,
      allowAttachImages: false,
      allowLikes: false,
      showRatingSummary: true,
      showRecommendation: true,
      allowContactSupport: false,
      allowUpdate: false,
      allowUpdatePeriod: 7,

      testimonialsEnabled: true,
      shippingEnabled: true,
      productsEnabled: true,
      allowHiddenNames: false,
      displayTestimonials: true,
      displayCustomerReviews: true,
      displayProductReviewsOnApp: false,

      orderStatuses: ["completed", "delivered"],
      thanksMessage: "شكراً لوقتك\nونتمنى لك تسوق ممتع",

      ratingEnabled: true,
      ratingHoursPeriod: 168,
      channels: ["email"],
      ratingMessageTitle: "نتمنى أن نعرف رأيك في الطلب",
      ratingMessage: "ياليت نعرف رأيك في الطلب من خلال الرابط: {url}",
    },

    
    product: {
      options: {
        show_singleSelection: true,
        show_multipleOption: true,

        enable_add_product_toast: true,

        activate_zoom: false,

        enhanced_brand_senction: false,

        desktop_product_thumbnails_position: "bottom",
        thumbs_bottom: true,
        disable_thumbs_in_mobile: false,

        show_payments_in_product_single: true,
        show_category_in_product_single: false,

        hide_ratings: false,

        replace_slider_text: true,

        hide_countdown: false,
        show_discounted_amount: true,

        update_both_prices: true,
        hide_top_price: false,

        top_details_tabs: true,
        mini_offers_box: true,

        show_product_features: true,
        show_sidebar: false,

        show_sticky_product: true,
        sticky_add_to_cart: true,

        show_tags: true,

        slider_background_size: "cover",
      },
    },

    footer: {
      enabled: true,

      help: {
        title: "هل تحتاج مساعدة ؟",
        subtitle: "يمكنك الحصول على المساعدة من خلال وسائل المساعدة المختلفة",
        center_title: "",
        center_url: "",
        background_color: "",
        text_color: "",
      },

      help_title: "هل تحتاج مساعدة ؟",
      help_subtitle: "يمكنك الحصول على المساعدة من خلال وسائل المساعدة المختلفة",
      help_center_title: "",
      help_center_url: "",
      help_background_color: "",
      help_text_color: "",

      help_items: [],

      columns: [],
      store_pages: [],

      floating_actions: {
        scroll_top_enabled: true,
        scroll_top_position: "left",
        scroll_top_color: "#111111",

        wa_enabled: false,
        wa_number: "",
        wa_btn_bg: "#25D366",
        wa_btn_text_color: "#ffffff",
        wa_btn_text: "واتساب",
        interactive_wa: false,
        wa_position: "right",

        phone_btn_enabled: false,
        phone_number: "",
        phone_position: "right",
      },

      options: {
        footer_logo_width: 0,
        footer_logo_height: 64,

        enable_bottom_nav: false,
        mobile_bottom_nav_style: "solid",
        mobile_bottom_nav_bg: "#ffffff",
        mobile_bottom_nav_text_color: "#111111",

        footer_is_dark: false,
        footer_bg: "#3b3b3b",
        footer_text_color: "#ffffff",
        bottom_footer_bg: "#1c1c1c",

        show_basic_footer: false,

        enhanced_links: true,
        links_with_bullits: false,

        enhanced_social_icons: true,
        rounded_contacts: true,

        mini_sbc: false,

        footer_show_newsletter: false,
        show_footer_logos: false,
        footer_logos: [],
      },

      socials: [],

      app: {
        ios: "",
        android: "",
      },

      business_certificate: {
        enabled: false,
        title: "شهادة منصة الأعمال",
        image_url: "",
        link: "",
      },

      payments: [],

      copyright: "جميع الحقوق محفوظة",
      copyright_text: "جميع الحقوق محفوظة",

      commercial_register: null,
      tax_number: null,

      show_payments: true,
      show_apps: true,
      show_social: true,
    },
  };
}