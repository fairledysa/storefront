// FILE: apps/storefront/src/themes/malak/screens/home/_dynamic/section-utils.ts

import type {
  FeaturedMosaicOfferContent,
  FeaturedMosaicSideImage,
  FeaturesProductShowcaseContent,
  FaqContent,
  FaqItem,
  HomeDynamicSection,
  ProductTabSource,
  ProductsTabItem,
  ShowcaseFeatureItem,
  ShowcaseFeatureSide,
  StatsGridContent,
  StatsGridItem,
  StatsHeroSplitContent,
  StatsHeroSplitStatItem,
  TestimonialItem,
  TestimonialNameMode,
  TestimonialsContent,
} from "./types";

import {
  boolValue,
  getFieldValue,
  getIconNameFromValue,
  getImageFromValue,
  getPickerItems,
  getPickerItemId,
  getTextValue,
  getValueText,
  lower,
  n,
  normalizeIds,
  s,
  sortRowsByAdminOrder,
} from "./utils";

import {
  buildProductHref,
  getAllProductsRaw,
  getBestSellingProductsRaw,
  getFirstProductImage,
  getLinkedProductFromValue,
  getProductCategoryIds,
  getProductId,
  getProductMap,
  mergePickerProductWithFullProduct,
  normalizePickerProductFallback,
  normalizeProductsForSlider,
  resolveProductPrices,
  sortProductsByNewest,
} from "./product-utils";

import { isSmartSearchSection as isSmartSearchThemeSection } from "@/themes/malak/smart-search/config";

import {
  getButtonTextFromValues,
  getCountdownButton,
  getLinkValueFromValues,
  mapSectionItems,
  resolveLinkHref,
} from "./link-utils";

export function getSections(data: any) {
  const sections =
    data?.themeOptions?.homepage?.sections ||
    data?.theme_options?.homepage?.sections ||
    [];

  return Array.isArray(sections)
    ? sections.filter((x: any) => x && x.enabled !== false)
    : [];
}

export function getSectionId(section: any, index: number) {
  return (
    s(section?.instance_id) ||
    s(section?.instanceId) ||
    s(section?.id) ||
    s(section?.page_component_id) ||
    s(section?.pageComponentId) ||
    `homepage-section-${index}`
  );
}

export function getSectionKey(section: any) {
  return (
    lower(section?.key) ||
    lower(section?.component_key) ||
    lower(section?.componentKey) ||
    lower(section?.theme_component_key) ||
    lower(section?.themeComponentKey) ||
    lower(section?.component?.key) ||
    lower(section?.theme_component?.key) ||
    lower(section?.definition?.key) ||
    lower(section?.component_definition?.key)
  );
}

export function getSectionSlug(section: any) {
  return (
    lower(section?.slug) ||
    lower(section?.component_slug) ||
    lower(section?.componentSlug) ||
    lower(section?.theme_component_slug) ||
    lower(section?.themeComponentSlug) ||
    lower(section?.component?.slug) ||
    lower(section?.theme_component?.slug) ||
    lower(section?.definition?.slug) ||
    lower(section?.component_definition?.slug)
  );
}

export function getSectionRenderKey(section: any) {
  return (
    lower(section?.render_key) ||
    lower(section?.renderKey) ||
    lower(section?.category) ||
    lower(section?.component_category) ||
    lower(section?.componentCategory) ||
    lower(section?.theme_component_category) ||
    lower(section?.themeComponentCategory) ||
    lower(section?.display_type) ||
    lower(section?.displayType) ||
    lower(section?.type) ||
    lower(section?.kind) ||
    lower(section?.component?.category) ||
    lower(section?.theme_component?.category) ||
    lower(section?.definition?.category) ||
    lower(section?.component_definition?.category)
  );
}

export function sectionHasToken(section: HomeDynamicSection, token: string) {
  const t = lower(token);

  return (
    lower(section.id) === t ||
    lower(section.key) === t ||
    lower(section.slug) === t ||
    lower(section.renderKey) === t ||
    lower(section.raw?.key) === t ||
    lower(section.raw?.slug) === t ||
    lower(section.raw?.category) === t ||
    lower(section.raw?.component?.key) === t ||
    lower(section.raw?.component?.slug) === t ||
    lower(section.raw?.component?.category) === t ||
    lower(section.raw?.theme_component?.key) === t ||
    lower(section.raw?.theme_component?.slug) === t ||
    lower(section.raw?.theme_component?.category) === t ||
    lower(section.raw?.definition?.key) === t ||
    lower(section.raw?.definition?.slug) === t ||
    lower(section.raw?.definition?.category) === t ||
    lower(section.raw?.component_definition?.key) === t ||
    lower(section.raw?.component_definition?.slug) === t ||
    lower(section.raw?.component_definition?.category) === t
  );
}

export function isSmartSearchSection(section: HomeDynamicSection) {
  return isSmartSearchThemeSection(section.raw);
}

export function isBannersSliderSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "banners_slider") ||
    sectionHasToken(section, "slider")
  );
}
export function isResponsiveHeroSliderSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "responsive_hero_slider");
}

export function isWideBannerSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "wide_banner");
}

export function isDoubleBannerSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "double_banner");
}

export function isTripleBannerSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "triple_banner");
}

export function isCountdownOfferSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "countdown_offer");
}

export function isProductsTabsSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "products_tabs");
}

export function isAdvancedProductsCollectionSection(
  section: HomeDynamicSection,
) {
  return sectionHasToken(section, "advanced_products_collection");
}

export function isSquareLinksSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "square_links");
}

export function isCircleLinksSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "circle_links");
}

export function isFeaturesProductShowcaseSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "features_product_showcase") ||
    sectionHasToken(section, "features_showcase") ||
    sectionHasToken(section, "product_features_showcase")
  );
}

export function isFeaturedMosaicOfferSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "featured_mosaic_offer") ||
    sectionHasToken(section, "mosaic_offer") ||
    sectionHasToken(section, "product_mosaic_offer") ||
    sectionHasToken(section, "featured_product_mosaic")
  );
}

export function isStatsHeroSplitSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "stats_hero_split") ||
    sectionHasToken(section, "stats_split") ||
    sectionHasToken(section, "stats_cards_hero") ||
    sectionHasToken(section, "hero_stats")
  );
}

export function isStatsSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "stats") ||
    sectionHasToken(section, "performance_metrics")
  );
}

export function isFaqSection(section: HomeDynamicSection) {
  return sectionHasToken(section, "faq");
}

export function isHtmlContentSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "html_content") ||
    sectionHasToken(section, "html5") ||
    sectionHasToken(section, "custom_html") ||
    sectionHasToken(section, "content_html") ||
    sectionHasToken(section, "html")
  );
}

export function isTestimonialsSection(section: HomeDynamicSection) {
  return (
    sectionHasToken(section, "testimonials") ||
    sectionHasToken(section, "reviews") ||
    sectionHasToken(section, "store_reviews")
  );
}

export function buildDynamicSections(
  data: any,
  seoMode: any,
): HomeDynamicSection[] {
  const sections = getSections(data);

  return sections
    .map((section: any, index: number) => {
      const items = mapSectionItems(section, data, seoMode);

      return {
        id: getSectionId(section, index),
        key: getSectionKey(section),
        slug: getSectionSlug(section),
        renderKey: getSectionRenderKey(section),
        title:
          s(section?.title) ||
          s(section?.name) ||
          s(section?.component?.name) ||
          s(section?.theme_component?.name) ||
          s(section?.definition?.name) ||
          s(section?.component_definition?.name),
        items,
        raw: section,
      };
    })
    .filter((section: HomeDynamicSection) => {
      if (isResponsiveHeroSliderSection(section)) return true;
      if (isSmartSearchSection(section)) return true;

      if (isCountdownOfferSection(section)) return true;
      if (isProductsTabsSection(section)) return true;
      if (isAdvancedProductsCollectionSection(section)) return true;
      if (isSquareLinksSection(section)) return true;
      if (isCircleLinksSection(section)) return true;
      if (isFeaturesProductShowcaseSection(section)) return true;
      if (isFeaturedMosaicOfferSection(section)) return true;
      if (isStatsHeroSplitSection(section)) return true;
      if (isStatsSection(section)) return true;
      if (isFaqSection(section)) return true;
      if (isTestimonialsSection(section)) return true;
      if (isHtmlContentSection(section)) return true;

      return section.items.length > 0;
    });
}

export function getSectionValues(section: HomeDynamicSection) {
  const values = section.raw?.values;
  return values && typeof values === "object" ? values : {};
}

export function normalizeProductsTabSource(value: any): ProductTabSource {
  const source = s(value);

  if (
    source === "manual" ||
    source === "category" ||
    source === "latest" ||
    source === "best_selling"
  ) {
    return source;
  }

  return "manual";
}

export function getProductsTabsRows(section: HomeDynamicSection) {
  const values = getSectionValues(section);

  const rows =
    values?.field_1 ||
    values?.tabs ||
    values?.items ||
    values?.products_tabs ||
    [];

  return Array.isArray(rows) ? sortRowsByAdminOrder(rows) : [];
}

export function getProductsForTab(row: any, data: any, seoMode: any) {
  const allProducts = getAllProductsRaw(data);
  const bestSellingProducts = getBestSellingProductsRaw(data);
  const productMap = getProductMap(data);

  const normalizedSource = normalizeProductsTabSource(
    row?.field_2 || row?.source || row?.products_source,
  );

  const limit = Math.max(1, n(row?.field_5 || row?.limit || row?.count, 12));

  let pickedRaw: any[] = [];

  if (normalizedSource === "manual") {
    const rawSelected =
      row?.field_3 ||
      row?.product_ids ||
      row?.products ||
      row?.selected_products;

    const selectedItems = getPickerItems(rawSelected);

    pickedRaw = selectedItems
      .map((item: any) => {
        const id = getPickerItemId(item);
        if (!id) return null;

        const pickerFallback = normalizePickerProductFallback(item);

        const full =
          productMap?.[id] ||
          allProducts.find((product) => getProductId(product) === id);

        return mergePickerProductWithFullProduct(full, pickerFallback);
      })
      .filter(Boolean);
  }

  if (normalizedSource === "category") {
    const categoryId = normalizeIds(
      row?.field_4 ||
        row?.category_id ||
        row?.category ||
        row?.selected_category,
    )[0];

    pickedRaw = categoryId
      ? allProducts.filter((product) =>
          getProductCategoryIds(product).includes(categoryId),
        )
      : [];
  }

  if (normalizedSource === "latest") {
    pickedRaw = sortProductsByNewest(allProducts);
  }

  if (normalizedSource === "best_selling") {
    pickedRaw = bestSellingProducts;
  }

  return normalizeProductsForSlider(pickedRaw, seoMode).slice(0, limit);
}

export function getProductsTabs(
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
): ProductsTabItem[] {
  const rows = getProductsTabsRows(section);

  return rows
    .map((row: any, index: number) => {
      const normalizedSource = normalizeProductsTabSource(
        row?.field_2 || row?.source || row?.products_source,
      );

      const productIds = normalizeIds(
        row?.field_3 ||
          row?.product_ids ||
          row?.products ||
          row?.selected_products,
      );

      const categoryId =
        normalizeIds(
          row?.field_4 ||
            row?.category_id ||
            row?.category ||
            row?.selected_category,
        )[0] || "";

      const limit = Math.max(1, n(row?.field_5 || row?.limit || row?.count, 12));
      const products = getProductsForTab(row, data, seoMode);

 return {
  id: s(row?.id) || `${section.id}-tab-${index}`,
  title:
    s(row?.field_1) ||
    s(row?.title) ||
    s(row?.name) ||
    `تاب ${index + 1}`,
  description:
    getValueText(row?.field_6) ||
    getValueText(row?.description) ||
    getValueText(row?.subtitle) ||
    getValueText(row?.text) ||
    "",
  source: normalizedSource,
  productIds,
  categoryId,
  limit,
  products,
};
    })
    .filter((tab: ProductsTabItem) => tab.title);
}

export function getAdvancedCollectionProducts(
  values: any,
  data: any,
  seoMode: any,
) {
  const row = {
    field_2: values?.field_8 || "manual",
    field_3: values?.field_9 || [],
    field_4: values?.field_10 || "",
    field_5: values?.field_11 || 10,
  };

  return getProductsForTab(row, data, seoMode);
}

export function getAdvancedCollectionTabs(
  values: any,
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
): ProductsTabItem[] {
  const rows = Array.isArray(values?.field_12)
    ? sortRowsByAdminOrder(values.field_12)
    : [];

  return rows
    .map((row: any, index: number) => {
      const source = normalizeProductsTabSource(
        row?.field_2 || row?.source || row?.products_source,
      );

      const productIds = normalizeIds(
        row?.field_3 ||
          row?.product_ids ||
          row?.products ||
          row?.selected_products,
      );

      const categoryId =
        normalizeIds(
          row?.field_4 ||
            row?.category_id ||
            row?.category ||
            row?.selected_category,
        )[0] || "";

      const limit = Math.max(1, n(row?.field_5 || row?.limit || row?.count, 12));
      const products = getProductsForTab(row, data, seoMode);

      return {
        id: s(row?.id) || `${section.id}-advanced-tab-${index}`,
        title:
          s(row?.field_1) ||
          s(row?.title) ||
          s(row?.name) ||
          `تاب ${index + 1}`,
        source,
        productIds,
        categoryId,
        limit,
        products,
      };
    })
    .filter((tab: ProductsTabItem) => tab.title);
}

export function getFeatureRowsFromValues(values: any) {
  const preferred = [
    values?.field_10,
    values?.field_9,
    values?.field_8,
    values?.features,
    values?.items,
    values?.feature_items,
    values?.features_list,
  ];

  for (const value of preferred) {
    if (Array.isArray(value)) return sortRowsByAdminOrder(value);
  }

  for (const value of Object.values(values || {})) {
    if (!Array.isArray(value)) continue;

    const first = value.find(Boolean);
    if (!first || typeof first !== "object") continue;

    const hasFeatureShape =
      first.field_1 !== undefined &&
      first.field_2 !== undefined &&
      (first.field_3 !== undefined ||
        first.icon !== undefined ||
        first.iconName !== undefined);

    if (hasFeatureShape) return sortRowsByAdminOrder(value);
  }

  return [];
}

export function normalizeShowcaseFeature(
  row: any,
  index: number,
): ShowcaseFeatureItem {
  const sideRaw = lower(getValueText(row?.field_5 || row?.side || row?.position));
  const side: ShowcaseFeatureSide = sideRaw === "left" ? "left" : "right";

  return {
    title:
      getValueText(row?.field_1) ||
      getValueText(row?.title) ||
      getValueText(row?.name) ||
      `ميزة ${index + 1}`,
    description:
      getValueText(row?.field_2) ||
      getValueText(row?.description) ||
      getValueText(row?.subtitle) ||
      getValueText(row?.text),
    icon:
      getIconNameFromValue(row?.field_3) ||
      getIconNameFromValue(row?.icon) ||
      getIconNameFromValue(row?.iconName) ||
      "Sparkles",
    iconBg:
      getValueText(row?.field_4) ||
      getValueText(row?.icon_bg) ||
      getValueText(row?.iconBg) ||
      getValueText(row?.color) ||
      "#DBEAFE",
    side,
  };
}

export function formatShowcasePrice(value: any, product: any) {
  const direct = getValueText(value);
  if (direct) return direct;

  if (!product) return "";

  const prices = resolveProductPrices(product);
  const price = Number(prices.price || 0);

  return price > 0 ? String(price) : "";
}

export function getCurrencyFromData(data: any) {
  return (
    s(data?.currency) ||
    s(data?.store?.currency) ||
    s(data?.settings?.currency) ||
    "ريال"
  );
}

export function getFeaturesProductShowcaseContent(
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
): FeaturesProductShowcaseContent {
  const values = getSectionValues(section);

  const selectedProduct =
    getLinkedProductFromValue(
      values?.field_3 ||
        values?.product ||
        values?.selected_product ||
        values?.product_id,
      data,
    ) ||
    getLinkedProductFromValue(
      values?.field_4 ||
        values?.product ||
        values?.selected_product ||
        values?.product_id,
      data,
    );

  const productTitle =
    getTextValue(values, [
      "field_5",
      "product_title",
      "productTitle",
      "product_name",
      "productName",
      "name",
    ]) ||
    s(selectedProduct?.title || selectedProduct?.name || selectedProduct?.label) ||
    "اسم المنتج هنا";

  const productImage =
    getImageFromValue(
      values?.field_4 ||
        values?.product_image ||
        values?.productImage ||
        values?.image,
    ) || getFirstProductImage(selectedProduct);

  const explicitLink = getLinkValueFromValues(values);
  const resolvedExplicitLink = explicitLink
    ? resolveLinkHref(explicitLink, data, seoMode)
    : "";

  const productHref =
    resolvedExplicitLink && resolvedExplicitLink !== "#"
      ? resolvedExplicitLink
      : selectedProduct && getProductId(selectedProduct)
        ? buildProductHref(selectedProduct, seoMode)
        : "#";

  const features = getFeatureRowsFromValues(values).map(
    (row: any, index: number) => normalizeShowcaseFeature(row, index),
  );

  return {
    eyebrow:
      getTextValue(values, ["field_1", "eyebrow", "badge", "label"]) ||
      "FEATURES",
    title:
      getTextValue(values, ["field_2", "title", "heading", "main_title"]) ||
      section.title ||
      "Upgrade to unlock features",
    productTitle,
    productImage,
    productHref,
    price: formatShowcasePrice(
      values?.field_6 || values?.price || values?.product_price,
      selectedProduct,
    ),
    currency:
      getTextValue(values, ["currency", "price_currency", "currency_text"]) ||
      getCurrencyFromData(data),
    buttonText: getButtonTextFromValues(values) || "عرض المنتج",
    features,
  };
}

export function getStatsHeroSplitRows(values: any) {
  if (Array.isArray(values?.field_6)) return sortRowsByAdminOrder(values.field_6);
  if (Array.isArray(values?.stats)) return sortRowsByAdminOrder(values.stats);
  if (Array.isArray(values?.items)) return sortRowsByAdminOrder(values.items);

  return [];
}

export function normalizeStatsHeroSplitStat(
  row: any,
): StatsHeroSplitStatItem | null {
  if (!row || typeof row !== "object") return null;

  const value = getValueText(row?.field_1 || row?.value || row?.number);
  const label = getValueText(row?.field_2 || row?.label || row?.title);
  const icon = getIconNameFromValue(row?.field_3 || row?.icon);
  const iconBg = getValueText(row?.field_4 || row?.icon_bg || row?.iconBg);
  const iconBorder = getValueText(
    row?.field_5 || row?.icon_border || row?.iconBorder,
  );

  if (!value && !label && !icon) return null;

  return {
    value,
    label,
    icon,
    iconBg,
    iconBorder,
  };
}

export function getStatsHeroSplitContent(
  section: HomeDynamicSection,
): StatsHeroSplitContent {
  const values = getSectionValues(section);

  const contentSideRaw = lower(
    getValueText(values?.field_5 || values?.content_side || values?.contentSide),
  );

  const stats = getStatsHeroSplitRows(values)
    .map((row: any) => normalizeStatsHeroSplitStat(row))
    .filter(Boolean) as StatsHeroSplitStatItem[];

  return {
    eyebrow: getTextValue(values, ["field_1", "eyebrow", "badge", "label"]),
    title: getTextValue(values, ["field_2", "title", "heading"]),
    highlightedTitle: getTextValue(values, [
      "field_3",
      "highlighted_title",
      "highlightedTitle",
      "accent_title",
      "accentTitle",
    ]),
    description: getTextValue(values, [
      "field_4",
      "description",
      "subtitle",
      "text",
    ]),
    contentSide: contentSideRaw === "left" ? "left" : "right",
    stats,
  };
}

export function getStatsGridRows(values: any) {
  if (Array.isArray(values?.field_5)) return sortRowsByAdminOrder(values.field_5);
  if (Array.isArray(values?.field_3)) return sortRowsByAdminOrder(values.field_3);
  if (Array.isArray(values?.stats)) return sortRowsByAdminOrder(values.stats);
  if (Array.isArray(values?.items)) return sortRowsByAdminOrder(values.items);

  return [];
}

export function normalizeStatsGridItem(
  row: any,
  index: number,
): StatsGridItem | null {
  if (!row || typeof row !== "object") return null;

  const value =
    getValueText(row?.field_1) ||
    getValueText(row?.value) ||
    getValueText(row?.number) ||
    "";

  const label =
    getValueText(row?.field_2) ||
    getValueText(row?.label) ||
    getValueText(row?.title) ||
    "";

  const description =
    getValueText(row?.field_3) ||
    getValueText(row?.description) ||
    getValueText(row?.subtitle) ||
    getValueText(row?.text) ||
    "";

  const icon =
    getIconNameFromValue(row?.field_4 || row?.icon || row?.iconName) ||
    "Store";

  const iconBg =
    getValueText(row?.field_5 || row?.icon_bg || row?.iconBg || row?.bg) ||
    "#A7745E";

  const iconColor =
    getValueText(
      row?.field_6 || row?.icon_color || row?.iconColor || row?.color,
    ) || "#FFFFFF";

  if (!value && !label && !description && !icon) return null;

  return {
    value: value || `+${index + 1}`,
    label,
    description,
    icon,
    iconBg,
    iconColor,
  };
}

export function getStatsGridContent(
  section: HomeDynamicSection,
): StatsGridContent {
  const values = getSectionValues(section);

  const items = getStatsGridRows(values)
    .map((row: any, index: number) => normalizeStatsGridItem(row, index))
    .filter(Boolean) as StatsGridItem[];

  return {
    eyebrow: getTextValue(values, ["field_1", "eyebrow", "badge", "label"]),
    title: getTextValue(values, ["field_2", "title", "heading"]),
    subtitle: getTextValue(values, [
      "field_3",
      "subtitle",
      "description",
      "text",
    ]),
    backgroundText:
      getTextValue(values, [
        "field_4",
        "background_text",
        "backgroundText",
        "watermark",
      ]) || "متجر",
    items,
  };
}

export function getFeaturedMosaicSideImages(
  values: any,
  data: any,
  seoMode: any,
): FeaturedMosaicSideImage[] {
  const rows =
    Array.isArray(values?.field_8)
      ? sortRowsByAdminOrder(values.field_8)
      : Array.isArray(values?.side_images)
        ? sortRowsByAdminOrder(values.side_images)
        : Array.isArray(values?.images)
          ? sortRowsByAdminOrder(values.images)
          : [];

  return rows
    .map((row: any, index: number) => {
      const image = getImageFromValue(row?.field_1 || row?.image || row);
      if (!image) return null;

      const linkValue =
        row?.field_3 ||
        row?.link ||
        row?.href ||
        row?.target ||
        row?.url ||
        "";

      return {
        image,
        alt:
          getValueText(row?.field_2) ||
          getValueText(row?.alt) ||
          getValueText(row?.title) ||
          `side-image-${index + 1}`,
        href: linkValue ? resolveLinkHref(linkValue, data, seoMode) : "#",
      };
    })
    .filter(Boolean) as FeaturedMosaicSideImage[];
}

export function getFeaturedMosaicProduct(values: any, data: any) {
  return getLinkedProductFromValue(
    values?.field_1 ||
      values?.product ||
      values?.selected_product ||
      values?.product_id,
    data,
  );
}

export function getFeaturedMosaicButtonHref(
  values: any,
  data: any,
  seoMode: any,
  selectedProduct: any,
) {
  const explicitLink =
    values?.field_7 ||
    values?.button_link ||
    values?.buttonLink ||
    values?.cta_link ||
    values?.ctaLink ||
    values?.link ||
    values?.href ||
    "";

  const resolvedExplicitLink = explicitLink
    ? resolveLinkHref(explicitLink, data, seoMode)
    : "";

  if (resolvedExplicitLink && resolvedExplicitLink !== "#") {
    return resolvedExplicitLink;
  }

  if (selectedProduct && getProductId(selectedProduct)) {
    return buildProductHref(selectedProduct, seoMode);
  }

  return "#";
}

export function getFeaturedMosaicOfferContent(
  section: HomeDynamicSection,
  data: any,
  seoMode: any,
): FeaturedMosaicOfferContent {
  const values = getSectionValues(section);
  const selectedProduct = getFeaturedMosaicProduct(values, data);

  const mainImage =
    getImageFromValue(
      values?.field_2 ||
        values?.image ||
        values?.main_image ||
        values?.mainImage ||
        values?.banner,
    ) || getFirstProductImage(selectedProduct);

  return {
    productHref: getFeaturedMosaicButtonHref(
      values,
      data,
      seoMode,
      selectedProduct,
    ),
    mainImage,
    eyebrow:
      getTextValue(values, ["field_3", "eyebrow", "badge", "label"]) ||
      "منتج مميز",
    title:
      getTextValue(values, ["field_4", "title", "heading"]) ||
      section.title ||
      "عرض خاص على المنتج",
    subtitle:
      getTextValue(values, ["field_5", "subtitle", "description", "text"]) ||
      "",
    buttonText:
      getTextValue(values, ["field_6", "button_text", "buttonText"]) ||
      "عرض المنتج",
    textColor:
      getValueText(values?.field_10 || values?.text_color || values?.textColor) ||
      "#FFFFFF",
    buttonBg:
      getValueText(values?.field_11 || values?.button_bg || values?.buttonBg) ||
      "#FFFFFF",
    textPosition:
      getValueText(
        values?.field_9 || values?.text_position || values?.textPosition,
      ) || "top_right",
    sideImages: getFeaturedMosaicSideImages(values, data, seoMode).slice(0, 4),
  };
}

export function getMosaicTextPositionClass(position: string) {
  const value = s(position);

  if (value === "top_left") return "mk-fmo-content-top-left";
  if (value === "middle_right") return "mk-fmo-content-middle-right";
  if (value === "middle_left") return "mk-fmo-content-middle-left";

  return "mk-fmo-content-top-right";
}

export function getCountdownTarget(section: HomeDynamicSection) {
  const values = getSectionValues(section);

  const direct = getFieldValue(values, [
    "field_3",
    "target_datetime",
    "targetDateTime",
    "end_datetime",
    "endDateTime",
    "datetime",
    "ends_at",
    "endsAt",
    "deadline",
    "expires_at",
    "expiresAt",
  ]);

  if (direct && typeof direct === "object") {
    return (
      s(direct.datetime) ||
      s(direct.value) ||
      s(direct.date_time) ||
      s(direct.dateTime) ||
      ""
    );
  }

  if (s(direct)) return s(direct);

  const date = getTextValue(values, [
    "target_date",
    "targetDate",
    "end_date",
    "endDate",
    "date",
  ]);

  const time = getTextValue(values, [
    "target_time",
    "targetTime",
    "end_time",
    "endTime",
    "time",
  ]);

  if (date && time) return `${date}T${time}`;
  if (date) return date;

  return "";
}

export function getCountdownImage(section: HomeDynamicSection) {
  const values = getSectionValues(section);

  const imageValue = getFieldValue(values, [
    "field_2",
    "image",
    "background",
    "background_image",
    "backgroundImage",
    "banner",
    "cover",
    "cover_image",
    "coverImage",
  ]);

  const image = getImageFromValue(imageValue);
  if (image) return image;

  return section.items[0]?.src || "";
}

export function getCountdownLabels(values: any) {
  return {
    days: getTextValue(values, ["days_label", "daysLabel"]) || "يوم",
    hours: getTextValue(values, ["hours_label", "hoursLabel"]) || "ساعة",
    minutes: getTextValue(values, ["minutes_label", "minutesLabel"]) || "دقيقة",
    seconds: getTextValue(values, ["seconds_label", "secondsLabel"]) || "ثانية",
  };
}

export function getCountdownContent(section: HomeDynamicSection) {
  const values = getSectionValues(section);
  const button = getCountdownButton(values);

  return {
    title: getTextValue(values, [
      "field_1",
      "title",
      "heading",
      "main_title",
      "mainTitle",
    ]),
    subtitle: getTextValue(values, [
      "subtitle",
      "sub_title",
      "subTitle",
      "description",
      "text",
    ]),
    buttonText: button.text,
    buttonHref: button.link,
    image: getCountdownImage(section),
    target: getCountdownTarget(section),
    labels: getCountdownLabels(values),
  };
}

export function getCountdownParts(target: string) {
  const end = target ? new Date(target).getTime() : 0;
  const now = Date.now();

  const diff = Number.isFinite(end) ? Math.max(0, end - now) : 0;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function getFaqRows(values: any) {
  if (Array.isArray(values?.field_3)) return sortRowsByAdminOrder(values.field_3);
  if (Array.isArray(values?.questions)) return sortRowsByAdminOrder(values.questions);
  if (Array.isArray(values?.items)) return sortRowsByAdminOrder(values.items);
  if (Array.isArray(values?.faqs)) return sortRowsByAdminOrder(values.faqs);

  return [];
}

export function normalizeFaqItem(row: any, index: number): FaqItem | null {
  if (!row || typeof row !== "object") return null;

  const question =
    getValueText(row?.field_1) ||
    getValueText(row?.question) ||
    getValueText(row?.title) ||
    getValueText(row?.name);

  const answer =
    getValueText(row?.field_2) ||
    getValueText(row?.answer) ||
    getValueText(row?.description) ||
    getValueText(row?.text);

  if (!question && !answer) return null;

  return {
    question: question || `سؤال ${index + 1}`,
    answer,
  };
}

export function getFaqContent(section: HomeDynamicSection): FaqContent {
  const values = getSectionValues(section);

  const columnsRaw = s(values?.field_4 || values?.columns || values?.columns_count);
  const columns: "1" | "2" = columnsRaw === "1" ? "1" : "2";

  const items = getFaqRows(values)
    .map((row: any, index: number) => normalizeFaqItem(row, index))
    .filter(Boolean) as FaqItem[];

  return {
    title:
      getTextValue(values, ["field_1", "title", "heading"]) ||
      section.title ||
      "الأسئلة الشائعة",
    description: getTextValue(values, [
      "field_2",
      "description",
      "subtitle",
      "text",
    ]),
    columns,
    items,
  };
}

export function clampTestimonialsLimit(value: any) {
  const limit = n(value, 10);
  return Math.min(25, Math.max(1, limit));
}

export function clampTestimonialsLoadMoreLimit(value: any) {
  const limit = n(value, 20);
  return Math.min(100, Math.max(1, limit));
}

export function getTestimonialsRows(data: any) {
  const candidates = [
    data?.storeReviews,
    data?.store_reviews,
    data?.testimonials,
    data?.reviews,

    data?.data?.storeReviews,
    data?.data?.store_reviews,
    data?.data?.testimonials,
    data?.data?.reviews,

    data?.pageData?.storeReviews,
    data?.pageData?.store_reviews,
    data?.pageData?.testimonials,
    data?.pageData?.reviews,

    data?.homepage?.storeReviews,
    data?.homepage?.store_reviews,
    data?.homepage?.testimonials,
    data?.homepage?.reviews,

    data?.themeData?.storeReviews,
    data?.themeData?.store_reviews,
    data?.themeData?.testimonials,
    data?.themeData?.reviews,

    data?.theme_data?.storeReviews,
    data?.theme_data?.store_reviews,
    data?.theme_data?.testimonials,
    data?.theme_data?.reviews,

    data?.feedback,
    data?.storeFeedback,
    data?.store_feedback,
    data?.ratings,
    data?.storeRatings,
    data?.store_ratings,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) {
      return sortRowsByAdminOrder(candidate);
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return sortRowsByAdminOrder(candidate);
  }

  return [];
}

export function maskCustomerName(name: string) {
  const clean = s(name);
  if (!clean) return "عميل";

  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return parts
      .map((part, index) => {
        if (index === 0) return part;
        return `${part.slice(0, 1)}****`;
      })
      .join(" ");
  }

  if (clean.length <= 2) return `${clean.slice(0, 1)}****`;

  return `${clean.slice(0, 2)}****`;
}

export function normalizeTestimonialItem(
  row: any,
  index: number,
): TestimonialItem | null {
  if (!row || typeof row !== "object") return null;

  const id =
    s(row?.id) ||
    s(row?.review_id) ||
    s(row?.feedback_id) ||
    `testimonial-${index}`;

  const customer = row?.customer || row?.user || row?.author || {};

  const name =
    s(row?.customer_name) ||
    s(row?.customerName) ||
    s(row?.name) ||
    s(row?.author_name) ||
    s(row?.authorName) ||
    s(customer?.name) ||
    s(customer?.full_name) ||
    s(customer?.fullName) ||
    "عميل";

  const role =
    s(row?.role) ||
    s(row?.job_title) ||
    s(row?.jobTitle) ||
    s(row?.subtitle) ||
    s(row?.customer_label) ||
    s(row?.customerLabel) ||
    "";

  const avatar =
    getImageFromValue(row?.avatar) ||
    getImageFromValue(row?.image) ||
    getImageFromValue(row?.customer_image) ||
    getImageFromValue(row?.customerImage) ||
    getImageFromValue(customer?.avatar) ||
    getImageFromValue(customer?.image) ||
    "";

  const text =
    s(row?.text) ||
    s(row?.comment) ||
    s(row?.content) ||
    s(row?.message) ||
    s(row?.review) ||
    s(row?.body) ||
    s(row?.description);

  const rating = Math.min(
    5,
    Math.max(
      0,
      n(
        row?.rating ??
          row?.rate ??
          row?.stars ??
          row?.score ??
          row?.rating_value ??
          row?.ratingValue,
        5,
      ),
    ),
  );

  const createdAt =
    s(row?.created_at) ||
    s(row?.createdAt) ||
    s(row?.date) ||
    s(row?.published_at) ||
    s(row?.publishedAt) ||
    "";

  if (!text) return null;

  return {
    id,
    name,
    role,
    avatar,
    text,
    rating,
    createdAt,
  };
}

export function formatTestimonialDate(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return s(value);

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export async function fetchStoreTestimonialsPage(args: {
  limit: number;
  offset: number;
}) {
  const params = new URLSearchParams();

  params.set("target_type", "store");
  params.set("review_type", "review");
  params.set("sort", "featured");
  params.set("limit", String(args.limit));
  params.set("offset", String(args.offset));

  const res = await fetch(`/api/reviews?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.ok) {
    throw new Error(json?.message || "FAILED_TO_FETCH_REVIEWS");
  }

  const rows = Array.isArray(json.items)
    ? json.items
    : Array.isArray(json.rows)
      ? json.rows
      : Array.isArray(json.data)
        ? json.data
        : [];

  const hasMore = Boolean(json.hasMore ?? json.has_more ?? false);

  const rawNextOffset =
    json.nextOffset ??
    json.next_offset ??
    (hasMore ? args.offset + rows.length : null);

  return {
    items: rows
      .map((row: any, index: number) =>
        normalizeTestimonialItem(row, args.offset + index),
      )
      .filter(Boolean) as TestimonialItem[],
    total: Number(json.total ?? json.count ?? 0),
    hasMore,
    nextOffset:
      rawNextOffset === null || rawNextOffset === undefined
        ? null
        : Number(rawNextOffset),
  };
}

export function getTestimonialsContent(
  section: HomeDynamicSection,
  data: any,
): TestimonialsContent {
  const values = getSectionValues(section);

  const nameModeRaw = s(values?.field_3 || values?.name_mode || values?.nameMode);
  const nameMode: TestimonialNameMode =
    nameModeRaw === "masked" ? "masked" : "full";

  const showDate = boolValue(values?.field_4, true);
  const bestOnly = boolValue(values?.field_5, true);
  const limit = clampTestimonialsLimit(values?.field_6);
  const showAllButton = boolValue(values?.field_7, true);

  const loadMoreLimit = clampTestimonialsLoadMoreLimit(
    values?.field_9 ||
      values?.load_more_limit ||
      values?.loadMoreLimit ||
      values?.page_size ||
      values?.pageSize,
  );

  const rows = getTestimonialsRows(data);

  let items = rows
    .filter((row: any) => {
      if (!row || typeof row !== "object") return false;

      const targetType = lower(row?.target_type ?? row?.targetType);
      const reviewType = lower(row?.review_type ?? row?.reviewType);
      const status = lower(row?.status);

      if (targetType && targetType !== "store") return false;
      if (reviewType && reviewType !== "review") return false;
      if (status && status !== "published") return false;

      return true;
    })
    .map((row: any, index: number) => normalizeTestimonialItem(row, index))
    .filter(Boolean) as TestimonialItem[];

  if (bestOnly) {
    items = [...items].sort((a, b) => {
      const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();

      return (
        (Number.isFinite(bTime) ? bTime : 0) -
        (Number.isFinite(aTime) ? aTime : 0)
      );
    });
  }

  return {
    title:
      getTextValue(values, ["field_1", "title", "heading"]) ||
      section.title ||
      "آراء العملاء",
    description: getTextValue(values, [
      "field_2",
      "description",
      "subtitle",
      "text",
    ]),
    nameMode,
    showDate,
    bestOnly,
    limit,
    showAllButton,
    buttonText:
      getTextValue(values, ["field_8", "button_text", "buttonText"]) ||
      "عرض كل التقييمات",
    loadMoreLimit,
    items,
  };
}