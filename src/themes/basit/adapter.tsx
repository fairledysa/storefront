// FILE: apps/storefront/src/themes/basit/adapter.tsx

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

  const direct =
    value.url ??
    value.src ??
    value.image_url ??
    value.file_url ??
    value.public_url ??
    value.path ??
    value.value;

  if (direct === value) return null;
  return imageUrl(direct);
}

function productImageFit(value: any): ProductImageFit {
  const v = s(value, "full").toLowerCase();

  if (v === "cover") return "cover";
  if (v === "contain") return "contain";
  if (v === "fill" || v === "full" || v === "full_image") return "fill";

  return "fill";
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

  // Basit uses one unified light appearance. Dark-mode settings were removed.
  const darkMode = false;
  const hideRatings = b(opts.hide_ratings, false);
  const stickyAddToCart = b(opts.sticky_add_to_cart, true);

  const productImageHeightUnits = clamp(
    num(opts.product_image_height, 17),
    5,
    30,
  );

  const productsPerRow = clamp(num(opts.products_per_row, 4), 2, 8);

  const showRating = b(opts.show_rating, true) && !hideRatings;
  const showRatingCount = b(opts.show_rating_count, false);
  const showDiscount = b(opts.show_discount, false);

  const roundedCards = b(opts.rounded_cards, true);
  const productHasBorder = b(opts.products_has_border, true);

  const storeBg = s(opts.store_bg, "#ffffff");
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

        storeBg,
        // The secondary background option was removed; every page uses storeBg.
        storeBgSecondary: storeBg,
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
      // Prefer the current editor keys; retain the old aliases for stores
      // that saved options before the Basit settings cleanup.
      logoWidthPx: clamp(
        num(opts.logo_width ?? opts.header_logo_width, 170),
        1,
        300,
      ),
      logoHeightPx: clamp(
        num(opts.logo_height ?? opts.header_logo_height, 59),
        1,
        120,
      ),

      desktopSideMenu: b(opts.enable_desktop_sidemenu, false),
      centeredLogo: b(opts.centered_logo, true),
      mobileOnlyCenteredLogo: b(opts.mobile_only_centered_logo, true),
      stickyHeader,

      headerStyle:
        s(opts.header_style, "floating").toLowerCase() === "full_width"
          ? "full_width"
          : "floating",
      headerCorners:
        s(opts.header_corners, "rounded").toLowerCase() === "square"
          ? "square"
          : "rounded",
      sidebarBg: s(opts.sidebar_bg, "#ffffff"),
      sidebarTextColor: s(opts.sidebar_text_color, "#111111"),

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
      showReversedLogo: b(opts.show_reversed_logo, false),
      showReversedLogoInFooter: b(opts.show_reversed_logo_in_footer, false),
      showOriginalLogoOnScroll: false,

      animateBlocks: b(opts.animate_blocks, false),
      secondReviews: b(opts.enable_second_reviews, true),
      enhancedProductsSlider: b(opts.enhanced_products_slider, true),
      hideProductsSliderControls: b(opts.hide_products_slider_controls, false),
      enhancedBlocksTitles: b(opts.enhanced_blocks_titles, true),
      mobileSmallBlocksTitles: b(opts.mobile_small_blocks_titles, true),

      disableRightClick:
        b(opts.content_copyright, false) ||
        b(opts.disable_right_click, false),
      showPlatformCopyright: b(opts.display_copyright, false),
      breadcrumbs: b(opts.is_breadcrumbs, true),
      showSubCategories: b(opts.show_sub_cats, true),
      subCategoriesBeforeContent: b(opts.banner_after_cats, true),
      moreButtonEnabled: b(opts.is_more_button_enabled, true),
    },

    productCard: {
      imageHeightPx: productImageHeightUnits * 16,
      imageFit: productImageFit(opts.equal_cart_height_type),
      equalHeight: b(opts.is_equal_cart_height, true),
      productsPerRow,

      switchImageOnHover: b(opts.enable_switch_image_on_hover, false),
      showOptions: b(opts.productcard_options, false),
      hoverStyle: productCardHoverStyle(opts.hover_style),

      fitSliderProducts: b(opts.fit_slider_products, true),
      disableLazyload: false,
      showNormalCountdown: b(opts.show_normal_countdown, false),

      shineOnHover: false,
      zoomOnHover: false,

      mobileMiniProducts: false,
      oneLineName: false,
      showSubtitleOnMini: false,
      miniTopPromotion: false,
      freeImagesHeight: false,

      enhancedMobileAddButton: b(opts.enhanced_add_btn_in_mobile, true),
      addButtonBg: s(opts.enhanced_add_btn_bg, "#d5c4a8"),
      addButtonColor: s(opts.enhanced_add_btn_color, "#000000"),

      hideQuickviewOnMobile: b(opts.hide_quickview_on_mobile, false),

      autoPlayProductsSlider: false,
      verticalFixedProducts: false,

      roundedCards,
      showDiscount,
      showRating,
      showRatingCount,

      disableOutProductsEffect: false,

      hasBorder: productHasBorder,
      borderColor: s(opts.product_border_color, "#d5c4a8"),

      primaryProductButtons: false,

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