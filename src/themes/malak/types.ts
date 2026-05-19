// FILE: apps/storefront/src/themes/malak/types.ts

export type DeviceType = "mobile" | "desktop";

export type ProductImageFit = "cover" | "contain" | "fill";

export type ProductCardHoverStyle = "on_image_hover" | "always" | "hidden";

export type ThemeProductCardOptions = {
  imageHeightPx: number;
  imageFit: ProductImageFit;
  productsPerRow: number;

  switchImageOnHover: boolean;
  showOptions: boolean;
  hoverStyle: ProductCardHoverStyle;

  fitSliderProducts: boolean;
  disableLazyload: boolean;
  showNormalCountdown: boolean;

  shineOnHover: boolean;
  zoomOnHover: boolean;

  mobileMiniProducts: boolean;
  oneLineName: boolean;
  showSubtitleOnMini: boolean;
  miniTopPromotion: boolean;
  freeImagesHeight: boolean;

  enhancedMobileAddButton: boolean;
  addButtonBg: string;
  addButtonColor: string;

  hideQuickviewOnMobile: boolean;

  autoPlayProductsSlider: boolean;
  verticalFixedProducts: boolean;

  roundedCards: boolean;
  showDiscount: boolean;
  showRating: boolean;
  showRatingCount: boolean;

  disableOutProductsEffect: boolean;

  hasBorder: boolean;
  borderColor: string;

  primaryProductButtons: boolean;

  productPromoBg: string;
  background: string;
};

export type ThemeHeaderOptions = {
  logoWidthPx: number;
  logoHeightPx: number;

  desktopSideMenu: boolean;
  centeredLogo: boolean;
  mobileOnlyCenteredLogo: boolean;
  stickyHeader: boolean;

  hideTopnav: boolean;
  hideTopnavLinks: boolean;
  hideTopnavContacts: boolean;
  topnavDark: boolean;

  defaultMenu: boolean;
};

export type ThemeStorefrontOptions = {
  transparentHeader: boolean;
  sliderOverlay: boolean;

  reversedLogoUrl: string | null;
  showReversedLogo: boolean;
  showReversedLogoInFooter: boolean;
  showOriginalLogoOnScroll: boolean;

  animateBlocks: boolean;
  secondReviews: boolean;
  enhancedProductsSlider: boolean;
  hideProductsSliderControls: boolean;
  enhancedBlocksTitles: boolean;
  mobileSmallBlocksTitles: boolean;

  disableRightClick: boolean;
  moreButtonEnabled: boolean;
};

export type ThemeAdapterInput = {
  store: {
    id: string;
    name: string;
    logo_url?: string | null;
  };

  theme: {
    key: string;
    version_id: string;
    options: Record<string, any>;
  };

  device: DeviceType;
};

export type ThemeAdapterOutput = {
  store: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };

  device: DeviceType;

  ui: {
    colors: {
      primary: string;

      storeBg: string;
      storeBgSecondary: string;
      text: string;
      textSecondary: string;

      headerBg: string;
      headerText: string;

      footerBg: string;
      footerText: string;
      bottomFooterBg: string;

      productBg: string;
      productPromoBg: string;

      storeBgDark: string;
      storeBgSecondaryDark: string;
      textDark: string;
      textSecondaryDark: string;

      headerBgDark: string;
      headerTextDark: string;

      footerBgDark: string;
      footerTextDark: string;
      bottomFooterBgDark: string;

      productBgDark: string;
    };

    font: string;
    darkMode: boolean;
  };

  header: ThemeHeaderOptions;

  storefront: ThemeStorefrontOptions;

  productCard: ThemeProductCardOptions;

  features: {
    bottomNav: boolean;
    stickyHeader: boolean;
    whatsapp: boolean;
    ratings: boolean;

    stickyAddToCart: boolean;
    showStickyProduct: boolean;
    showDiscount: boolean;
    showRatingCount: boolean;
    roundedCards: boolean;
    darkModeSwitcher: boolean;
  };
};