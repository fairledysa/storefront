// FILE: apps/storefront/src/data/viewmodels/product.vm.ts

export type ProductBadgeVM = {
  text: string;
  bg: string;
  color: string;
};

export type ProductTaxVM = {
  enabled: boolean;
  label: string;
  rate: number;

  pricesIncludeTax: boolean;
  prices_include_tax: boolean;

  inputPricesIncludeTax: boolean;
  input_prices_include_tax: boolean;

  shouldAddTaxToPrice: boolean;
  should_add_tax_to_price: boolean;

  isIncludedInPrice: boolean;
  is_included_in_price: boolean;

  multiplier: number;

  displayLabel: string | null;
  display_label: string | null;
};

export type ProductMediaVM = {
  id: string;
  kind: "image" | "video";
  media_kind: "image" | "video";
  url: string;
  original_url: string;
  thumb: string | null;
  thumbnail_url: string | null;
  alt: string | null;
  video_url?: string | null;
  is_default?: boolean;
  sort_order?: number;
};

export type ProductCardOptionValueVM = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  display_value?: string | null;
  displayValue?: string | null;
  color?: string | null;
  image?: string | null;
  image_url?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  stock_quantity?: number | string | null;
  stockQuantity?: number | string | null;
  available_qty?: number | string | null;
  availableQty?: number | string | null;
  unlimited_quantity?: boolean | number | string | null;
  unlimitedQuantity?: boolean | number | string | null;
  available?: boolean | number | string | null;
  is_available?: boolean | number | string | null;
  isAvailable?: boolean | number | string | null;
  in_stock?: boolean | number | string | null;
  inStock?: boolean | number | string | null;
  disabled?: boolean | number | string | null;
  metadata?: Record<string, any> | null;
};

export type ProductCardOptionVM = {
  id?: string;
  name?: string;
  label?: string;
  values?: ProductCardOptionValueVM[];
};

export type ProductCardVariantVM = Record<string, any> & {
  id?: string;

  price?: number | null;
  sale_price?: number | null;
  salePrice?: number | null;

  base_price?: number | null;
  basePrice?: number | null;
  base_sale_price?: number | null;
  baseSalePrice?: number | null;

  stock_quantity?: number | null;
  stockQuantity?: number | null;
  unlimited_quantity?: boolean;
  unlimitedQuantity?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  option_values?: any[];
  optionValueIds?: string[];
};

export type ProductCardVM = {
  id: string;
  publicNo: number | null;
  href: string;

  brand: string;
  brandName: string | null;
  title: string;

  subtitle: string;
  promotionTitle: string;

  metadata: Record<string, any> | null;
  seo: Record<string, any> | null;

  imageUrl: string;
  image_url: string;
  imageAlt: string;
  hoverImageUrl: string | null;

  images: string[];
  media: ProductMediaVM[];

  price: number;
  compareAtPrice: number | null;
  regularPrice: number;
  salePrice: number | null;

  basePrice?: number;
  baseRegularPrice?: number;
  baseSalePrice?: number | null;
  baseCompareAtPrice?: number | null;
  baseCurrency?: string;
  baseCurrencyCode?: string;
  sourceCurrencyCode?: string;

  currency: string;
  currency_code: string;
  currencyCode: string;
  currency_symbol: string;
  currencySymbol: string;
  currency_decimals: number;
  currencyDecimals: number;
  decimal_digits: number;
  decimalDigits: number;

  saleEnd: string | null;
  showSaleCountdown: boolean;
  hasDiscount: boolean;
  countdownEnabled: boolean;

  rating: number | null;
  reviewsCount: number | null;

  badge: ProductBadgeVM | null;
  tax: ProductTaxVM;

  stock: {
    quantity: number | null;
    unlimited_quantity: boolean;
    unlimitedQuantity: boolean;
    hide_quantity: boolean;
    hideQuantity: boolean;
    maximum_quantity_per_order: number | null;
    maximumQuantityPerOrder: number | null;
  };

  isOutOfStock: boolean;
  showDashInstead: boolean;

  options: ProductCardOptionVM[];
  variants: ProductCardVariantVM[];

  raw: any;
};

export type ProductDetailVM = ProductCardVM & {
  name: string;
  descriptionHtml: string;

  brandInfo: {
    id: string | null;
    name: string | null;
    logoUrl: string | null;
  } | null;

  pricing: {
    price: number;
    regularPrice: number;
    salePrice: number | null;
    compareAtPrice: number | null;

    basePrice?: number;
    baseRegularPrice?: number;
    baseSalePrice?: number | null;
    baseCompareAtPrice?: number | null;
    baseCurrency?: string;
    baseCurrencyCode?: string;
    sourceCurrencyCode?: string;

    currency: string;
    currency_code: string;
    currencyCode: string;
    currency_symbol: string;
    currencySymbol: string;
    currency_decimals: number;
    currencyDecimals: number;
    decimal_digits: number;
    decimalDigits: number;

    hasDiscount: boolean;
    saleStart: string | null;
    saleEnd: string | null;
  };

  detailStock: {
    quantity: number | null;
    unlimitedQuantity: boolean;
    hideQuantity: boolean;
    maximumQuantityPerOrder: number | null;
    isOutOfStock: boolean;
  };

  imageAlts: string[];

  categories: Array<{
    id: string;
    publicNo: number | null;
    name: string;
    isPrimary?: boolean;
  }>;

  tags: Array<{
    id: string;
    name: string;
    slug?: string | null;
  }>;

  reviewsSummary: {
    rating: number | null;
    count: number | null;
  };
};

export type ProductVM = ProductDetailVM;

type CurrencyItemLike = {
  code?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;

  symbol?: string | null;

  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;

  rate?: number | string | null;
  rate_to_default?: number | string | null;
  exchange_rate?: number | string | null;
  exchangeRate?: number | string | null;

  decimal_digits?: number | string | null;
  decimalDigits?: number | string | null;
  decimals?: number | string | null;

  is_default?: boolean | number | string | null;
  enabled?: boolean | number | string | null;
  is_enabled?: boolean | number | string | null;

  metadata?: Record<string, any> | string | null;
};

type CurrenciesLike = {
  default_code?: string | null;
  active_code?: string | null;
  selected_code?: string | null;
  selectedCurrencyCode?: string | null;

  items?: CurrencyItemLike[];

  default_currency?: CurrencyItemLike | null;
  active_currency?: CurrencyItemLike | null;
};

type TaxLike = {
  enabled?: boolean | number | string | null;

  label?: string | null;
  tax_label?: string | null;
  taxLabel?: string | null;

  rate?: number | string | null;
  effective_rate?: number | string | null;
  effectiveRate?: number | string | null;
  default_rate?: number | string | null;
  defaultRate?: number | string | null;

  prices_include_tax?: boolean | number | string | null;
  pricesIncludeTax?: boolean | number | string | null;
};

function s(value: any) {
  return String(value ?? "").trim();
}

function clip(value: any, n: number) {
  const text = s(value);
  return text ? text.slice(0, n) : "";
}

function toNum(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNumOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return fallback;
}

function readBoolMaybe(value: any): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (
      text === "true" ||
      text === "1" ||
      text === "yes" ||
      text === "on" ||
      text === "enabled"
    ) {
      return true;
    }

    if (
      text === "false" ||
      text === "0" ||
      text === "no" ||
      text === "off" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return null;
}

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }

  return "";
}

function clampDecimals(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(4, Math.floor(n)));
}

function normalizeCurrencyCode(value: any) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function isPlainObject(value: any): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeObject(value: any): Record<string, any> {
  if (isPlainObject(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (isPlainObject(parsed)) return parsed;
    } catch {
      //
    }
  }

  return {};
}

function positiveRate(value: any, fallback = 1) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function currencyItemCode(item: any) {
  return normalizeCurrencyCode(
    firstDefined(item?.code, item?.currency_code, item?.currencyCode),
  );
}

function currencyItemSymbol(item: any, fallbackCode: string) {
  return firstText(item?.symbol) || fallbackCode;
}

function currencyItemDecimals(item: any, fallback = 0) {
  return clampDecimals(
    firstDefined(
      item?.decimal_digits,
      item?.decimalDigits,
      item?.decimals,
      fallback,
    ),
  );
}

function currencyItemRate(item: any) {
  const metadata = safeObject(item?.metadata);

  return positiveRate(
    firstDefined(
      item?.rate_to_default,
      item?.exchange_rate,
      item?.exchangeRate,
      item?.rate,
      metadata.rate_to_default,
      metadata.exchange_rate,
      metadata.exchangeRate,
      metadata.rate,
      metadata.conversion_rate,
      metadata.conversionRate,
    ),
    1,
  );
}

function getCurrencyItems(currencies?: CurrenciesLike | null) {
  const items: CurrencyItemLike[] = [];

  if (Array.isArray(currencies?.items)) {
    items.push(...currencies.items);
  }

  if (currencies?.default_currency) {
    items.push(currencies.default_currency);
  }

  if (currencies?.active_currency) {
    items.push(currencies.active_currency);
  }

  const seen = new Set<string>();

  return items.filter((item) => {
    const code = currencyItemCode(item);
    if (!code) return false;
    if (seen.has(code)) return false;

    seen.add(code);
    return true;
  });
}

function getDefaultCurrencyCode(currencies?: CurrenciesLike | null) {
  const direct = normalizeCurrencyCode(currencies?.default_code);
  if (direct) return direct;

  const fromObject = currencyItemCode(currencies?.default_currency);
  if (fromObject) return fromObject;

  const fromItems = getCurrencyItems(currencies).find((item) =>
    readBool(firstDefined(item?.is_default), false),
  );

  return currencyItemCode(fromItems);
}

function getActiveCurrencyCode(currencies?: CurrenciesLike | null) {
  const direct = normalizeCurrencyCode(
    firstDefined(
      currencies?.active_code,
      currencies?.selected_code,
      currencies?.selectedCurrencyCode,
    ),
  );

  if (direct) return direct;

  const fromObject = currencyItemCode(currencies?.active_currency);
  if (fromObject) return fromObject;

  return getDefaultCurrencyCode(currencies);
}

function findCurrencyItem(
  currencies: CurrenciesLike | null | undefined,
  codeValue: any,
) {
  const code = normalizeCurrencyCode(codeValue);
  if (!code) return null;

  return (
    getCurrencyItems(currencies).find((item) => currencyItemCode(item) === code) ??
    null
  );
}

function getRateForCurrency(
  currencies: CurrenciesLike | null | undefined,
  codeValue: any,
) {
  const code = normalizeCurrencyCode(codeValue);
  if (!code) return 1;

  const item = findCurrencyItem(currencies, code);
  if (!item) return 1;

  return currencyItemRate(item);
}

function convertMoneyAmount(
  amount: number,
  sourceCurrencyCode: string,
  currencies?: CurrenciesLike | null,
) {
  if (!currencies) return amount;

  const activeCode = getActiveCurrencyCode(currencies);
  if (!activeCode) return amount;

  const defaultCode = getDefaultCurrencyCode(currencies);
  const sourceCode =
    normalizeCurrencyCode(sourceCurrencyCode) || defaultCode || activeCode;

  if (!sourceCode) return amount;
  if (sourceCode === activeCode) return amount;

  const sourceRate = getRateForCurrency(currencies, sourceCode);
  const activeRate = getRateForCurrency(currencies, activeCode);

  if (!Number.isFinite(sourceRate) || sourceRate <= 0) return amount;
  if (!Number.isFinite(activeRate) || activeRate <= 0) return amount;

  return (amount * sourceRate) / activeRate;
}

function convertNullableMoneyAmount(
  amount: number | null,
  sourceCurrencyCode: string,
  currencies?: CurrenciesLike | null,
) {
  if (amount === null) return null;
  return convertMoneyAmount(amount, sourceCurrencyCode, currencies);
}

function activeCurrencyInfoFromContext(
  fallback: ReturnType<typeof readCurrencyInfo>,
  currencies?: CurrenciesLike | null,
) {
  const activeCode = getActiveCurrencyCode(currencies);
  if (!activeCode) return fallback;

  const item = findCurrencyItem(currencies, activeCode);

  const currencyCode = activeCode;
  const currencySymbol = item
    ? currencyItemSymbol(item, currencyCode)
    : fallback.currency_symbol || currencyCode;

  const decimalDigits = item
    ? currencyItemDecimals(item, fallback.decimal_digits)
    : fallback.decimal_digits;

  return {
    currency: currencyCode,
    currency_code: currencyCode,
    currencyCode,
    currency_symbol: currencySymbol,
    currencySymbol: currencySymbol,
    currency_decimals: decimalDigits,
    currencyDecimals: decimalDigits,
    decimal_digits: decimalDigits,
    decimalDigits: decimalDigits,
  };
}

function readCurrencyInfo(product: any, pricing: any) {
  const currencyCode = firstText(
    pricing?.currency_code,
    pricing?.currencyCode,
    pricing?.currency,
    product?.currency_code,
    product?.currencyCode,
    product?.currency,
    product?.seo?.currency_code,
    product?.seo?.currencyCode,
    product?.seo?.currency,
    product?.metadata?.currency_code,
    product?.metadata?.currencyCode,
    product?.metadata?.currency,
    product?.store_currency?.currency_code,
    product?.storeCurrency?.currencyCode,
    product?.store_currency?.code,
    product?.storeCurrency?.code,
  ).toUpperCase();

  const currencySymbol = firstText(
    pricing?.currency_symbol,
    pricing?.currencySymbol,
    pricing?.symbol,
    product?.currency_symbol,
    product?.currencySymbol,
    product?.symbol,
    product?.seo?.currency_symbol,
    product?.seo?.currencySymbol,
    product?.seo?.symbol,
    product?.metadata?.currency_symbol,
    product?.metadata?.currencySymbol,
    product?.metadata?.symbol,
    product?.store_currency?.symbol,
    product?.storeCurrency?.symbol,
  );

  const decimalDigits = clampDecimals(
    firstDefined(
      pricing?.currency_decimals,
      pricing?.currencyDecimals,
      pricing?.decimal_digits,
      pricing?.decimalDigits,
      product?.currency_decimals,
      product?.currencyDecimals,
      product?.decimal_digits,
      product?.decimalDigits,
      product?.seo?.currency_decimals,
      product?.seo?.currencyDecimals,
      product?.seo?.decimal_digits,
      product?.seo?.decimalDigits,
      product?.metadata?.currency_decimals,
      product?.metadata?.currencyDecimals,
      product?.metadata?.decimal_digits,
      product?.metadata?.decimalDigits,
      product?.store_currency?.decimal_digits,
      product?.storeCurrency?.decimalDigits,
      0,
    ),
  );

  return {
    currency: currencyCode,
    currency_code: currencyCode,
    currencyCode,
    currency_symbol: currencySymbol,
    currencySymbol,
    currency_decimals: decimalDigits,
    currencyDecimals: decimalDigits,
    decimal_digits: decimalDigits,
    decimalDigits: decimalDigits,
  };
}

function normalizeDate(value: any): string | null {
  const text = s(value);
  return text ? text : null;
}

function readMetadata(product: any): Record<string, any> {
  return isPlainObject(product?.metadata) ? product.metadata : {};
}

function readProductPricingObject(product: any) {
  if (product?.pricing && typeof product.pricing === "object") {
    return product.pricing;
  }

  if (product?.product_pricing && typeof product.product_pricing === "object") {
    return product.product_pricing;
  }

  return null;
}

function clampTaxRate(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(100, n));
}

 function normalizeProductTax(args: {
  product: any;
  tax?: TaxLike | null;
}): ProductTaxVM {
  const product = args.product ?? {};
  const taxAny: any = args.tax ?? null;
  const meta = readMetadata(product);
  const metaTax = isPlainObject(meta.tax) ? meta.tax : {};
  const productTax = isPlainObject(product?.tax) ? product.tax : {};
  const pricing = readProductPricingObject(product);

  const label =
    firstText(
      taxAny?.tax_label,
      taxAny?.taxLabel,
      taxAny?.label,

      metaTax?.tax_label,
      metaTax?.taxLabel,
      metaTax?.label,

      productTax?.tax_label,
      productTax?.taxLabel,
      productTax?.label,
    ) || "VAT";

  const rate = clampTaxRate(
    firstDefined(
      taxAny?.effective_rate,
      taxAny?.effectiveRate,
      taxAny?.tax_rate,
      taxAny?.taxRate,
      taxAny?.vat_rate,
      taxAny?.vatRate,
      taxAny?.rate,
      taxAny?.default_rate,
      taxAny?.defaultRate,
      taxAny?.percentage,
      taxAny?.percent,

      metaTax?.effective_rate,
      metaTax?.effectiveRate,
      metaTax?.tax_rate,
      metaTax?.taxRate,
      metaTax?.vat_rate,
      metaTax?.vatRate,
      metaTax?.rate,
      metaTax?.default_rate,
      metaTax?.defaultRate,
      metaTax?.percentage,
      metaTax?.percent,

      productTax?.effective_rate,
      productTax?.effectiveRate,
      productTax?.tax_rate,
      productTax?.taxRate,
      productTax?.vat_rate,
      productTax?.vatRate,
      productTax?.rate,
      productTax?.default_rate,
      productTax?.defaultRate,
      productTax?.percentage,
      productTax?.percent,
    ),
  );

  const enabledExplicit = readBoolMaybe(
    firstDefined(
      taxAny?.enabled,
      taxAny?.is_enabled,
      taxAny?.isEnabled,
      taxAny?.active,
      taxAny?.is_active,
      taxAny?.isActive,
      taxAny?.vat_enabled,
      taxAny?.vatEnabled,

      metaTax?.enabled,
      metaTax?.is_enabled,
      metaTax?.isEnabled,
      metaTax?.active,
      metaTax?.is_active,
      metaTax?.isActive,
      metaTax?.vat_enabled,
      metaTax?.vatEnabled,

      productTax?.enabled,
      productTax?.is_enabled,
      productTax?.isEnabled,
      productTax?.active,
      productTax?.is_active,
      productTax?.isActive,
      productTax?.vat_enabled,
      productTax?.vatEnabled,
    ),
  );

  const enabled = enabledExplicit ?? rate > 0;

  const taxContextPricesIncludeTaxMaybe = readBoolMaybe(
    firstDefined(
      taxAny?.prices_include_tax,
      taxAny?.pricesIncludeTax,
    ),
  );

  const pricesIncludeTax = readBool(
    firstDefined(
      taxAny?.prices_include_tax,
      taxAny?.pricesIncludeTax,

      metaTax?.prices_include_tax,
      metaTax?.pricesIncludeTax,

      productTax?.prices_include_tax,
      productTax?.pricesIncludeTax,
    ),
    false,
  );

  const productPriceIncludesTaxMaybe = readBoolMaybe(
    firstDefined(
      pricing?.with_tax,
      pricing?.withTax,
      pricing?.prices_include_tax,
      pricing?.pricesIncludeTax,

      product?.with_tax,
      product?.withTax,
      product?.prices_include_tax,
      product?.pricesIncludeTax,

      meta.with_tax,
      meta.withTax,
      meta.prices_include_tax,
      meta.pricesIncludeTax,
    ),
  );

  const inputPricesIncludeTax =
    taxContextPricesIncludeTaxMaybe ??
    productPriceIncludesTaxMaybe ??
    pricesIncludeTax;


  const shouldAddTaxExplicit = readBoolMaybe(
    firstDefined(
      taxAny?.should_add_tax_to_price,
      taxAny?.shouldAddTaxToPrice,
      taxAny?.add_tax_to_price,
      taxAny?.addTaxToPrice,

      metaTax?.should_add_tax_to_price,
      metaTax?.shouldAddTaxToPrice,
      metaTax?.add_tax_to_price,
      metaTax?.addTaxToPrice,

      productTax?.should_add_tax_to_price,
      productTax?.shouldAddTaxToPrice,
      productTax?.add_tax_to_price,
      productTax?.addTaxToPrice,
    ),
  );

  const shouldAddTaxToPrice = Boolean(
    enabled && rate > 0 && (shouldAddTaxExplicit ?? !inputPricesIncludeTax),
  );

  const isIncludedInPrice = Boolean(enabled && rate > 0);
  const multiplier = shouldAddTaxToPrice ? 1 + rate / 100 : 1;
  const displayLabel = isIncludedInPrice ? "شامل الضريبة" : null;

  return {
    enabled,
    label,
    rate,

    pricesIncludeTax,
    prices_include_tax: pricesIncludeTax,

    inputPricesIncludeTax,
    input_prices_include_tax: inputPricesIncludeTax,

    shouldAddTaxToPrice,
    should_add_tax_to_price: shouldAddTaxToPrice,

    isIncludedInPrice,
    is_included_in_price: isIncludedInPrice,

    multiplier,

    displayLabel,
    display_label: displayLabel,
  };
}
function applyTaxToSourceAmount(amount: number, tax: ProductTaxVM) {
  if (!Number.isFinite(amount)) return 0;
  if (!tax.shouldAddTaxToPrice) return amount;

  return amount * tax.multiplier;
}

function applyTaxToNullableSourceAmount(
  amount: number | null,
  tax: ProductTaxVM,
) {
  if (amount === null) return null;
  return applyTaxToSourceAmount(amount, tax);
}

function readPricing(
  product: any,
  currencies?: CurrenciesLike | null,
  tax?: ProductTaxVM | null,
) {
  const pricing = readProductPricingObject(product);
  const productTax = tax ?? normalizeProductTax({ product, tax: null });

  const rawBaseRegularPrice = toNum(
    firstDefined(
      pricing?.price,
      product?.price,
      product?.seo?.price,
      product?.metadata?.price,
    ),
    0,
  );

  const salePriceRaw = firstDefined(
    pricing?.sale_price,
    pricing?.salePrice,
    product?.sale_price,
    product?.salePrice,
    product?.seo?.sale_price,
    product?.seo?.salePrice,
    product?.metadata?.sale_price,
    product?.metadata?.salePrice,
  );

  const rawBaseSalePriceValue = toNumOrNull(salePriceRaw);

  const hasDiscount =
    typeof rawBaseSalePriceValue === "number" &&
    rawBaseSalePriceValue > 0 &&
    rawBaseSalePriceValue < rawBaseRegularPrice;

  const rawBaseFinalPrice = hasDiscount
    ? rawBaseSalePriceValue
    : rawBaseRegularPrice;

  const rawBaseCompareAtPrice = hasDiscount ? rawBaseRegularPrice : null;
  const rawBaseSalePrice = hasDiscount ? rawBaseSalePriceValue : null;

  const baseRegularPrice = applyTaxToSourceAmount(
    rawBaseRegularPrice,
    productTax,
  );
  const baseFinalPrice = applyTaxToSourceAmount(rawBaseFinalPrice, productTax);
  const baseCompareAtPrice = applyTaxToNullableSourceAmount(
    rawBaseCompareAtPrice,
    productTax,
  );
  const baseSalePrice = applyTaxToNullableSourceAmount(
    rawBaseSalePrice,
    productTax,
  );

  const sourceCurrencyInfo = readCurrencyInfo(product, pricing);

  const sourceCurrencyCode =
    normalizeCurrencyCode(sourceCurrencyInfo.currency) ||
    getDefaultCurrencyCode(currencies) ||
    sourceCurrencyInfo.currency;

  const price = convertMoneyAmount(
    baseFinalPrice,
    sourceCurrencyCode,
    currencies,
  );

  const regularPrice = convertMoneyAmount(
    baseRegularPrice,
    sourceCurrencyCode,
    currencies,
  );

  const salePrice = hasDiscount
    ? convertNullableMoneyAmount(baseSalePrice, sourceCurrencyCode, currencies)
    : null;

  const compareAtPrice = hasDiscount
    ? convertNullableMoneyAmount(
        baseCompareAtPrice,
        sourceCurrencyCode,
        currencies,
      )
    : null;

  const currencyInfo = activeCurrencyInfoFromContext(
    sourceCurrencyInfo,
    currencies,
  );

  const saleStart = normalizeDate(
    firstDefined(
      pricing?.sale_start,
      pricing?.saleStart,
      product?.sale_start,
      product?.saleStart,
      product?.metadata?.sale_start,
      product?.metadata?.saleStart,
    ),
  );

  const saleEnd = normalizeDate(
    firstDefined(
      pricing?.sale_end,
      pricing?.saleEnd,
      product?.sale_end,
      product?.saleEnd,
      product?.metadata?.sale_end,
      product?.metadata?.saleEnd,
    ),
  );

  return {
    price,
    regularPrice,
    salePrice,
    compareAtPrice,

    basePrice: baseFinalPrice,
    baseRegularPrice,
    baseSalePrice,
    baseCompareAtPrice,
    baseCurrency: sourceCurrencyCode,
    baseCurrencyCode: sourceCurrencyCode,
    sourceCurrencyCode,

    ...currencyInfo,
    hasDiscount,
    saleStart,
    saleEnd,
  };
}

function readMediaUrl(value: any) {
  if (!value) return "";

  if (typeof value === "string") return s(value);

  return firstText(
    value.original_url,
    value.url,
    value.public_url,
    value.image_url,
    value.imageUrl,
    value.thumbnail_url,
    value.thumbnailUrl,
    value.src,
    value.path,
  );
}

function readMediaThumb(value: any) {
  if (!value || typeof value === "string") return null;

  return (
    firstText(
      value.thumbnail_url,
      value.thumbnailUrl,
      value.thumb,
      value.image_url,
      value.imageUrl,
    ) || null
  );
}

function readMediaKind(value: any): "image" | "video" {
  const kind = s(value?.media_kind ?? value?.kind ?? value?.type).toLowerCase();
  return kind === "video" ? "video" : "image";
}

function normalizeMedia(product: any): ProductMediaVM[] {
  const buckets = [
    product?.media,
    product?.images,
    product?.metadata?.media,
    product?.metadata?.images,
    product?.metadata?.gallery,
    product?.metadata?.product_images,
    product?.seo?.media,
    product?.seo?.images,
  ];

  const rows: any[] = [];

  for (const bucket of buckets) {
    if (Array.isArray(bucket)) {
      rows.push(...bucket);
    }
  }

  const mapped = rows
    .map((row, index) => {
      const url = readMediaUrl(row);
      if (!url) return null;

      const kind = readMediaKind(row);

      return {
        id: s(row?.id) || `media-${index}`,
        kind,
        media_kind: kind,
        url,
        original_url: url,
        thumb: readMediaThumb(row),
        thumbnail_url: readMediaThumb(row),
        alt: typeof row === "string" ? null : row?.alt ?? row?.alt_text ?? null,
        video_url: typeof row === "string" ? null : row?.video_url ?? null,
        is_default: typeof row === "string" ? index === 0 : !!row?.is_default,
        sort_order:
          typeof row === "string" ? index : Number(row?.sort_order ?? index),
      };
    })
    .filter(Boolean) as ProductMediaVM[];

  mapped.sort((a, b) => {
    const ad = a.is_default ? 1 : 0;
    const bd = b.is_default ? 1 : 0;

    if (bd !== ad) return bd - ad;

    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  });

  const directImage = firstText(
    product?.image_url,
    product?.imageUrl,
    product?.thumbnail_url,
    product?.thumbnailUrl,
    product?.seo?.image_url,
    product?.seo?.imageUrl,
    product?.metadata?.image_url,
    product?.metadata?.imageUrl,
  );

  if (directImage && !mapped.some((media) => media.url === directImage)) {
    mapped.unshift({
      id: "primary-image",
      kind: "image",
      media_kind: "image",
      url: directImage,
      original_url: directImage,
      thumb: null,
      thumbnail_url: null,
      alt: product?.media?.[0]?.alt ?? null,
      is_default: true,
      sort_order: -1,
    });
  }

  return mapped;
}

function getImagesFromMedia(media: ProductMediaVM[]) {
  return media
    .filter((item) => item.kind === "image")
    .map((item) => item.url)
    .filter(Boolean);
}

function getPrimaryImage(media: ProductMediaVM[]) {
  return media.find((item) => item.kind === "image")?.url ?? "";
}

function getPrimaryImageAlt(args: {
  media: ProductMediaVM[];
  title: string;
}): string {
  const alt = s(args.media.find((item) => item.kind === "image")?.alt);
  return alt || args.title || "صورة المنتج";
}

function getHoverImage(media: ProductMediaVM[], mainImage: string) {
  const main = s(mainImage);

  return (
    media.find((item) => item.kind === "image" && item.url && item.url !== main)
      ?.url ?? null
  );
}

function readShowSaleCountdown(meta: Record<string, any>, product: any) {
  return readBool(
    firstDefined(
      product?.showSaleCountdown,
      product?.show_sale_countdown,
      meta.showSaleCountdown,
      meta.show_sale_countdown,
      meta.countdownEnabled,
      meta.countdown_enabled,
    ),
    false,
  );
}

function normalizeBadge(value: any): ProductBadgeVM | null {
  if (!value || typeof value !== "object") return null;

  const text = s(value.text);
  if (!text) return null;

  return {
    text,
    bg: s(value.bg) || "var(--mk-product-promo-bg, #000000)",
    color: s(value.color) || "#fff",
  };
}

function normalizeOptionValue(value: any): ProductCardOptionValueVM {
  const label = firstText(
    value?.label,
    value?.display_value,
    value?.displayValue,
    value?.name,
    value?.value,
  );

  const image = firstText(value?.image, value?.image_url, value?.imageUrl);

  return {
    ...value,
    id: s(value?.id) || undefined,
    name: s(value?.name) || label || undefined,
    label: label || undefined,
    value: firstText(value?.value, value?.display_value, value?.displayValue),
    display_value: value?.display_value ?? value?.displayValue ?? null,
    displayValue: value?.displayValue ?? value?.display_value ?? null,
    color: value?.color ?? null,
    image: image || null,
    image_url: image || null,
    quantity: firstDefined(value?.quantity, value?.qty) ?? null,
    qty: firstDefined(value?.qty, value?.quantity) ?? null,
    stock_quantity:
      firstDefined(value?.stock_quantity, value?.stockQuantity) ?? null,
    stockQuantity:
      firstDefined(value?.stockQuantity, value?.stock_quantity) ?? null,
    unlimited_quantity:
      firstDefined(value?.unlimited_quantity, value?.unlimitedQuantity) ?? null,
    unlimitedQuantity:
      firstDefined(value?.unlimitedQuantity, value?.unlimited_quantity) ?? null,
    metadata: isPlainObject(value?.metadata) ? value.metadata : null,
  };
}

function normalizeOptions(product: any): ProductCardOptionVM[] {
  const direct = Array.isArray(product?.options) ? product.options : [];
  const metadataOptions = Array.isArray(product?.metadata?.options)
    ? product.metadata.options
    : [];

  const source = direct.length ? direct : metadataOptions;

  return source
    .filter(Boolean)
    .map((option: any) => {
      const values = Array.isArray(option?.values)
        ? option.values.map(normalizeOptionValue)
        : [];

      return {
        ...option,
        id: s(option?.id) || undefined,
        name: s(option?.name) || s(option?.label) || undefined,
        label: s(option?.label) || s(option?.name) || undefined,
        values,
      };
    });
}

function normalizeVariants(
  product: any,
  currencies?: CurrenciesLike | null,
  productSourceCurrencyCode = "",
  tax?: ProductTaxVM | null,
): ProductCardVariantVM[] {
  const direct = Array.isArray(product?.variants) ? product.variants : [];
  const metadataVariants = Array.isArray(product?.metadata?.variants)
    ? product.metadata.variants
    : [];

  const source = direct.length ? direct : metadataVariants;
  const productTax = tax ?? normalizeProductTax({ product, tax: null });

  return source.filter(Boolean).map((variant: any) => {
    const stockQuantity = toNumOrNull(
      firstDefined(
        variant?.stock_quantity,
        variant?.stockQuantity,
        variant?.quantity,
        variant?.qty,
      ),
    );

    const unlimited = readBool(
      firstDefined(
        variant?.unlimited_quantity,
        variant?.unlimitedQuantity,
        variant?.qtyUnlimited,
        variant?.quantityUnlimited,
      ),
      false,
    );

    const optionValues = Array.isArray(variant?.option_values)
      ? variant.option_values
      : [];

    const optionValueIds = Array.from(
      new Set(
        [
          ...(Array.isArray(variant?.option_value_ids)
            ? variant.option_value_ids
            : []),
          ...(Array.isArray(variant?.optionValueIds)
            ? variant.optionValueIds
            : []),
          ...optionValues.map((value: any) => value?.id),
          ...(Array.isArray(variant?.selections)
            ? variant.selections.map(
                (selection: any) =>
                  selection?.valueId ??
                  selection?.value_id ??
                  selection?.option_value_id,
              )
            : []),
        ]
          .map((id) => s(id))
          .filter(Boolean),
      ),
    );

    const variantSourceCurrencyCode =
      normalizeCurrencyCode(
        firstDefined(
          variant?.currency_code,
          variant?.currencyCode,
          variant?.currency,
        ),
      ) ||
      normalizeCurrencyCode(productSourceCurrencyCode) ||
      getDefaultCurrencyCode(currencies);

    const rawBaseVariantPrice = toNumOrNull(variant?.price);

    const rawBaseVariantSalePrice = toNumOrNull(
      firstDefined(variant?.sale_price, variant?.salePrice),
    );

    const baseVariantPrice = applyTaxToNullableSourceAmount(
      rawBaseVariantPrice,
      productTax,
    );

    const baseVariantSalePrice = applyTaxToNullableSourceAmount(
      rawBaseVariantSalePrice,
      productTax,
    );

    const variantPrice = convertNullableMoneyAmount(
      baseVariantPrice,
      variantSourceCurrencyCode,
      currencies,
    );

    const variantSalePrice = convertNullableMoneyAmount(
      baseVariantSalePrice,
      variantSourceCurrencyCode,
      currencies,
    );

    return {
      ...variant,
      id: s(variant?.id) || undefined,

      price: variantPrice,
      sale_price: variantSalePrice,
      salePrice: variantSalePrice,

      base_price: baseVariantPrice,
      basePrice: baseVariantPrice,
      base_sale_price: baseVariantSalePrice,
      baseSalePrice: baseVariantSalePrice,

      stock_quantity: stockQuantity,
      stockQuantity,
      unlimited_quantity: unlimited,
      unlimitedQuantity: unlimited,
      is_default: readBool(
        firstDefined(variant?.is_default, variant?.isDefault),
        false,
      ),
      isDefault: readBool(
        firstDefined(variant?.isDefault, variant?.is_default),
        false,
      ),
      option_values: optionValues,
      optionValueIds,
    };
  });
}

 function isVariantSellable(variant: ProductCardVariantVM) {
  const disabled = readBoolMaybe(
    firstDefined(
      variant.disabled,
      variant.is_disabled,
      variant.isDisabled,
      variant.deleted,
      variant.is_deleted,
      variant.isDeleted,
    ),
  );

  if (disabled === true) return false;

  const active = readBoolMaybe(
    firstDefined(
      variant.active,
      variant.is_active,
      variant.isActive,
      variant.enabled,
      variant.is_enabled,
      variant.isEnabled,
    ),
  );

  if (active === false) return false;

  const status = s(
    firstDefined(
      variant.status,
      variant.stock_status,
      variant.stockStatus,
    ),
  ).toLowerCase();

  if (
    status === "disabled" ||
    status === "inactive" ||
    status === "deleted" ||
    status === "archived" ||
    status === "out_of_stock" ||
    status === "out-of-stock" ||
    status === "soldout" ||
    status === "sold_out"
  ) {
    return false;
  }

  if (variant.unlimited_quantity || variant.unlimitedQuantity) return true;

  const qty = toNumOrNull(
    firstDefined(
      variant.stock_quantity,
      variant.stockQuantity,
      variant.available_qty,
      variant.availableQty,
      variant.quantity,
      variant.qty,
    ),
  );

  if (qty !== null) return qty > 0;

  const available = readBoolMaybe(
    firstDefined(
      variant.available,
      variant.is_available,
      variant.isAvailable,
      variant.in_stock,
      variant.inStock,
    ),
  );

  if (available !== null) return available;

  return true;
}
function getVariantRegularPrice(variant: ProductCardVariantVM) {
  return toNumOrNull(
    firstDefined(
      variant.price,
      variant.basePrice,
      variant.base_price,
    ),
  );
}

function getVariantSalePrice(variant: ProductCardVariantVM) {
  return toNumOrNull(
    firstDefined(
      variant.sale_price,
      variant.salePrice,
      variant.base_sale_price,
      variant.baseSalePrice,
    ),
  );
}

function getVariantPricingRow(variant: ProductCardVariantVM) {
  const regularPrice = getVariantRegularPrice(variant);
  if (regularPrice === null || regularPrice <= 0) return null;

  const salePriceRaw = getVariantSalePrice(variant);

  const hasDiscount =
    salePriceRaw !== null &&
    salePriceRaw > 0 &&
    salePriceRaw < regularPrice;

  const price = hasDiscount ? salePriceRaw : regularPrice;
  const compareAtPrice = hasDiscount ? regularPrice : null;
  const salePrice = hasDiscount ? salePriceRaw : null;

  return {
    price,
    regularPrice,
    salePrice,
    compareAtPrice,
    hasDiscount,
  };
}

function resolvePricingWithVariants(args: {
  pricing: ReturnType<typeof readPricing>;
  options: ProductCardOptionVM[];
  variants: ProductCardVariantVM[];
}) {
  const hasVariants = Array.isArray(args.variants) && args.variants.length > 0;

if (!hasVariants) {
  return args.pricing;
}

  const sellableVariants = args.variants.filter((variant) =>
    isVariantSellable(variant),
  );

  const source = sellableVariants.length ? sellableVariants : args.variants;

  const rows = source
    .map((variant) => getVariantPricingRow(variant))
    .filter(Boolean) as Array<{
    price: number;
    regularPrice: number;
    salePrice: number | null;
    compareAtPrice: number | null;
    hasDiscount: boolean;
  }>;

  if (!rows.length) {
    return args.pricing;
  }

  rows.sort((a, b) => a.price - b.price);

  const cheapest = rows[0];

  return {
    ...args.pricing,
    price: cheapest.price,
    regularPrice: cheapest.regularPrice,
    salePrice: cheapest.salePrice,
    compareAtPrice: cheapest.compareAtPrice,
    hasDiscount: cheapest.hasDiscount,
  };
}
function readStock(product: any, variants: ProductCardVariantVM[]) {
  const rawStock =
    product?.stock && typeof product.stock === "object" ? product.stock : {};

  const quantity = toNumOrNull(
    firstDefined(
      rawStock.quantity,
      rawStock.qty,
      product?.quantity,
      product?.qty,
      product?.metadata?.stock?.quantity,
      product?.metadata?.stock?.qty,
    ),
  );

  const unlimitedQuantity = readBool(
    firstDefined(
      rawStock.unlimited_quantity,
      rawStock.unlimitedQuantity,
      product?.unlimited_quantity,
      product?.unlimitedQuantity,
      product?.metadata?.unlimited_quantity,
      product?.metadata?.unlimitedQuantity,
    ),
    false,
  );

  const hideQuantity = readBool(
    firstDefined(
      rawStock.hide_quantity,
      rawStock.hideQuantity,
      product?.hide_quantity,
      product?.hideQuantity,
      product?.metadata?.hide_quantity,
      product?.metadata?.hideQuantity,
    ),
    false,
  );

  const maximumQuantityPerOrder = toNumOrNull(
    firstDefined(
      rawStock.maximum_quantity_per_order,
      rawStock.maximumQuantityPerOrder,
      product?.maximum_quantity_per_order,
      product?.maximumQuantityPerOrder,
      product?.metadata?.maximum_quantity_per_order,
      product?.metadata?.maximumQuantityPerOrder,
    ),
  );

  const explicitOutOfStock = readBoolMaybe(
    firstDefined(
      product?.isOutOfStock,
      product?.is_out_of_stock,
      product?.seo?.in_stock === false ? true : null,
      product?.metadata?.isOutOfStock,
      product?.metadata?.is_out_of_stock,
    ),
  );

  let isOutOfStock = false;

  if (explicitOutOfStock !== null) {
    isOutOfStock = explicitOutOfStock;
  } else if (variants.length > 0) {
    isOutOfStock = !variants.some(isVariantSellable);
  } else if (!unlimitedQuantity && quantity !== null) {
    isOutOfStock = quantity <= 0;
  }

  return {
    quantity,
    unlimited_quantity: unlimitedQuantity,
    unlimitedQuantity,
    hide_quantity: hideQuantity,
    hideQuantity,
    maximum_quantity_per_order: maximumQuantityPerOrder,
    maximumQuantityPerOrder,
    isOutOfStock,
  };
}

function readBrandName(product: any, meta: Record<string, any>) {
  return (
    firstText(
      product?.brand?.name,
      product?.brand_name,
      product?.brandName,
      product?.seo?.brand_name,
      product?.seo?.brandName,
      product?.brand,
      meta.brand,
      meta.brandName,
      meta.brand_name,
    ) || null
  );
}

function readRating(product: any) {
  return toNumOrNull(
    firstDefined(
      product?.rating,
      product?.reviews_summary?.rating,
      product?.reviewsSummary?.rating,
      product?.metadata?.rating,
    ),
  );
}

function readReviewsCount(product: any) {
  return toNumOrNull(
    firstDefined(
      product?.reviewsCount,
      product?.reviews_count,
      product?.reviews_summary?.count,
      product?.reviewsSummary?.count,
      product?.metadata?.reviewsCount,
      product?.metadata?.reviews_count,
    ),
  );
}

function makeProductHref(args: { storeSlug: string; product: any }) {
  const product = args.product ?? {};
  const storePrefix = args.storeSlug ? `/${args.storeSlug}` : "";

  const directHref = firstText(product.href, product.url);
  if (directHref) return directHref;

  const publicNo = firstDefined(product.public_no, product.publicNo);

  if (publicNo) {
    return `${storePrefix}/p/${publicNo}`;
  }

  const shortUrl = firstText(
    product.short_url,
    product.shortUrl,
    product.metadata?.url,
    product.seo?.url,
  );

  if (shortUrl) {
    return `${storePrefix}/${shortUrl.replace(/^\/+/, "")}`;
  }

  return "#";
}

function normalizeCategories(product: any): ProductDetailVM["categories"] {
  const source: any[] = Array.isArray(product?.seo?.categories)
    ? product.seo.categories
    : Array.isArray(product?.categories)
      ? product.categories
      : [];

  return source
    .filter(Boolean)
    .map((category: any) => ({
      id: s(category?.id),
      publicNo: toNumOrNull(category?.public_no ?? category?.publicNo),
      name: s(category?.name),
      isPrimary:
        readBoolMaybe(category?.is_primary ?? category?.isPrimary) ?? undefined,
    }))
    .filter(
      (
        category: ProductDetailVM["categories"][number],
      ): category is ProductDetailVM["categories"][number] =>
        Boolean(category.id || category.name),
    );
}

function normalizeTags(product: any): ProductDetailVM["tags"] {
  const source: any[] = Array.isArray(product?.tags)
    ? product.tags
    : Array.isArray(product?.metadata?.tags)
      ? product.metadata.tags
      : [];

  return source
    .filter(Boolean)
    .map((tag: any) => ({
      id: s(tag?.id),
      name: s(tag?.name),
      slug: s(tag?.slug) || null,
    }))
    .filter(
      (
        tag: ProductDetailVM["tags"][number],
      ): tag is ProductDetailVM["tags"][number] =>
        Boolean(tag.id || tag.name),
    );
}

export function toProductCardVM(args: {
  storeSlug: string;
  product: any;
  currencies?: CurrenciesLike | null;
  currencyContext?: CurrenciesLike | null;
  tax?: TaxLike | null;
  taxContext?: TaxLike | null;
}): ProductCardVM {
  const product = args.product ?? {};
  const currencies = args.currencies ?? args.currencyContext ?? null;
  const taxContext = args.tax ?? args.taxContext ?? null;
  const meta = readMetadata(product);

  const title = firstText(product.name, product.title);
  const brandName = readBrandName(product, meta);

  const media = normalizeMedia(product);
  const images = getImagesFromMedia(media);

  const imageUrl = getPrimaryImage(media);
  const imageAlt = getPrimaryImageAlt({ media, title });
  const hoverImageUrl = getHoverImage(media, imageUrl);

  const tax = normalizeProductTax({
    product,
    tax: taxContext,
  });

 const productPricing = readPricing(product, currencies, tax);

const options = normalizeOptions(product);
const variants = normalizeVariants(
  product,
  currencies,
  productPricing.sourceCurrencyCode,
  tax,
);

const pricing = resolvePricingWithVariants({
  pricing: productPricing,
  options,
  variants,
});

const showSaleCountdown = readShowSaleCountdown(meta, product);
const countdownEnabled = Boolean(
  pricing.hasDiscount && pricing.saleEnd && showSaleCountdown,
);

const stock = readStock(product, variants);

  return {
    id: s(product.id),
    publicNo: toNumOrNull(firstDefined(product.public_no, product.publicNo)),
    href: makeProductHref({ storeSlug: args.storeSlug, product }),

    brand: brandName ?? "",
    brandName,
    title,

    subtitle: clip(firstDefined(meta.subtitle, product.subtitle), 58),
    promotionTitle: clip(
      firstDefined(
        meta.promotionTitle,
        meta.promotion_title,
        product.promotionTitle,
        product.promotion_title,
      ),
      34,
    ),

    metadata: Object.keys(meta).length ? meta : null,
    seo: isPlainObject(product.seo) ? product.seo : null,

    imageUrl,
    image_url: imageUrl,
    imageAlt,
    hoverImageUrl,

    images,
    media,

    price: pricing.price,
    compareAtPrice: pricing.compareAtPrice,
    regularPrice: pricing.regularPrice,
    salePrice: pricing.salePrice,

    basePrice: pricing.basePrice,
    baseRegularPrice: pricing.baseRegularPrice,
    baseSalePrice: pricing.baseSalePrice,
    baseCompareAtPrice: pricing.baseCompareAtPrice,
    baseCurrency: pricing.baseCurrency,
    baseCurrencyCode: pricing.baseCurrencyCode,
    sourceCurrencyCode: pricing.sourceCurrencyCode,

    currency: pricing.currency,
    currency_code: pricing.currency_code,
    currencyCode: pricing.currencyCode,
    currency_symbol: pricing.currency_symbol,
    currencySymbol: pricing.currencySymbol,
    currency_decimals: pricing.currency_decimals,
    currencyDecimals: pricing.currencyDecimals,
    decimal_digits: pricing.decimal_digits,
    decimalDigits: pricing.decimalDigits,

    saleEnd: pricing.saleEnd,
    showSaleCountdown,
    hasDiscount: pricing.hasDiscount,
    countdownEnabled,

    rating: readRating(product),
    reviewsCount: readReviewsCount(product),

    badge: normalizeBadge(product.badge ?? meta.badge),
    tax,

    stock: {
      quantity: stock.quantity,
      unlimited_quantity: stock.unlimited_quantity,
      unlimitedQuantity: stock.unlimitedQuantity,
      hide_quantity: stock.hide_quantity,
      hideQuantity: stock.hideQuantity,
      maximum_quantity_per_order: stock.maximum_quantity_per_order,
      maximumQuantityPerOrder: stock.maximumQuantityPerOrder,
    },

    isOutOfStock: stock.isOutOfStock,
    showDashInstead: readBool(
      firstDefined(product.showDashInstead, meta.showDashInstead),
      true,
    ),

    options,
    variants,

    raw: product,
  };
}

export function toProductDetailVM(args: {
  storeSlug: string;
  product: any;
  currencies?: CurrenciesLike | null;
  currencyContext?: CurrenciesLike | null;
  tax?: TaxLike | null;
  taxContext?: TaxLike | null;
}): ProductDetailVM {
  const currencies = args.currencies ?? args.currencyContext ?? null;
  const taxContext = args.tax ?? args.taxContext ?? null;
  const product = args.product ?? {};
  const meta = readMetadata(product);

  const card = toProductCardVM({
    ...args,
    currencies,
    tax: taxContext,
  });

  const productPricing = readPricing(product, currencies, card.tax);

const pricing = {
  ...productPricing,

  price: card.price,
  regularPrice: card.regularPrice,
  salePrice: card.salePrice,
  compareAtPrice: card.compareAtPrice,

  basePrice: card.basePrice,
  baseRegularPrice: card.baseRegularPrice,
  baseSalePrice: card.baseSalePrice,
  baseCompareAtPrice: card.baseCompareAtPrice,

  baseCurrency: card.baseCurrency,
  baseCurrencyCode: card.baseCurrencyCode,
  sourceCurrencyCode: card.sourceCurrencyCode,

  currency: card.currency,
  currency_code: card.currency_code,
  currencyCode: card.currencyCode,
  currency_symbol: card.currency_symbol,
  currencySymbol: card.currencySymbol,
  currency_decimals: card.currency_decimals,
  currencyDecimals: card.currencyDecimals,
  decimal_digits: card.decimal_digits,
  decimalDigits: card.decimalDigits,

  hasDiscount: card.hasDiscount,
  saleEnd: card.saleEnd,
};

  const imageAlts = card.media
    .filter((item) => item.kind === "image")
    .map((item) => s(item.alt) || card.title || "صورة المنتج");

  const brandName = card.brandName;

  return {
    ...card,

    name: card.title,
    descriptionHtml: String(
      firstDefined(
        meta.descriptionHtml,
        meta.description_html,
        product.descriptionHtml,
        product.description_html,
        product.description,
        "",
      ) ?? "",
    ),

    brandInfo: brandName
      ? {
          id: s(product?.brand?.id) || s(product?.brand_id) || null,
          name: brandName,
          logoUrl:
            firstText(
              product?.brand?.logo_url,
              product?.brand?.logoUrl,
              product?.brand_logo_url,
              product?.brandLogoUrl,
            ) || null,
        }
      : null,

    pricing: {
      price: pricing.price,
      regularPrice: pricing.regularPrice,
      salePrice: pricing.salePrice,
      compareAtPrice: pricing.compareAtPrice,

      basePrice: pricing.basePrice,
      baseRegularPrice: pricing.baseRegularPrice,
      baseSalePrice: pricing.baseSalePrice,
      baseCompareAtPrice: pricing.baseCompareAtPrice,
      baseCurrency: pricing.baseCurrency,
      baseCurrencyCode: pricing.baseCurrencyCode,
      sourceCurrencyCode: pricing.sourceCurrencyCode,

      currency: pricing.currency,
      currency_code: pricing.currency_code,
      currencyCode: pricing.currencyCode,
      currency_symbol: pricing.currency_symbol,
      currencySymbol: pricing.currencySymbol,
      currency_decimals: pricing.currency_decimals,
      currencyDecimals: pricing.currencyDecimals,
      decimal_digits: pricing.decimal_digits,
      decimalDigits: pricing.decimalDigits,

      hasDiscount: pricing.hasDiscount,
      saleStart: pricing.saleStart,
      saleEnd: pricing.saleEnd,
    },

    detailStock: {
      quantity: card.stock.quantity,
      unlimitedQuantity: card.stock.unlimitedQuantity,
      hideQuantity: card.stock.hideQuantity,
      maximumQuantityPerOrder: card.stock.maximumQuantityPerOrder,
      isOutOfStock: card.isOutOfStock,
    },

    imageAlts,

    categories: normalizeCategories(product),
    tags: normalizeTags(product),

    reviewsSummary: {
      rating: card.rating,
      count: card.reviewsCount,
    },
  };
}

export function toProductVM(args: {
  storeSlug: string;
  product: any;
  currencies?: CurrenciesLike | null;
  currencyContext?: CurrenciesLike | null;
  tax?: TaxLike | null;
  taxContext?: TaxLike | null;
}): ProductVM {
  return toProductDetailVM(args);
}