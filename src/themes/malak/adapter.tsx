// FILE: apps/storefront/src/themes/malak/adapter.tsx

import {
  ThemeAdapterInput,
  ThemeAdapterOutput,
  type ProductCardHoverStyle,
  type ProductImageFit,
} from "./types";

function s(v: any, fallback = "") {
  const x = String(v ?? "").trim();
  return x || fallback;
}

function b(v: any, fallback = false) {
  if (v === null || v === undefined) return fallback;

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;

  if (typeof v === "string") {
    const x = v.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(x)) return true;
    if (["false", "0", "no", "off"].includes(x)) return false;
  }

  return Boolean(v);
}

function num(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function imageUrl(value: any): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const x = value.trim();
    return x || null;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return imageUrl(first);
  }

  const direct = s(
    value.url ||
      value.src ||
      value.image_url ||
      value.file_url ||
      value.public_url ||
      value.path ||
      value.value,
  );

  return direct || null;
}

function productImageFit(value: any): ProductImageFit {
  const v = s(value, "full");

  if (v === "cover") return "cover";
  if (v === "contain") return "contain";
  if (v === "fill") return "fill";

  return "contain";
}

function productCardHoverStyle(value: any): ProductCardHoverStyle {
  const v = s(value, "on_image_hover");

  if (v === "always") return "always";
  if (v === "hidden") return "hidden";

  return "on_image_hover";
}

export function adaptTheme(input: ThemeAdapterInput): ThemeAdapterOutput {
  const { store, theme, device } = input;
  const opts = theme.options || {};

  const darkMode = b(opts.dark_mode, false);
  const hideRatings = b(opts.hide_ratings, false);
  const stickyAddToCart = b(opts.sticky_add_to_cart, true);

  const productImageHeightUnits = clamp(
    num(opts.product_image_height, 30),
    5,
    30,
  );

  const productsPerRow = clamp(num(opts.products_per_row, 4), 2, 8);

  const showRating = b(opts.show_rating, true) && !hideRatings;
  const showRatingCount = b(opts.show_rating_count, false);
  const showDiscount = b(opts.show_discount, false);

  const roundedCards = b(opts.rounded_cards, true);
  const productHasBorder = b(opts.products_has_border, true);

  const productBg = s(opts.product_bg, "#ffffff");
  const productPromoBg = s(opts.product_promo_bg, "#000000");

  const stickyHeader = b(opts.header_is_sticky, true);

  return {
    store: {
      id: store.id,
      name: store.name,
      logoUrl: store.logo_url || null,
    },

    device,

    ui: {
      colors: {
        primary: s(opts.primary_color, "#000000"),

        storeBg: s(opts.store_bg, "#ffffff"),
        storeBgSecondary: s(opts.store_bg_secondary, "#ffffff"),
        text: s(opts.store_text_color, "#000000"),
        textSecondary: s(opts.store_text_color_secondary, "#292929"),

        headerBg: s(opts.header_bg, "#ffffff"),
        headerText: s(opts.header_text_color, "#000000"),

        footerBg: s(opts.footer_bg, "#3b3b3b"),
        footerText: s(opts.footer_text_color, "#ffffff"),
        bottomFooterBg: s(opts.bottom_footer_bg, "#1c1c1c"),

        productBg,
        productPromoBg,

        storeBgDark: s(opts.store_bg_dark, "#00333a"),
        storeBgSecondaryDark: s(opts.store_bg_secondary_dark, "#005840"),
        textDark: s(opts.store_text_color_dark, "#48342e"),
        textSecondaryDark: s(opts.store_text_color_secondary_dark, "#4d3932"),

        headerBgDark: s(opts.header_bg_dark, "#4d3932"),
        headerTextDark: s(opts.header_text_color_dark, "#005840"),

        footerBgDark: s(opts.footer_bg_dark, "#4d3932"),
        footerTextDark: s(opts.footer_text_color_dark, "#6bbcc6"),
        bottomFooterBgDark: s(opts.bottom_footer_bg_dark, "#000000"),

        productBgDark: s(opts.product_bg_dark, "#0e0f0f"),
      },

      font: s(opts.font, "system-ui"),
      darkMode,
    },

    header: {
      logoWidthPx: clamp(num(opts.header_logo_width, 0), 0, 300),
      logoHeightPx: clamp(num(opts.header_logo_height, 48), 1, 120),

      desktopSideMenu: b(opts.enable_desktop_sidemenu, false),
      centeredLogo: b(opts.centered_logo, true),
      mobileOnlyCenteredLogo: b(opts.mobile_only_centered_logo, true),
      stickyHeader,

      hideTopnav: b(opts.hide_topnav, false),
      hideTopnavLinks: b(opts.hide_topnav_links, false),
      hideTopnavContacts: b(opts.hide_topnav_contacts, false),
      topnavDark: b(opts.topnav_is_dark, false),

      defaultMenu: b(opts.activate_default_menu, false),
    },

    storefront: {
      transparentHeader: b(opts.trans_header, false),
      sliderOverlay: b(opts.slider_has_overlay, true),

      reversedLogoUrl: imageUrl(opts.reversed_logo),
      showReversedLogo: b(opts.show_reversed_logo, true),
      showReversedLogoInFooter: b(opts.show_reversed_logo_in_footer, true),
      showOriginalLogoOnScroll: b(opts.show_original_logo_on_scroll, true),

      animateBlocks: b(opts.animate_blocks, false),
      secondReviews: b(opts.enable_second_reviews, true),
      enhancedProductsSlider: b(opts.enhanced_products_slider, true),
      hideProductsSliderControls: b(opts.hide_products_slider_controls, false),
      enhancedBlocksTitles: b(opts.enhanced_blocks_titles, true),
      mobileSmallBlocksTitles: b(opts.mobile_small_blocks_titles, true),

      disableRightClick: b(opts.disable_right_click, false),
      moreButtonEnabled: b(opts.is_more_button_enabled, true),
    },

    productCard: {
      imageHeightPx: productImageHeightUnits * 16,
      imageFit: productImageFit(opts.equal_cart_height_type),
      productsPerRow,

      switchImageOnHover: b(opts.enable_switch_image_on_hover, false),
      showOptions: b(opts.productcard_options, false),
      hoverStyle: productCardHoverStyle(opts.hover_style),

      fitSliderProducts: b(opts.fit_slider_products, true),
      disableLazyload: b(opts.disable_products_lazyload, false),
      showNormalCountdown: b(opts.show_normal_countdown, false),

      shineOnHover: b(opts.enable_shine_animation, false),
      zoomOnHover: b(opts.enable_zoom_animation, true),

      mobileMiniProducts: b(opts.mobile_mini_products, true),
      oneLineName: b(opts.one_line_name, true),
      showSubtitleOnMini: b(opts.show_subtitle_on_mini, false),
      miniTopPromotion: b(opts.mini_top_promotion, false),
      freeImagesHeight: b(opts.free_images_height, false),

      enhancedMobileAddButton: b(opts.enhanced_add_btn_in_mobile, true),
      addButtonBg: s(opts.enhanced_add_btn_bg, "#d5c4a8"),
      addButtonColor: s(opts.enhanced_add_btn_color, "#000000"),

      hideQuickviewOnMobile: b(opts.hide_quickview_on_mobile, false),

      autoPlayProductsSlider: b(opts.auto_play_products_slider, true),
      verticalFixedProducts: b(opts.vertical_fixed_products, true),

      roundedCards,
      showDiscount,
      showRating,
      showRatingCount,

      disableOutProductsEffect: b(opts.disable_out_products, false),

      hasBorder: productHasBorder,
      borderColor: s(opts.product_border_color, "#d5c4a8"),

      primaryProductButtons: b(opts.primary_product_buttons, true),

      productPromoBg,
      background: productBg,
    },

    features: {
      bottomNav: b(opts.enable_bottom_nav, false),
      stickyHeader,
      whatsapp: b(opts.wa_enabled, true),

      ratings: showRating,

      stickyAddToCart,

      showStickyProduct: b(opts.show_sticky_product, true),
      showDiscount,
      showRatingCount,
      roundedCards,
      darkModeSwitcher: b(opts.dark_mode_switcher, false),
    },
  };
}