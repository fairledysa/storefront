// FILE: apps/storefront/src/themes/basit/app-shell/_components/SearchOverlay.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon/Icon";

type LegacyBrand = {
  name: string;
  href: string;
  img?: string | null;
};

type SearchGroupItem = {
  id?: string;
  title?: string;
  label?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  href?: string;
  url?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  img?: string | null;
  logo_url?: string | null;
  icon?: string | null;
  type?: string;
  enabled?: boolean;
  sort_order?: number;
};

type SearchGroup = {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  style?: "chips" | "circles" | "cards" | "logos" | "compact" | string;
  enabled?: boolean;
  sort_order?: number;
  items?: SearchGroupItem[];
};

type SearchProductResult = {
  id?: string;
  title?: string;
  name?: string;
  description?: string | null;
  href?: string;
  url?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  img?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;

  price?: number | string | null;
  sale_price?: number | string | null;
  salePrice?: number | string | null;
  regular_price?: number | string | null;
  regularPrice?: number | string | null;
  compare_at_price?: number | string | null;
  compareAtPrice?: number | string | null;

  currency?: string | null;
  currency_code?: string | null;
  currencyCode?: string | null;
  currency_symbol?: string | null;
  currencySymbol?: string | null;
  symbol?: string | null;

  decimal_digits?: number | string | null;
  decimalDigits?: number | string | null;
  decimals?: number | string | null;

  price_formatted?: string | null;
  priceFormatted?: string | null;
};

type SearchApiResponse = {
  suggestions?: unknown;
  items?: unknown;
  products?: unknown;
};

type CurrencyItem = {
  code: string;
  symbol: string;

  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;

  rate: number;

  decimals: number;
  decimal_digits?: number | string | null;
  decimalDigits?: number | string | null;

  is_default: boolean;
  isDefault?: boolean | null;

  enabled: boolean;
  is_enabled?: boolean | null;
};

type CurrencyRuntimeItem = {
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
  conversion_rate?: number | string | null;
  conversionRate?: number | string | null;

  decimals?: number | string | null;
  decimal_digits?: number | string | null;
  decimalDigits?: number | string | null;

  is_default?: boolean | null;
  isDefault?: boolean | null;

  enabled?: boolean | null;
  is_enabled?: boolean | null;

  metadata?: Record<string, any> | null;

  [key: string]: any;
};

type CurrencyRuntime = {
  default_code?: string | null;
  selected_cookie_name?: string | null;
  items?: CurrencyRuntimeItem[] | null;
};

type CurrencyContext = {
  defaultCode: string;
  selectedCookieName: string;
  items: CurrencyItem[];
  itemsByCode: Map<string, CurrencyItem>;
};

type Props = {
  placeholder?: string;
  groups?: SearchGroup[];
  currencies?: CurrencyRuntime | null;
  tax?: any;
  popularSearches?: Array<{ label: string; href: string }>;
  popularBrands?: LegacyBrand[];
  className?: string;
  value?: string;
  onChange?: (v: string) => void;
  onOpenChange?: (open: boolean) => void;
  triggerVariant?: "field" | "icon";
};

type NormalizedItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  icon: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
};

type NormalizedGroup = {
  id: string;
  title: string;
  description: string;
  style: string;
  enabled: boolean;
  sortOrder: number;
  items: NormalizedItem[];
};

type NormalizedProductResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  imageUrl: string;
  priceText: string;
  comparePriceText: string;
};

type SearchCacheEntry = {
  suggestions: unknown;
  rows: SearchProductResult[];
  expiresAt: number;
};

const FALLBACK_CURRENCY_COOKIE = "mk_selected_currency";
const SEARCH_DEBOUNCE_MS = 260;
const SEARCH_CACHE_TTL = 25_000;
const SEARCH_CACHE_MAX = 40;
const MAX_PRODUCTS = 8;
const MAX_SUGGESTIONS = 5;

const searchCache = new Map<string, SearchCacheEntry>();

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function codeOf(value: unknown) {
  if (value && typeof value === "object") {
    const row = value as any;
    const nested = row.code ?? row.currency_code ?? row.currencyCode;
    return codeOf(nested);
  }

  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function clampDecimals(value: unknown, fallback = 2) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(4, Math.floor(n)));
}

function positiveRate(value: unknown, fallback = 1) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toMoneyNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = s(value)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");

  if (!raw) return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeCurrencyContext(
  currencies?: CurrencyRuntime | null,
): CurrencyContext {
  const rawItems = Array.isArray(currencies?.items) ? currencies.items : [];

  const selectedCookieName =
    s(currencies?.selected_cookie_name) || FALLBACK_CURRENCY_COOKIE;

  const explicitDefault = codeOf(currencies?.default_code);

  const items = rawItems
    .map((item): CurrencyItem | null => {
      const code = codeOf(item?.code ?? item?.currency_code);
      if (!code) return null;

      const metadata =
        item?.metadata && typeof item.metadata === "object"
          ? item.metadata
          : {};

      const decimals = clampDecimals(
        item?.decimals ?? item?.decimal_digits ?? item?.decimalDigits,
        2,
      );

      const isDefault = Boolean(item?.is_default ?? item?.isDefault);

      const rate = positiveRate(
        item?.rate ??
          item?.rate_to_default ??
          item?.exchange_rate ??
          item?.exchangeRate ??
          item?.conversion_rate ??
          item?.conversionRate ??
          metadata?.rate ??
          metadata?.rate_to_default ??
          metadata?.exchange_rate ??
          metadata?.exchangeRate ??
          metadata?.conversion_rate ??
          metadata?.conversionRate,
        1,
      );

      return {
        code,
        symbol: s(item?.symbol) || code,
        name: s(item?.name) || s(item?.name_ar) || s(item?.name_en) || code,
        name_ar: s(item?.name_ar) || s(item?.name) || code,
        name_en: s(item?.name_en) || code,
        rate: isDefault ? 1 : rate,
        decimals,
        decimal_digits: decimals,
        decimalDigits: decimals,
        is_default: isDefault,
        isDefault: isDefault,
        enabled: item?.enabled !== false && item?.is_enabled !== false,
        is_enabled: item?.enabled !== false && item?.is_enabled !== false,
      };
    })
    .filter(Boolean) as CurrencyItem[];

  const defaultFromItems =
    items.find((item) => item.is_default)?.code || items[0]?.code || "";

  const defaultCode = explicitDefault || defaultFromItems || "SAR";

  let finalItems = items;

  if (!finalItems.some((item) => item.code === defaultCode)) {
    finalItems = [
      {
        code: defaultCode,
        symbol: defaultCode,
        name: defaultCode,
        name_ar: defaultCode,
        name_en: defaultCode,
        rate: 1,
        decimals: 2,
        decimal_digits: 2,
        decimalDigits: 2,
        is_default: true,
        isDefault: true,
        enabled: true,
        is_enabled: true,
      },
      ...finalItems,
    ];
  }

  finalItems = finalItems.map((item) => ({
    ...item,
    rate: item.code === defaultCode ? 1 : positiveRate(item.rate, 1),
    is_default: item.code === defaultCode,
    isDefault: item.code === defaultCode,
    enabled: item.code === defaultCode ? true : item.enabled,
    is_enabled: item.code === defaultCode ? true : item.enabled,
  }));

  const itemsByCode = new Map<string, CurrencyItem>();

  finalItems.forEach((item) => {
    itemsByCode.set(item.code, item);
  });

  return {
    defaultCode,
    selectedCookieName,
    items: finalItems,
    itemsByCode,
  };
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";

  const target = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");

  for (const part of parts) {
    const item = part.trim();

    if (item.startsWith(target)) {
      return decodeURIComponent(item.slice(target.length));
    }
  }

  return "";
}

function readLocalStorage(key: string) {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function readSelectedCurrencyCode(ctx: CurrencyContext) {
  const candidates = [
    readLocalStorage(ctx.selectedCookieName),
    readCookie(ctx.selectedCookieName),

    readLocalStorage("mk_selected_currency"),
    readCookie("mk_selected_currency"),

    readLocalStorage("mk_currency"),
    readCookie("mk_currency"),

    readLocalStorage("malak_currency"),
    readCookie("malak_currency"),

    readLocalStorage("currency"),
    readCookie("currency"),
  ];

  for (const value of candidates) {
    const code = codeOf(value);
    if (!code) continue;

    const item = ctx.itemsByCode.get(code);
    if (item?.enabled) return code;
  }

  return ctx.defaultCode;
}

function readCurrencyFromEvent(event: Event) {
  const detail = (event as CustomEvent<any>).detail || {};

  return codeOf(
    detail.currency ||
      detail.currency_code ||
      detail.currencyCode ||
      detail.code ||
      detail.selectedCurrency ||
      detail.selected_currency,
  );
}

function useCurrencyRuntime(currencies?: CurrencyRuntime | null) {
  const ctx = useMemo(() => normalizeCurrencyContext(currencies), [currencies]);

  const [selectedCode, setSelectedCode] = useState(() =>
    typeof window === "undefined" ? ctx.defaultCode : readSelectedCurrencyCode(ctx),
  );

  useEffect(() => {
    function sync() {
      setSelectedCode(readSelectedCurrencyCode(ctx));
    }

    function onCurrencyEvent(event: Event) {
      const nextCode = readCurrencyFromEvent(event);

      if (nextCode && ctx.itemsByCode.get(nextCode)?.enabled) {
        setSelectedCode(nextCode);
        return;
      }

      sync();
    }

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("currency:changed", onCurrencyEvent as EventListener);
    window.addEventListener("currency-changed", onCurrencyEvent as EventListener);
    window.addEventListener("mk:currency:changed", onCurrencyEvent as EventListener);
    window.addEventListener("mk:currency-changed", onCurrencyEvent as EventListener);
    window.addEventListener(
      "malak:currency:changed",
      onCurrencyEvent as EventListener,
    );
    window.addEventListener(
      "malak:currency-changed",
      onCurrencyEvent as EventListener,
    );

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(
        "currency:changed",
        onCurrencyEvent as EventListener,
      );
      window.removeEventListener(
        "currency-changed",
        onCurrencyEvent as EventListener,
      );
      window.removeEventListener(
        "mk:currency:changed",
        onCurrencyEvent as EventListener,
      );
      window.removeEventListener(
        "mk:currency-changed",
        onCurrencyEvent as EventListener,
      );
      window.removeEventListener(
        "malak:currency:changed",
        onCurrencyEvent as EventListener,
      );
      window.removeEventListener(
        "malak:currency-changed",
        onCurrencyEvent as EventListener,
      );
    };
  }, [ctx]);

  const selectedCurrency =
    ctx.itemsByCode.get(selectedCode) ||
    ctx.itemsByCode.get(ctx.defaultCode) ||
    ctx.items[0] ||
    null;

  return {
    currencyContext: ctx,
    selectedCurrencyCode: selectedCurrency?.code || ctx.defaultCode,
    selectedCurrency,
  };
}

function convertMoney(args: {
  amount: unknown;
  sourceCode?: string | null;
  targetCode: string;
  ctx: CurrencyContext;
}) {
  const amount = toMoneyNumber(args.amount);
  if (amount == null || amount <= 0) return null;

  const defaultCode = args.ctx.defaultCode;
  const sourceCode = codeOf(args.sourceCode) || defaultCode;
  const targetCode = codeOf(args.targetCode) || defaultCode;

  const source =
    args.ctx.itemsByCode.get(sourceCode) ||
    args.ctx.itemsByCode.get(defaultCode);

  const target =
    args.ctx.itemsByCode.get(targetCode) ||
    args.ctx.itemsByCode.get(defaultCode) ||
    source;

  if (!source || !target) {
    return {
      amount,
      currency: {
        code: sourceCode,
        symbol: sourceCode,
        decimals: 2,
      },
    };
  }

  const sourceRate = source.code === defaultCode ? 1 : positiveRate(source.rate, 1);
  const targetRate = target.code === defaultCode ? 1 : positiveRate(target.rate, 1);

  const amountInDefault =
    source.code === defaultCode ? amount : amount * sourceRate;

  const converted =
    target.code === defaultCode ? amountInDefault : amountInDefault / targetRate;

  return {
    amount: converted,
    currency: target,
  };
}

function formatMoneyWithCurrency(args: {
  amount: unknown;
  sourceCode?: string | null;
  targetCode: string;
  ctx: CurrencyContext;
}) {
  const converted = convertMoney(args);
  if (!converted) return "";

  const currency = converted.currency as any;

  const decimals = clampDecimals(
    currency.decimals ?? currency.decimal_digits ?? currency.decimalDigits,
    2,
  );

  const formatted = new Intl.NumberFormat("ar-SA-u-nu-latn", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(converted.amount);

  const symbol = s(currency.symbol) || s(currency.code);

  return `${symbol} ${formatted}`.trim();
}

function getProductCurrencyCode(row: SearchProductResult) {
  return (
    codeOf(row.currency_code) ||
    codeOf(row.currencyCode) ||
    codeOf(row.currency) ||
    ""
  );
}

function buildSearchHref(query: string) {
  const q = s(query);

  if (!q) return "/search";

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("sort", "newest");

  return `/search?${params.toString()}`;
}

function normalizeHref(value: unknown, fallbackQuery = "") {
  const href = s(value);

  if (!href) return buildSearchHref(fallbackQuery);

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("whatsapp:")
  ) {
    return href;
  }

  return `/${href}`;
}

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("whatsapp:")
  );
}

function getProductPrice(row: SearchProductResult) {
  const sale = toMoneyNumber(row.sale_price ?? row.salePrice);

  if (sale != null && sale > 0) return sale;

  const price = toMoneyNumber(row.price);

  if (price != null && price > 0) return price;

  const regular = toMoneyNumber(row.regular_price ?? row.regularPrice);

  if (regular != null && regular > 0) return regular;

  return null;
}

function getProductComparePrice(
  row: SearchProductResult,
  finalPrice: number | null,
) {
  const compare =
    toMoneyNumber(row.compare_at_price) ??
    toMoneyNumber(row.compareAtPrice) ??
    toMoneyNumber(row.regular_price) ??
    toMoneyNumber(row.regularPrice);

  if (compare != null && finalPrice != null && compare > finalPrice) {
    return compare;
  }

  const price = toMoneyNumber(row.price);
  const sale = toMoneyNumber(row.sale_price ?? row.salePrice);

  if (price != null && sale != null && price > sale) {
    return price;
  }

  return null;
}

function normalizeProductResult(
  row: SearchProductResult,
  index: number,
  ctx: CurrencyContext,
  selectedCurrencyCode: string,
): NormalizedProductResult | null {
  const title = s(row.title) || s(row.name);
  const description = s(row.description);

  const imageUrl =
    s(row.image_url) ||
    s(row.imageUrl) ||
    s(row.img) ||
    s(row.thumbnail_url) ||
    s(row.thumbnailUrl);

  const href = normalizeHref(s(row.href) || s(row.url), title);
  const id = s(row.id) || `search-product-${index + 1}`;

  if (!id || !title || !href) return null;

  const finalPrice = getProductPrice(row);
  const comparePrice = getProductComparePrice(row, finalPrice);
  const sourceCode = getProductCurrencyCode(row) || ctx.defaultCode;

  const priceText = formatMoneyWithCurrency({
    amount: finalPrice,
    sourceCode,
    targetCode: selectedCurrencyCode,
    ctx,
  });

  const comparePriceText = formatMoneyWithCurrency({
    amount: comparePrice,
    sourceCode,
    targetCode: selectedCurrencyCode,
    ctx,
  });

  return {
    id,
    title,
    description,
    href,
    imageUrl,
    priceText,
    comparePriceText,
  };
}

function normalizeSuggestions(
  source: unknown,
  query: string,
  products: NormalizedProductResult[],
) {
  const out = new Set<string>();

  function add(value: unknown) {
    const text = s(value);
    if (!text) return;
    out.add(text);
  }

  if (Array.isArray(source)) {
    source.forEach((item) => {
      if (typeof item === "string") {
        add(item);
        return;
      }

      const row = item as any;

      add(
        row?.title ||
          row?.label ||
          row?.name ||
          row?.query ||
          row?.keyword ||
          row?.text,
      );
    });
  }

  add(query);

  for (const product of products) {
    if (out.size >= MAX_SUGGESTIONS) break;
    add(product.title);
  }

  return Array.from(out).slice(0, MAX_SUGGESTIONS);
}

function normalizeItem(
  row: SearchGroupItem,
  index: number,
): NormalizedItem | null {
  const title = s(row.title) || s(row.label) || s(row.name);
  const subtitle = s(row.subtitle) || s(row.description);

  const imageUrl =
    s(row.image_url) || s(row.imageUrl) || s(row.img) || s(row.logo_url);

  const icon = s(row.icon);
  const href = normalizeHref(s(row.href) || s(row.url), title);

  if (!title && !imageUrl && !icon) return null;
  if (!href) return null;

  return {
    id: s(row.id) || `search-item-${index + 1}`,
    title,
    subtitle,
    href,
    imageUrl,
    icon,
    type: s(row.type) || "keyword",
    enabled: row.enabled !== false,
    sortOrder: safeNumber(row.sort_order, index),
  };
}

function normalizeGroupsFromAdmin(groups?: SearchGroup[]) {
  if (!Array.isArray(groups)) return [];

  return groups
    .map((group, groupIndex): NormalizedGroup | null => {
      const rawItems = Array.isArray(group.items) ? group.items : [];

      const items = rawItems
        .map((item, itemIndex) => normalizeItem(item, itemIndex))
        .filter(Boolean) as NormalizedItem[];

      const cleanItems = items
        .filter((item) => item.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      if (!cleanItems.length) return null;

      return {
        id: s(group.id) || `search-group-${groupIndex + 1}`,
        title: s(group.title) || s(group.name) || "مجموعة بحث",
        description: s(group.description),
        style: s(group.style) || "chips",
        enabled: group.enabled !== false,
        sortOrder: safeNumber(group.sort_order, groupIndex),
        items: cleanItems,
      };
    })
    .filter(Boolean)
    .filter((group) => (group as NormalizedGroup).enabled)
    .sort(
      (a, b) =>
        (a as NormalizedGroup).sortOrder - (b as NormalizedGroup).sortOrder,
    ) as NormalizedGroup[];
}

function normalizeLegacyGroups(args: {
  popularSearches?: Array<{ label: string; href: string }>;
  popularBrands?: LegacyBrand[];
}) {
  const groups: NormalizedGroup[] = [];

  if (Array.isArray(args.popularSearches) && args.popularSearches.length) {
    const searchItems: NormalizedItem[] = args.popularSearches
      .map((item, index) => ({
        id: `legacy-search-${index + 1}`,
        title: s(item.label),
        subtitle: "",
        href: normalizeHref(item.href, item.label),
        imageUrl: "",
        icon: "",
        type: "keyword",
        enabled: true,
        sortOrder: index,
      }))
      .filter((item) => item.title && item.href);

    if (searchItems.length) {
      groups.push({
        id: "legacy-popular-searches",
        title: "عمليات البحث الشعبية",
        description: "",
        style: "chips",
        enabled: true,
        sortOrder: 10,
        items: searchItems,
      });
    }
  }

  if (Array.isArray(args.popularBrands) && args.popularBrands.length) {
    const brandItems: NormalizedItem[] = args.popularBrands
      .map((brand, index) => ({
        id: `legacy-brand-${index + 1}`,
        title: s(brand.name),
        subtitle: "",
        href: normalizeHref(brand.href, brand.name),
        imageUrl: s(brand.img),
        icon: "",
        type: "brand",
        enabled: true,
        sortOrder: index,
      }))
      .filter((item) => item.title && item.href);

    if (brandItems.length) {
      groups.push({
        id: "legacy-popular-brands",
        title: "العلامات التجارية الشعبية",
        description: "",
        style: "circles",
        enabled: true,
        sortOrder: 20,
        items: brandItems,
      });
    }
  }

  return groups;
}

function shouldRenderCircleGroup(group: NormalizedGroup) {
  if (group.style === "circles" || group.style === "logos") return true;

  return group.items.some((item) => {
    return item.imageUrl || item.type === "brand";
  });
}

function shouldRenderCardsGroup(group: NormalizedGroup) {
  return group.style === "cards";
}

function renderHighlighted(text: string, query: string): ReactNode {
  const cleanText = s(text);
  const cleanQuery = s(query);

  if (!cleanText || !cleanQuery) return cleanText;

  const source = cleanText.toLowerCase();
  const target = cleanQuery.toLowerCase();
  const index = source.indexOf(target);

  if (index < 0) return cleanText;

  const before = cleanText.slice(0, index);
  const match = cleanText.slice(index, index + cleanQuery.length);
  const after = cleanText.slice(index + cleanQuery.length);

  return (
    <>
      {before}
      <strong>{match}</strong>
      {after}
    </>
  );
}

function SmartSearchLink({
  href,
  className,
  title,
  onNavigate,
  children,
}: {
  href: string;
  className: string;
  title?: string;
  onNavigate: () => void;
  children: ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        className={className}
        title={title}
        target="_blank"
        rel="noreferrer"
        onClick={onNavigate}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      title={title}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

function SearchItem({
  item,
  mode,
  onNavigate,
}: {
  item: NormalizedItem;
  mode: "chip" | "circle" | "card";
  onNavigate: () => void;
}) {
  if (mode === "circle") {
    return (
      <SmartSearchLink
        href={item.href}
        onNavigate={onNavigate}
        className="mk-desktop-search__brand"
        title={item.title}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="mk-desktop-search__brandImg"
            loading="lazy"
            decoding="async"
          />
        ) : item.icon ? (
          <span className="mk-desktop-search__brandIcon" aria-hidden="true">
            <Icon icon={item.icon as any} size={20} />
          </span>
        ) : (
          <span className="mk-desktop-search__brandText">{item.title}</span>
        )}
      </SmartSearchLink>
    );
  }

  if (mode === "card") {
    return (
      <SmartSearchLink
        href={item.href}
        onNavigate={onNavigate}
        className="mk-desktop-search__cardItem"
        title={item.title}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="mk-desktop-search__cardImg"
            loading="lazy"
            decoding="async"
          />
        ) : item.icon ? (
          <span className="mk-desktop-search__cardIcon" aria-hidden="true">
            <Icon icon={item.icon as any} size={18} />
          </span>
        ) : null}

        <span className="mk-desktop-search__cardText">
          <span>{item.title}</span>
          {item.subtitle ? <small>{item.subtitle}</small> : null}
        </span>
      </SmartSearchLink>
    );
  }

  return (
    <SmartSearchLink
      href={item.href}
      onNavigate={onNavigate}
      className="mk-desktop-search__chip"
      title={item.subtitle || item.title}
    >
      {item.title}
    </SmartSearchLink>
  );
}

function ProductResultItem({
  item,
  onNavigate,
}: {
  item: NormalizedProductResult;
  onNavigate: () => void;
}) {
  return (
    <SmartSearchLink
      href={item.href}
      onNavigate={onNavigate}
      className="mk-desktop-search__plainProduct"
      title={item.title}
    >
      <span className="mk-desktop-search__plainProductImageBox">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="mk-desktop-search__plainProductImage"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="mk-desktop-search__plainProductImageFallback">
            <Icon icon="ShoppingBag03" size={18} />
          </span>
        )}
      </span>

      <span className="mk-desktop-search__plainProductBody">
        <span className="mk-desktop-search__plainProductTitle">
          {item.title}
        </span>

        {item.description ? (
          <span className="mk-desktop-search__plainProductDesc">
            {item.description}
          </span>
        ) : null}
      </span>

      <span className="mk-desktop-search__plainProductPriceBox" dir="ltr">
        {item.comparePriceText ? (
          <span className="mk-desktop-search__plainProductCompare">
            {item.comparePriceText}
          </span>
        ) : null}

        {item.priceText ? (
          <span className="mk-desktop-search__plainProductPrice">
            {item.priceText}
          </span>
        ) : null}
      </span>
    </SmartSearchLink>
  );
}

function getCachedSearch(query: string) {
  const key = s(query).toLowerCase();
  if (!key) return null;

  const cached = searchCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }

  return cached;
}

function setCachedSearch(query: string, entry: Omit<SearchCacheEntry, "expiresAt">) {
  const key = s(query).toLowerCase();
  if (!key) return;

  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }

  searchCache.set(key, {
    ...entry,
    expiresAt: Date.now() + SEARCH_CACHE_TTL,
  });
}

export default function SearchOverlay({
  placeholder = "مالذي تبحث عنه ؟",
  groups,
  currencies,
  tax,
  popularSearches,
  popularBrands,
  className = "",
  value,
  onChange,
  onOpenChange,
  triggerVariant = "field",
}: Props) {
  const router = useRouter();

  void tax;

  const { currencyContext, selectedCurrencyCode } =
    useCurrencyRuntime(currencies);

  const [open, _setOpen] = useState(false);
  const [local, setLocal] = useState("");

  const [apiSuggestions, setApiSuggestions] = useState<unknown>([]);
  const [rawProductRows, setRawProductRows] = useState<SearchProductResult[]>(
    [],
  );

  const [productLoading, setProductLoading] = useState(false);
  const [productReady, setProductReady] = useState(false);

  const inputValue = value ?? local;
  const query = s(inputValue);
  const shouldShowProductSearch = query.length >= 2;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestQueryRef = useRef("");

  const finalGroups = useMemo(() => {
    if (Array.isArray(groups)) {
      return normalizeGroupsFromAdmin(groups);
    }

    return normalizeLegacyGroups({
      popularSearches,
      popularBrands,
    });
  }, [groups, popularSearches, popularBrands]);

  const productResults = useMemo(() => {
    if (!shouldShowProductSearch) return [];

    return rawProductRows
      .slice(0, MAX_PRODUCTS)
      .map((row, index) =>
        normalizeProductResult(
          row,
          index,
          currencyContext,
          selectedCurrencyCode,
        ),
      )
      .filter(Boolean) as NormalizedProductResult[];
  }, [
    rawProductRows,
    shouldShowProductSearch,
    currencyContext,
    selectedCurrencyCode,
  ]);

  const liveSuggestions = useMemo(() => {
    if (!shouldShowProductSearch) return [];
    return normalizeSuggestions(apiSuggestions, query, productResults);
  }, [apiSuggestions, query, productResults, shouldShowProductSearch]);

  function setOpen(v: boolean) {
    _setOpen(v);
    onOpenChange?.(v);
  }

  function setInputValue(v: string) {
    if (onChange) onChange(v);
    else setLocal(v);
  }

  function getCurrentQuery() {
    return s(inputRef.current?.value ?? inputValue);
  }

  function goToSearch(queryValue?: string) {
    const href = buildSearchHref(queryValue ?? getCurrentQuery());

    setOpen(false);
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    goToSearch();
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    event.stopPropagation();

    goToSearch(event.currentTarget.value);
  }

  useEffect(() => {
    if (value !== undefined) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const currentQuery = s(params.get("q"));

    if (currentQuery) setLocal(currentQuery);
  }, [value]);

  useEffect(() => {
    function handleSearchOpen() {
      setOpen(true);
    }

    window.addEventListener("mk:search:open", handleSearchOpen);

    return () => {
      window.removeEventListener("mk:search:open", handleSearchOpen);
    };
  }, []);

  useEffect(() => {
    if (!open || !shouldShowProductSearch) {
      latestQueryRef.current = "";
      setApiSuggestions([]);
      setRawProductRows([]);
      setProductLoading(false);
      setProductReady(false);
      return;
    }

    const cached = getCachedSearch(query);

    if (cached) {
      latestQueryRef.current = query;
      setApiSuggestions(cached.suggestions);
      setRawProductRows(cached.rows);
      setProductLoading(false);
      setProductReady(true);
      return;
    }

    const controller = new AbortController();
    latestQueryRef.current = query;

    setProductLoading(true);
    setProductReady(false);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", query);

        const res = await fetch(`/api/search?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        const json: SearchApiResponse = await res.json().catch(() => ({}));

        if (controller.signal.aborted) return;
        if (latestQueryRef.current !== query) return;

        const rows = Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.products)
            ? json.products
            : [];

        const nextRows = (rows as SearchProductResult[]).slice(0, MAX_PRODUCTS);
        const nextSuggestions = json?.suggestions ?? [];

        setCachedSearch(query, {
          suggestions: nextSuggestions,
          rows: nextRows,
        });

        setRawProductRows(nextRows);
        setApiSuggestions(nextSuggestions);
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setApiSuggestions([]);
          setRawProductRows([]);
        }
      } finally {
        if (!controller.signal.aborted && latestQueryRef.current === query) {
          setProductLoading(false);
          setProductReady(true);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, shouldShowProductSearch, query]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onClickOutside(event: MouseEvent) {
      if (!open) return;

      const root = rootRef.current;
      if (!root) return;

      if (!root.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={["mk-desktop-search", className].filter(Boolean).join(" ")}
      data-open={open ? "true" : "false"}
      data-has-query={shouldShowProductSearch ? "true" : "false"}
    >
      {open ? (
        <button
          type="button"
          aria-label="إغلاق البحث"
          onClick={() => setOpen(false)}
          className="mk-desktop-search__overlay"
        />
      ) : null}

      {triggerVariant === "icon" && !open ? (
        <button
          type="button"
          className="mk-desktop-search__iconTrigger"
          aria-label="فتح البحث"
          title="بحث"
          onClick={() => setOpen(true)}
        >
          <Icon icon="Search01" size={21} />
        </button>
      ) : null}

      <div
        className={[
          "mk-desktop-search__box",
          triggerVariant === "icon" ? "mk-desktop-search__box--iconTrigger" : "",
        ].filter(Boolean).join(" ")}
      >
        <form
          className="mk-desktop-search__bar"
          action="/search"
          method="get"
          onSubmit={handleSubmit}
          role="search"
        >
          <div className="mk-desktop-search__inputWrap">
            <input
              ref={inputRef}
              type="text"
              name="q"
              placeholder={placeholder}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setOpen(true)}
              className="mk-desktop-search__input"
              autoComplete="off"
              aria-label="البحث في المتجر"
            />

            <input type="hidden" name="sort" value="newest" />

            <button
              type="button"
              className="mk-desktop-search__icon"
              aria-label="بحث"
              title="بحث"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToSearch();
              }}
            >
              <Icon icon="Search01" size={18} />
            </button>

            {open ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mk-desktop-search__close"
                aria-label="إغلاق البحث"
                title="إغلاق"
              >
                ×
              </button>
            ) : null}
          </div>
        </form>

        {open && (shouldShowProductSearch || finalGroups.length > 0) ? (
          <div className="mk-desktop-search__dropdown">
            <div className="mk-desktop-search__content">
              {shouldShowProductSearch ? (
                <div className="mk-desktop-search__plainLive">
                  <section className="mk-desktop-search__plainSection">
                    <div className="mk-desktop-search__plainTitle">
                      اقتراحات
                    </div>

                    {productLoading && !liveSuggestions.length ? (
                      <div className="mk-desktop-search__plainState">
                        جاري البحث...
                      </div>
                    ) : liveSuggestions.length > 0 ? (
                      <div className="mk-desktop-search__plainSuggestionList">
                        {liveSuggestions.map((item, index) => (
                          <button
                            key={`${item}-${index}`}
                            type="button"
                            className="mk-desktop-search__plainSuggestion"
                            onClick={() => goToSearch(item)}
                          >
                            <span
                              className="mk-desktop-search__plainSuggestionIcon"
                              aria-hidden="true"
                            >
                              <Icon icon="Search01" size={16} />
                            </span>

                            <span className="mk-desktop-search__plainSuggestionText">
                              {renderHighlighted(item, query)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : productReady ? (
                      <div className="mk-desktop-search__plainState">
                        لا توجد اقتراحات
                      </div>
                    ) : null}
                  </section>

                  <section className="mk-desktop-search__plainSection">
                    <div className="mk-desktop-search__plainTitle">منتجات</div>

                    {productLoading && !productResults.length ? (
                      <div className="mk-desktop-search__plainState">
                        جاري تحميل المنتجات...
                      </div>
                    ) : productResults.length > 0 ? (
                      <div className="mk-desktop-search__plainProductList">
                        {productResults.map((item) => (
                          <ProductResultItem
                            key={item.id}
                            item={item}
                            onNavigate={() => setOpen(false)}
                          />
                        ))}
                      </div>
                    ) : productReady ? (
                      <div className="mk-desktop-search__plainState">
                        لا توجد منتجات مطابقة
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : (
                <div className="mk-desktop-search__groups">
                  {finalGroups.map((group) => {
                    const mode = shouldRenderCircleGroup(group)
                      ? "circle"
                      : shouldRenderCardsGroup(group)
                        ? "card"
                        : "chip";

                    return (
                      <section
                        key={group.id}
                        className="mk-desktop-search__group"
                      >
                        <div className="mk-desktop-search__title">
                          {group.title}
                        </div>

                        {group.description ? (
                          <div className="mk-desktop-search__desc">
                            {group.description}
                          </div>
                        ) : null}

                        <div
                          className={
                            mode === "circle"
                              ? "mk-desktop-search__brands"
                              : mode === "card"
                                ? "mk-desktop-search__cards"
                                : "mk-desktop-search__chips"
                          }
                        >
                          {group.items.map((item) => (
                            <SearchItem
                              key={item.id}
                              item={item}
                              mode={mode}
                              onNavigate={() => setOpen(false)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
