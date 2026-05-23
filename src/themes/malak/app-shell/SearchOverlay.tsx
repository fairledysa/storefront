// FILE: apps/storefront/src/themes/malak/app-shell/SearchOverlay.tsx
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
import { toProductCardVM } from "@/data/viewmodels/product.vm";

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
};

type SearchApiResponse = {
  suggestions?: unknown;
  items?: unknown;
  products?: unknown;
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
};

type CurrencyRuntime = {
  default_code?: string | null;
  active_code?: string | null;
  selected_code?: string | null;
  selected_cookie_name?: string | null;
  items?: CurrencyRuntimeItem[] | null;
};

type CurrencyItem = {
  code: string;
  symbol: string;
  name: string;
  name_ar: string;
  name_en: string | null;
  rate: number;
  decimals: number;
  is_default: boolean;
  enabled: boolean;
};

type CurrencyContext = {
  defaultCode: string;
  selectedCookieName: string;
  items: CurrencyItem[];
  itemsByCode: Map<string, CurrencyItem>;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  placeholder?: string;
  groups?: SearchGroup[];
  currencies?: CurrencyRuntime | null;
  tax?: any;
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

const FALLBACK_CURRENCY_COOKIE = "mk_selected_currency";

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
    return codeOf(row.code ?? row.currency_code ?? row.currencyCode);
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

      const enabled = item?.enabled !== false && item?.is_enabled !== false;

      return {
        code,
        symbol: s(item?.symbol) || code,
        name: s(item?.name) || s(item?.name_ar) || s(item?.name_en) || code,
        name_ar: s(item?.name_ar) || s(item?.name) || code,
        name_en: s(item?.name_en) || null,
        rate: isDefault ? 1 : rate,
        decimals,
        is_default: isDefault,
        enabled,
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
        name_en: null,
        rate: 1,
        decimals: 2,
        is_default: true,
        enabled: true,
      },
      ...finalItems,
    ];
  }

  finalItems = finalItems.map((item) => ({
    ...item,
    rate: item.code === defaultCode ? 1 : positiveRate(item.rate, 1),
    is_default: item.code === defaultCode,
    enabled: item.code === defaultCode ? true : item.enabled,
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
    window.addEventListener("focus", sync);
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
      window.removeEventListener("focus", sync);
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
  };
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

function getProductCurrencyCode(row: SearchProductResult) {
  return (
    codeOf(row.currency_code) ||
    codeOf(row.currencyCode) ||
    codeOf(row.currency) ||
    ""
  );
}

function normalizeProductResult(
  row: SearchProductResult,
  index: number,
  ctx: CurrencyContext,
  selectedCurrencyCode: string,
  tax?: any,
): NormalizedProductResult | null {
  const currencyCode = getProductCurrencyCode(row) || ctx.defaultCode;

  const rowPrice = toMoneyNumber(row.price);
  const rowRegular =
    toMoneyNumber(row.regular_price) ??
    toMoneyNumber(row.regularPrice) ??
    rowPrice ??
    0;

  const rowSale =
    toMoneyNumber(row.sale_price) ?? toMoneyNumber(row.salePrice) ?? null;

  const imageUrl =
    s(row.image_url) ||
    s(row.imageUrl) ||
    s(row.img) ||
    s(row.thumbnail_url) ||
    s(row.thumbnailUrl);

  const href = s(row.href) || s(row.url);

  const productForVm = {
    ...row,

    title: s(row.title) || s(row.name),
    name: s(row.name) || s(row.title),

    href,
    url: href,
    image_url: imageUrl,
    imageUrl,
    thumbnail_url: imageUrl,
    thumbnailUrl: imageUrl,

    price: rowRegular,
    regular_price: rowRegular,
    regularPrice: rowRegular,

    sale_price: rowSale,
    salePrice: rowSale,

    currency: currencyCode,
    currency_code: currencyCode,
    currencyCode,

    currency_symbol:
      s(row.currency_symbol) ||
      s(row.currencySymbol) ||
      s(row.symbol) ||
      currencyCode,

    currencySymbol:
      s(row.currencySymbol) ||
      s(row.currency_symbol) ||
      s(row.symbol) ||
      currencyCode,

    decimal_digits: row.decimal_digits ?? row.decimalDigits ?? row.decimals ?? 2,

    decimalDigits: row.decimalDigits ?? row.decimal_digits ?? row.decimals ?? 2,

    pricing: {
      price: rowRegular,
      regular_price: rowRegular,
      regularPrice: rowRegular,

      sale_price: rowSale,
      salePrice: rowSale,

      currency: currencyCode,
      currency_code: currencyCode,
      currencyCode,

      currency_symbol:
        s(row.currency_symbol) ||
        s(row.currencySymbol) ||
        s(row.symbol) ||
        currencyCode,

      currencySymbol:
        s(row.currencySymbol) ||
        s(row.currency_symbol) ||
        s(row.symbol) ||
        currencyCode,

      decimal_digits:
        row.decimal_digits ?? row.decimalDigits ?? row.decimals ?? 2,

      decimalDigits:
        row.decimalDigits ?? row.decimal_digits ?? row.decimals ?? 2,
    },
  };

  const vmCurrencies = {
    default_code: ctx.defaultCode,
    active_code: selectedCurrencyCode,
    selected_code: selectedCurrencyCode,
    selectedCurrencyCode,
    items: ctx.items.map((item) => ({
      code: item.code,
      currency_code: item.code,
      currencyCode: item.code,
      symbol: item.symbol,
      name: item.name,
      name_ar: item.name_ar,
      name_en: item.name_en,
      rate: item.rate,
      rate_to_default: item.rate,
      exchange_rate: item.rate,
      exchangeRate: item.rate,
      decimal_digits: item.decimals,
      decimalDigits: item.decimals,
      is_default: item.code === ctx.defaultCode,
      isDefault: item.code === ctx.defaultCode,
      enabled: item.enabled,
      is_enabled: item.enabled,
    })),
  };

  const vm = toProductCardVM({
    storeSlug: "",
    currencies: vmCurrencies as any,
    tax,
    product: productForVm,
  } as any);

  const id = s(vm.id) || s(row.id) || `search-product-${index + 1}`;
  const title = s(vm.title) || s(row.title) || s(row.name);
  const description = s(row.description);

  const finalHref = s(vm.href) && s(vm.href) !== "#" ? s(vm.href) : href;

  if (!id || !title || !finalHref) return null;

  const decimals = clampDecimals((vm as any).currencyDecimals, 2);
  const priceValue = Number((vm as any).price ?? 0);
  const compareValue = Number((vm as any).compareAtPrice ?? 0);
  const symbol = s((vm as any).currencySymbol);

  const priceText =
    priceValue > 0
      ? `${symbol} ${new Intl.NumberFormat("ar-SA", {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        }).format(priceValue)}`.trim()
      : "";

  const comparePriceText =
    compareValue > priceValue
      ? `${symbol} ${new Intl.NumberFormat("ar-SA", {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        }).format(compareValue)}`.trim()
      : "";

  return {
    id,
    title,
    description,
    href: normalizeHref(finalHref),
    imageUrl: s((vm as any).imageUrl) || imageUrl,
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
    if (out.size >= 5) break;
    add(product.title);
  }

  return Array.from(out).slice(0, 5);
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

function shouldRenderVisualGroup(group: NormalizedGroup) {
  if (group.style === "circles" || group.style === "logos") return true;

  return group.items.some((item) => item.imageUrl || item.type === "brand");
}

function shouldRenderCardsGroup(group: NormalizedGroup) {
  return group.style === "cards";
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
    <Link href={href} className={className} title={title} onClick={onNavigate}>
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
  mode: "chip" | "visual" | "card";
  onNavigate: () => void;
}) {
  if (mode === "visual") {
    return (
      <SmartSearchLink
        href={item.href}
        onNavigate={onNavigate}
        className="mk-search-ov__visual"
        title={item.title}
      >
        <span className="mk-search-ov__visualMedia">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="mk-search-ov__visualImg"
              loading="lazy"
              decoding="async"
            />
          ) : item.icon ? (
            <Icon icon={item.icon as any} size={18} />
          ) : (
            <Icon icon="Search01" size={17} />
          )}
        </span>

        <span className="mk-search-ov__visualText">
          <b>{item.title}</b>
          {item.subtitle ? <small>{item.subtitle}</small> : null}
        </span>
      </SmartSearchLink>
    );
  }

  if (mode === "card") {
    return (
      <SmartSearchLink
        href={item.href}
        onNavigate={onNavigate}
        className="mk-search-ov__card"
        title={item.title}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="mk-search-ov__cardImg"
            loading="lazy"
            decoding="async"
          />
        ) : item.icon ? (
          <span className="mk-search-ov__cardIcon" aria-hidden="true">
            <Icon icon={item.icon as any} size={18} />
          </span>
        ) : (
          <span className="mk-search-ov__cardIcon" aria-hidden="true">
            <Icon icon="Search01" size={17} />
          </span>
        )}

        <span className="mk-search-ov__cardText">
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
      className="mk-search-ov__chip"
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
      className="mk-search-ov__product"
      title={item.title}
    >
      <span className="mk-search-ov__productImageBox">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="mk-search-ov__productImage"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="mk-search-ov__productImageFallback">
            <Icon icon="ShoppingBag03" size={18} />
          </span>
        )}
      </span>

      <span className="mk-search-ov__productBody">
        <span className="mk-search-ov__productTitle">{item.title}</span>

        {item.description ? (
          <span className="mk-search-ov__productDesc">
            {item.description}
          </span>
        ) : null}
      </span>

      <span className="mk-search-ov__productPriceBox" dir="ltr">
        {item.comparePriceText ? (
          <span className="mk-search-ov__productCompare">
            {item.comparePriceText}
          </span>
        ) : null}

        {item.priceText ? (
          <span className="mk-search-ov__productPrice">{item.priceText}</span>
        ) : null}
      </span>
    </SmartSearchLink>
  );
}

export default function SearchOverlay({
  open,
  onOpenChange,
  placeholder,
  groups,
  currencies,
  tax,
}: Props) {
  const router = useRouter();

  const { currencyContext, selectedCurrencyCode } =
    useCurrencyRuntime(currencies);

  const [q, setQ] = useState("");
  const [apiSuggestions, setApiSuggestions] = useState<unknown>([]);
  const [rawProductRows, setRawProductRows] = useState<SearchProductResult[]>(
    [],
  );
  const [productLoading, setProductLoading] = useState(false);
  const [productReady, setProductReady] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const query = s(q);
  const shouldShowProductSearch = query.length >= 2;

  const finalPlaceholder = s(placeholder) || "ما الذي تبحث عنه؟";

  const finalGroups = useMemo(() => {
    return normalizeGroupsFromAdmin(groups);
  }, [groups]);

  const productResults = useMemo(() => {
    if (!shouldShowProductSearch) return [];

    return rawProductRows
      .map((row, index) =>
        normalizeProductResult(
          row,
          index,
          currencyContext,
          selectedCurrencyCode,
          tax,
        ),
      )
      .filter(Boolean) as NormalizedProductResult[];
  }, [
    rawProductRows,
    shouldShowProductSearch,
    currencyContext,
    selectedCurrencyCode,
    tax,
  ]);

  const liveSuggestions = useMemo(() => {
    if (!shouldShowProductSearch) return [];
    return normalizeSuggestions(apiSuggestions, query, productResults);
  }, [apiSuggestions, query, productResults, shouldShowProductSearch]);

  const quickPreviewItems = useMemo(() => {
    const out: NormalizedItem[] = [];

    for (const group of finalGroups) {
      for (const item of group.items) {
        out.push(item);
        if (out.length >= 4) return out;
      }
    }

    return out;
  }, [finalGroups]);

  function close() {
    onOpenChange(false);
  }

  function getCurrentQuery() {
    return s(inputRef.current?.value ?? q);
  }

  function goToSearch(queryValue?: string) {
    const href = buildSearchHref(queryValue ?? getCurrentQuery());

    close();
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
    if (!open) return;

    setQ("");

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !shouldShowProductSearch) {
      setApiSuggestions([]);
      setRawProductRows([]);
      setProductLoading(false);
      setProductReady(false);
      return;
    }

    const controller = new AbortController();

    setProductLoading(true);
    setProductReady(false);
    setApiSuggestions([]);
    setRawProductRows([]);

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

        const rows = Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.products)
            ? json.products
            : [];

        setRawProductRows(rows as SearchProductResult[]);
        setApiSuggestions(json?.suggestions ?? []);
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setApiSuggestions([]);
          setRawProductRows([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setProductLoading(false);
          setProductReady(true);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, shouldShowProductSearch, query]);

  if (!open) return null;

  return (
    <div
      className={[
        "mk-search-ov",
        shouldShowProductSearch ? "is-live" : "is-browse",
      ]
        .filter(Boolean)
        .join(" ")}
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="mk-search-ov__shell">
        <div className="mk-search-ov__grabber" aria-hidden="true" />

        <div className="mk-search-ov__top">
          <button
            type="button"
            className="mk-search-ov__back"
            onClick={close}
            aria-label="رجوع"
          >
            <Icon icon={"ArrowRight01" as any} size={18} />
          </button>

          <div className="mk-search-ov__heading">
            <strong>البحث</strong>
            <span>ابحث بسرعة داخل المتجر</span>
          </div>

          <button type="button" className="mk-search-ov__close" onClick={close}>
            إغلاق
          </button>
        </div>

        <form className="mk-search-ov__bar" onSubmit={handleSubmit}>
          <button
            type="submit"
            className="mk-search-ov__iconBtn"
            aria-label="بحث"
          >
            <Icon icon={"Search01" as any} size={18} />
          </button>

          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="mk-search-ov__input"
            placeholder={finalPlaceholder}
            autoComplete="off"
            aria-label="البحث في المتجر"
          />

          {query ? (
            <button
              type="button"
              className="mk-search-ov__clear"
              aria-label="مسح البحث"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : null}

          <input type="hidden" name="sort" value="newest" />
        </form>

        {!shouldShowProductSearch && quickPreviewItems.length ? (
          <div className="mk-search-ov__quickPreview">
            {quickPreviewItems.map((item) => (
              <SmartSearchLink
                key={item.id}
                href={item.href}
                onNavigate={close}
                className="mk-search-ov__quickPreviewItem"
                title={item.title}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} />
                ) : (
                  <Icon icon="Search01" size={15} />
                )}
                <span>{item.title}</span>
              </SmartSearchLink>
            ))}
          </div>
        ) : null}

        <div className="mk-search-ov__content">
          {shouldShowProductSearch ? (
            <div className="mk-search-ov__live">
              <section className="mk-search-ov__section mk-search-ov__section--suggestions">
                <div className="mk-search-ov__sectionHead">
                  <h3 className="mk-search-ov__title">اقتراحات سريعة</h3>

                  {query ? (
                    <button
                      type="button"
                      className="mk-search-ov__viewAll"
                      onClick={() => goToSearch(query)}
                    >
                      عرض النتائج
                    </button>
                  ) : null}
                </div>

                {productLoading && !liveSuggestions.length ? (
                  <div className="mk-search-ov__state">جاري البحث...</div>
                ) : liveSuggestions.length > 0 ? (
                  <div className="mk-search-ov__suggestions">
                    {liveSuggestions.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        className="mk-search-ov__suggestion"
                        onClick={() => goToSearch(item)}
                      >
                        <span
                          className="mk-search-ov__suggestionIcon"
                          aria-hidden="true"
                        >
                          <Icon icon="Search01" size={15} />
                        </span>

                        <span className="mk-search-ov__suggestionText">
                          {renderHighlighted(item, query)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : productReady ? (
                  <div className="mk-search-ov__state">لا توجد اقتراحات</div>
                ) : null}
              </section>

              <section className="mk-search-ov__section">
                <div className="mk-search-ov__sectionHead">
                  <h3 className="mk-search-ov__title">منتجات مطابقة</h3>

                  {productResults.length ? (
                    <span className="mk-search-ov__count">
                      {productResults.length}
                    </span>
                  ) : null}
                </div>

                {productLoading && !productResults.length ? (
                  <div className="mk-search-ov__state">
                    جاري تحميل المنتجات...
                  </div>
                ) : productResults.length > 0 ? (
                  <div className="mk-search-ov__products">
                    {productResults.map((item) => (
                      <ProductResultItem
                        key={item.id}
                        item={item}
                        onNavigate={close}
                      />
                    ))}
                  </div>
                ) : productReady ? (
                  <div className="mk-search-ov__state">
                    لا توجد منتجات مطابقة
                  </div>
                ) : null}
              </section>
            </div>
          ) : finalGroups.length > 0 ? (
            <div className="mk-search-ov__groups">
              {finalGroups.map((group) => {
                const mode = shouldRenderVisualGroup(group)
                  ? "visual"
                  : shouldRenderCardsGroup(group)
                    ? "card"
                    : "chip";

                return (
                  <section
                    key={group.id}
                    className={[
                      "mk-search-ov__group",
                      `mk-search-ov__group--${mode}`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="mk-search-ov__sectionHead">
                      <div>
                        <h3 className="mk-search-ov__title">{group.title}</h3>

                        {group.description ? (
                          <p className="mk-search-ov__desc">
                            {group.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={
                        mode === "visual"
                          ? "mk-search-ov__visuals"
                          : mode === "card"
                            ? "mk-search-ov__cards"
                            : "mk-search-ov__chips"
                      }
                    >
                      {group.items.map((item) => (
                        <SearchItem
                          key={item.id}
                          item={item}
                          mode={mode}
                          onNavigate={close}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="mk-search-ov__empty">
              <Icon icon="Search01" size={24} />
              <span>اكتب كلمة للبحث داخل المتجر</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}