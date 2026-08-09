// FILE: apps/storefront/src/themes/basit/components/smart-search/SmartSearchWidget.tsx

"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Select, {
  type MultiValue,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import type { MalakBootstrapCategory } from "@/themes/basit/bootstrap/types";
import {
  getCategoryLists,
  getKeywordList,
  getKeywordScopeLists,
  getSearchButton,
  type SmartSearchDefinition,
} from "@/themes/basit/smart-search/config";
import {
  encodeSmartSearchPath,
  parseSmartSearchKeywordIds,
  parseSmartSearchPath,
  SMART_SEARCH_QUERY,
} from "@/themes/basit/smart-search/query";

type Variant = "hero" | "bar" | "mobile";

type CategoryOption = {
  id: string;
  label: string;
  href: string;
  parentId: string;
  depth: number;
};

type KeywordOption = {
  id: string;
  label: string;
};

type Props = {
  definition: SmartSearchDefinition;
  categories?: MalakBootstrapCategory[] | null;
  variant: Variant;
  onMobileClose?: () => void;
};

type SmartSearchStyle = CSSProperties & Record<`--${string}`, string | number>;

const keywordCache = new Map<string, KeywordOption[]>();

function s(value: unknown) {
  return String(value ?? "").trim();
}

function getColorLuminance(value: string) {
  const color = s(value);
  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const raw = hexMatch[1];
    const expanded = raw.length === 3 ? raw.split("").map((part) => `${part}${part}`).join("") : raw;
    const r = Number.parseInt(expanded.slice(0, 2), 16) / 255;
    const g = Number.parseInt(expanded.slice(2, 4), 16) / 255;
    const b = Number.parseInt(expanded.slice(4, 6), 16) / 255;
    const linear = [r, g, b].map((channel) => (
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const values = rgbMatch[1].split(",").slice(0, 3).map((part) => Number.parseFloat(part.trim()) / 255);
    if (values.length === 3 && values.every(Number.isFinite)) {
      const linear = values.map((channel) => (
        channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      ));
      return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
    }
  }

  return null;
}

function normalizePath(pathname: string | null | undefined) {
  const path = s(pathname || "/");
  return path.replace(/\/+$/, "") || "/";
}

function flattenCategories(rows: MalakBootstrapCategory[] | null | undefined) {
  const out: CategoryOption[] = [];
  const seen = new Set<string>();

  function walk(items: MalakBootstrapCategory[], fallbackDepth = 0) {
    for (const item of items || []) {
      const id = s(item?.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);

      out.push({
        id,
        label: s(item?.name) || "قسم",
        href: s(item?.href),
        parentId: s(item?.parent_id),
        depth: Number.isFinite(Number(item?.depth))
          ? Number(item.depth)
          : fallbackDepth,
      });

      if (Array.isArray(item?.children) && item.children.length) {
        walk(item.children, fallbackDepth + 1);
      }
    }
  }

  walk(Array.isArray(rows) ? rows : []);
  return out;
}

function toThemeStyle(variant: Variant): StylesConfig<CategoryOption | KeywordOption, boolean> {
  const compact = variant === "bar";

  return {
    control: (base, state) => ({
      ...base,
      position: "relative",
      minHeight: compact ? 42 : 56,
      height: compact ? 42 : 56,
      borderRadius: compact ? "var(--mk-radius-sm, 10px)" : "var(--mk-radius-md, 14px)",
      borderColor: state.isFocused
        ? "var(--mk-primary-border, var(--mk-border-strong))"
        : "var(--mk-border-soft, var(--mk-border))",
      backgroundColor: "var(--mk-bg-card, var(--mk-surface))",
      boxShadow: state.isFocused
        ? "0 0 0 3px var(--mk-primary-soft, transparent)"
        : "none",
      paddingLeft: compact ? 30 : 38,
      paddingRight: compact ? 32 : 38,
      cursor: "pointer",
      ":hover": {
        borderColor: "var(--mk-primary-border, var(--mk-border-strong))",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: "100%",
      minWidth: 0,
      padding: 0,
      margin: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      textAlign: "right",
      gap: 4,
    }),
    placeholder: (base) => ({
      ...base,
      width: "100%",
      margin: 0,
      color: "var(--mk-text-muted, var(--mk-muted))",
      fontSize: compact ? 12 : 13,
      fontWeight: 760,
      textAlign: "right",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }),
    singleValue: (base) => ({
      ...base,
      width: "100%",
      margin: 0,
      color: "var(--mk-text-main, var(--mk-text))",
      fontSize: compact ? 12 : 13,
      fontWeight: 760,
      textAlign: "right",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: "var(--mk-text-main, var(--mk-text))",
      fontSize: compact ? 12 : 13,
    }),
    indicatorSeparator: () => ({ display: "none" }),
    indicatorsContainer: (base) => ({
      ...base,
      position: "absolute",
      left: compact ? 9 : 12,
      right: "auto",
      top: "50%",
      transform: "translateY(-50%)",
      height: compact ? 22 : 24,
      width: compact ? 18 : 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "var(--mk-text-muted, var(--mk-muted))",
      padding: 0,
      cursor: "pointer",
    }),
    clearIndicator: (base) => ({
      ...base,
      color: "var(--mk-text-muted, var(--mk-muted))",
      padding: 0,
      cursor: "pointer",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 20000, pointerEvents: "auto" }),
    menu: (base) => ({
      ...base,
      zIndex: 20001,
      borderRadius: "var(--mk-radius-md, 14px)",
      overflow: "hidden",
      backgroundColor: "var(--mk-bg-card, var(--mk-surface))",
      border: "1px solid var(--mk-border-soft, var(--mk-border))",
      boxShadow: "var(--mk-shadow-floating, 0 18px 42px rgba(15, 23, 42, .15))",
    }),
    menuList: (base) => ({ ...base, padding: 6, maxHeight: 280 }),
    option: (base, state) => ({
      ...base,
      borderRadius: "var(--mk-radius-sm, 10px)",
      padding: "10px 12px",
      backgroundColor: state.isSelected
        ? "color-mix(in srgb, var(--mk-color-primary, var(--mk-primary)) 10%, var(--mk-bg-card, var(--mk-surface)) 90%)"
        : state.isFocused
          ? "var(--mk-primary-soft, var(--mk-bg-soft))"
          : "transparent",
      color: "var(--mk-text-main, var(--mk-text))",
      fontSize: 13,
      fontWeight: state.isSelected ? 800 : 600,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
    multiValue: (base) => ({
      ...base,
      maxWidth: "calc(50% - 4px)",
      minWidth: 0,
      margin: "0 2px",
      borderRadius: "999px",
      backgroundColor: "color-mix(in srgb, var(--mk-color-primary, var(--mk-primary)) 9%, var(--mk-bg-card, var(--mk-surface)) 91%)",
      border: "1px solid color-mix(in srgb, var(--mk-color-primary, var(--mk-primary)) 18%, transparent)",
      overflow: "hidden",
    }),
    multiValueLabel: (base) => ({
      ...base,
      minWidth: 0,
      color: "var(--mk-text-main, var(--mk-text))",
      fontSize: 10.5,
      fontWeight: 800,
      padding: "3px 6px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    multiValueRemove: (base) => ({
      ...base,
      flex: "0 0 auto",
      color: "var(--mk-text-muted, var(--mk-muted))",
      paddingInline: 3,
      cursor: "pointer",
      ":hover": {
        backgroundColor: "color-mix(in srgb, var(--mk-color-primary, var(--mk-primary)) 14%, transparent)",
        color: "var(--mk-text-main, var(--mk-text))",
      },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: "var(--mk-text-muted, var(--mk-muted))",
      fontSize: 13,
    }),
    loadingMessage: (base) => ({
      ...base,
      color: "var(--mk-text-muted, var(--mk-muted))",
      fontSize: 13,
    }),
  };
}

function makeKeywordRequestKey(args: {
  definition: SmartSearchDefinition;
  keywordListId: string;
  path: Record<string, string>;
}) {
  return `${args.definition.instanceId}:${args.keywordListId}:${encodeSmartSearchPath(args.path)}`;
}

function buildSearchHref(args: {
  lastCategory: CategoryOption;
  definition: SmartSearchDefinition;
  keywordListId: string | null;
  categoryPath: Record<string, string>;
  keywordIds: string[];
}) {
  const href = args.lastCategory.href || "/";
  const url = new URL(href, typeof window === "undefined" ? "https://store.local" : window.location.origin);

  url.searchParams.set(SMART_SEARCH_QUERY.instance, args.definition.instanceId);
  url.searchParams.set(SMART_SEARCH_QUERY.path, encodeSmartSearchPath(args.categoryPath));

  if (args.keywordListId && args.keywordIds.length) {
    url.searchParams.set(SMART_SEARCH_QUERY.keywordList, args.keywordListId);
    url.searchParams.set(SMART_SEARCH_QUERY.keywords, args.keywordIds.join(","));
  } else {
    url.searchParams.delete(SMART_SEARCH_QUERY.keywordList);
    url.searchParams.delete(SMART_SEARCH_QUERY.keywords);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function SmartSearchWidget({
  definition,
  categories,
  variant,
  onMobileClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryLists = useMemo(() => getCategoryLists(definition), [definition]);
  const keywordList = useMemo(() => getKeywordList(definition), [definition]);
  const keywordScopeLists = useMemo(() => getKeywordScopeLists(definition), [definition]);
  const searchButton = useMemo(() => getSearchButton(definition), [definition]);
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const optionById = useMemo(
    () => new Map(categoryOptions.map((item) => [item.id, item])),
    [categoryOptions],
  );

  const [categoryValues, setCategoryValues] = useState<Record<string, CategoryOption | null>>({});
  const [keywordOptions, setKeywordOptions] = useState<KeywordOption[]>([]);
  const categorySelectRefs = useRef<Record<string, { focus: () => void } | null>>({});
  const keywordSelectRef = useRef<{ focus: () => void } | null>(null);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const hydratedSignatureRef = useRef("");

  useEffect(() => {
    setIsSearching(false);
  }, [pathname, searchParams]);

  const categoryPath = useMemo(() => {
    const out: Record<string, string> = {};
    for (const list of categoryLists) {
      const value = categoryValues[list.id];
      if (value?.id) out[list.id] = value.id;
    }
    return out;
  }, [categoryLists, categoryValues]);

  const keywordScopeReady = useMemo(() => {
    if (!keywordList) return false;
    return keywordScopeLists.length > 0 && keywordScopeLists.every((list) => Boolean(categoryValues[list.id]?.id));
  }, [categoryValues, keywordList, keywordScopeLists]);

  const selectedKeywords = useMemo(() => {
    const ids = new Set(selectedKeywordIds);
    return keywordOptions.filter((item) => ids.has(item.id));
  }, [keywordOptions, selectedKeywordIds]);

  const categoryOptionsFor = (listId: string) => {
    const list = categoryLists.find((item) => item.id === listId);
    if (!list) return [];

    if (list.source === "root_categories") {
      return categoryOptions.filter((item) => !item.parentId || item.depth === 0);
    }

    const parentId = s(list.source_list_id);
    const parent = parentId ? categoryValues[parentId] : null;
    if (!parent?.id) return [];

    return categoryOptions.filter((item) => item.parentId === parent.id);
  };

  useEffect(() => {
    const instanceId = s(searchParams.get(SMART_SEARCH_QUERY.instance));
    const pathValue = s(searchParams.get(SMART_SEARCH_QUERY.path));
    const keywordValue = s(searchParams.get(SMART_SEARCH_QUERY.keywords));
    const signature = `${instanceId}|${pathValue}|${keywordValue}`;

    if (hydratedSignatureRef.current === signature) return;
    hydratedSignatureRef.current = signature;

    if (instanceId !== definition.instanceId) {
      setCategoryValues({});
      setSelectedKeywordIds([]);
      return;
    }

    const path = parseSmartSearchPath(pathValue);
    const nextValues: Record<string, CategoryOption | null> = {};

    for (const list of categoryLists) {
      const option = optionById.get(s(path[list.id]));
      nextValues[list.id] = option ?? null;
    }

    setCategoryValues(nextValues);
    setSelectedKeywordIds(parseSmartSearchKeywordIds(keywordValue));
  }, [categoryLists, definition.instanceId, optionById, searchParams]);

  useEffect(() => {
    if (!keywordList || !keywordScopeReady) {
      setKeywordOptions([]);
      return;
    }

    const path: Record<string, string> = {};
    for (const list of keywordScopeLists) {
      const value = categoryValues[list.id];
      if (value?.id) path[list.id] = value.id;
    }

    const cacheKey = makeKeywordRequestKey({
      definition,
      keywordListId: keywordList.id,
      path,
    });
    const cached = keywordCache.get(cacheKey);

    if (cached) {
      setKeywordOptions(cached);
      return;
    }

    const controller = new AbortController();
    setKeywordsLoading(true);

    const params = new URLSearchParams();
    params.set(SMART_SEARCH_QUERY.instance, definition.instanceId);
    params.set(SMART_SEARCH_QUERY.keywordList, keywordList.id);
    params.set(SMART_SEARCH_QUERY.path, encodeSmartSearchPath(path));

    fetch(`/api/smart-search/keywords?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error("KEYWORDS_LOAD_FAILED");

        const items = (Array.isArray(payload.items) ? payload.items : [])
          .map((item: any) => ({ id: s(item?.id), label: s(item?.label) }))
          .filter((item: KeywordOption) => item.id && item.label);

        keywordCache.set(cacheKey, items);
        setKeywordOptions(items);
      })
      .catch((error) => {
        if ((error as any)?.name === "AbortError") return;
        setKeywordOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setKeywordsLoading(false);
      });

    return () => controller.abort();
  }, [categoryValues, definition, keywordList, keywordScopeLists, keywordScopeReady]);

  useEffect(() => {
    if (!keywordOptions.length) return;
    const availableIds = new Set(keywordOptions.map((item) => item.id));
    setSelectedKeywordIds((previous) => previous.filter((id) => availableIds.has(id)));
  }, [keywordOptions]);

  const onCategoryChange = (listIndex: number, option: SingleValue<CategoryOption>) => {
    const list = categoryLists[listIndex];
    if (!list) return;

    setCategoryValues((previous) => {
      const next = { ...previous, [list.id]: option ?? null };
      for (const after of categoryLists.slice(listIndex + 1)) {
        next[after.id] = null;
      }
      return next;
    });
    setSelectedKeywordIds([]);
    setKeywordOptions([]);

    if (option) {
      const nextList = categoryLists[listIndex + 1];
      window.setTimeout(() => {
        if (nextList) {
          categorySelectRefs.current[nextList.id]?.focus();
          return;
        }

        keywordSelectRef.current?.focus();
      }, 80);
    }
  };

  const onKeywordChange = (value: MultiValue<KeywordOption> | SingleValue<KeywordOption>) => {
    if (!keywordList) return;

    const selected = Array.isArray(value) ? value : value ? [value] : [];
    const limit = keywordList.selection_mode === "multiple" ? keywordList.max_selections : 1;
    setSelectedKeywordIds(selected.slice(0, limit).map((item) => item.id));
  };

  const lastList = categoryLists[categoryLists.length - 1];
  const lastCategory = lastList ? categoryValues[lastList.id] : null;
  const canSearch = Boolean(lastCategory?.id);
  const styles = useMemo(() => toThemeStyle(variant), [variant]);
  const selectPortal = typeof window === "undefined" ? undefined : document.body;
  const currentPath = normalizePath(pathname);
  const activeCategoryIndex = categoryLists.findIndex((list) => {
    const disabled = list.source === "children_of_list" && !categoryValues[s(list.source_list_id)]?.id;
    return !disabled && !categoryValues[list.id]?.id;
  });
  const activeKeyword = activeCategoryIndex === -1 && Boolean(keywordList && keywordScopeReady);

  const submitSearch = () => {
    if (!lastCategory || !canSearch || isSearching) return;

    const href = buildSearchHref({
      lastCategory,
      definition,
      keywordListId: keywordList?.id ?? null,
      categoryPath,
      keywordIds: selectedKeywordIds,
    });

    if (href === `${currentPath}${window.location.search}`) return;

    setIsSearching(true);
    if (onMobileClose) onMobileClose();
    router.push(href);
  };

  const keywordSummary = selectedKeywords.length
    ? selectedKeywords.length === 1
      ? selectedKeywords[0]?.label
      : `${selectedKeywords[0]?.label ?? "كلمة"} +${selectedKeywords.length - 1}`
    : "";

  const formFields = (
    <>
      {categoryLists.map((list, index) => {
        const options = categoryOptionsFor(list.id);
        const disabled = list.source === "children_of_list" && !categoryValues[s(list.source_list_id)]?.id;
        const selected = Boolean(categoryValues[list.id]?.id);
        const active = !disabled && !selected && activeCategoryIndex === index;

        return (
          <div
            className={`mk-smart-search__field${disabled ? " mk-smart-search__field--disabled" : ""}${selected ? " mk-smart-search__field--selected" : ""}${active ? " mk-smart-search__field--active" : ""}`}
            key={list.id}
          >
            <span className="mk-smart-search__label">
              <span className="mk-smart-search__step" aria-hidden="true">{list.list_number}</span>
              <span>{list.name}</span>
            </span>
            <ChevronDown className="mk-smart-search__field-chevron" size={17} aria-hidden="true" />
            <Select<CategoryOption, false>
              ref={(node) => {
                categorySelectRefs.current[list.id] = node;
              }}
              classNamePrefix="mk-smart-search-select"
              components={{ DropdownIndicator: null, IndicatorSeparator: null }}
              instanceId={`mk-smart-${definition.instanceId}-${list.id}`}
              value={categoryValues[list.id] ?? null}
              options={options}
              onChange={(option) => onCategoryChange(index, option)}
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.id}
              placeholder={disabled ? "اختر السابق أولًا" : "اختر القسم"}
              noOptionsMessage={() => disabled ? "اختر القائمة السابقة أولًا" : "لا توجد خيارات"}
              isClearable
              isSearchable
              isDisabled={disabled}
              menuPortalTarget={selectPortal}
              menuPosition="fixed"
              styles={styles as StylesConfig<CategoryOption, false>}
            />
          </div>
        );
      })}

      {keywordList ? (
        <div className={`mk-smart-search__field mk-smart-search__field--keywords${selectedKeywords.length ? " mk-smart-search__field--has-keywords" : ""}${!keywordScopeReady ? " mk-smart-search__field--disabled" : ""}${activeKeyword ? " mk-smart-search__field--active" : ""}`}>
          <span className="mk-smart-search__label">
            <span className="mk-smart-search__step" aria-hidden="true">{keywordList.list_number}</span>
            <span>{keywordList.name}</span>
          </span>
          <ChevronDown className="mk-smart-search__field-chevron" size={17} aria-hidden="true" />
          {keywordSummary ? (
            <span className="mk-smart-search__keyword-summary" title={selectedKeywords.map((item) => item.label).join("، ")}>
              {keywordSummary}
            </span>
          ) : null}
          <Select<KeywordOption, boolean>
            ref={(node) => {
              keywordSelectRef.current = node;
            }}
            classNamePrefix="mk-smart-search-select"
            components={{ DropdownIndicator: null, IndicatorSeparator: null }}
            instanceId={`mk-smart-${definition.instanceId}-${keywordList.id}`}
            value={keywordList.selection_mode === "multiple" ? selectedKeywords : selectedKeywords[0] ?? null}
            options={keywordOptions}
            onChange={onKeywordChange as any}
            getOptionLabel={(option) => option.label}
            getOptionValue={(option) => option.id}
            placeholder="اختر الكلمة"
            noOptionsMessage={() => keywordScopeReady ? "لا توجد كلمات لهذا المسار" : "أكمل اختيارات القوائم أولًا"}
            loadingMessage={() => "يتم تحميل الكلمات..."}
            isLoading={keywordsLoading}
            isClearable
            isSearchable
            isDisabled={!keywordScopeReady}
            isMulti={keywordList.selection_mode === "multiple"}
            closeMenuOnSelect={keywordList.selection_mode !== "multiple"}
            hideSelectedOptions={false}
            isOptionDisabled={(option) => {
              if (keywordList.selection_mode !== "multiple") return false;
              return selectedKeywordIds.length >= keywordList.max_selections && !selectedKeywordIds.includes(option.id);
            }}
            menuPortalTarget={selectPortal}
            menuPosition="fixed"
            styles={styles as StylesConfig<KeywordOption, boolean>}
          />
          {keywordList.selection_mode === "multiple" ? (
            <span className="mk-smart-search__hint">يمكنك اختيار حتى {keywordList.max_selections} كلمات</span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (variant === "mobile") {
    return (
      <section className="mk-smart-search-mobile-picker" aria-label="الباحث الذكي">
        <header className="mk-smart-search-mobile-picker__header">
          <div>
            <span className="mk-smart-search-mobile-picker__eyebrow">الباحث الذكي</span>
            <h2>{definition.config.heading}</h2>
          </div>
          <button type="button" className="mk-smart-search-mobile-picker__close" onClick={onMobileClose} aria-label="إغلاق الباحث">
            <X size={20} />
          </button>
        </header>
        <p className="mk-smart-search-mobile-picker__description">{definition.config.description}</p>
        {definition.config.promo_text ? <p className="mk-smart-search-mobile-picker__promo">{definition.config.promo_text}</p> : null}
        <div className="mk-smart-search-mobile-picker__fields">{formFields}</div>
        <button
          type="button"
          className="mk-smart-search__submit mk-smart-search__submit--mobile"
          onClick={submitSearch}
          disabled={!canSearch || isSearching}
        >
          {isSearching ? (
            <span className="mk-smart-search__submit-spinner" aria-hidden="true" />
          ) : (
            <Search size={18} />
          )}
          <span>{isSearching ? "جاري البحث..." : (searchButton?.button_text || "عرض النتائج")}</span>
        </button>
      </section>
    );
  }

  const heroBackground = definition.config.background;
  const heroIsImage = heroBackground.mode === "image" && Boolean(heroBackground.image_url);
  const heroColorIsLight = !heroIsImage && (getColorLuminance(heroBackground.color) ?? 0) > 0.46;
  const buttonColor = s(
    (searchButton as any)?.button_color ??
      (searchButton as any)?.buttonColor ??
      (definition.config as any)?.button_color ??
      (definition.config as any)?.buttonColor,
  );

  const backgroundStyle = (
    variant === "hero"
      ? {
          backgroundColor: heroIsImage ? undefined : heroBackground.color,
          backgroundImage: heroIsImage ? `url("${heroBackground.image_url}")` : undefined,
          "--mk-smart-search-bg-color": heroBackground.color || "var(--mk-color-primary, var(--mk-primary))",
          "--mk-smart-search-overlay-opacity": heroIsImage ? heroBackground.overlay : 0,
          "--mk-smart-search-action": buttonColor || "var(--mk-color-primary, var(--mk-primary))",
          "--mk-smart-search-heading-color": definition.config.heading_color,
          "--mk-smart-search-description-color": definition.config.description_color,
          "--mk-smart-search-promo-color": definition.config.promo_text_color,
        }
      : {
          "--mk-smart-search-action": buttonColor || "var(--mk-color-primary, var(--mk-primary))",
          "--mk-smart-search-heading-color": definition.config.heading_color,
          "--mk-smart-search-description-color": definition.config.description_color,
          "--mk-smart-search-promo-color": definition.config.promo_text_color,
        }
  ) as SmartSearchStyle;

  return (
    <section
      className={[
        "mk-smart-search",
        `mk-smart-search--${variant}`,
        heroIsImage ? "mk-smart-search--image" : "mk-smart-search--color",
        heroColorIsLight ? "mk-smart-search--light" : "mk-smart-search--dark",
      ].join(" ")}
      style={backgroundStyle}
      aria-label="الباحث الذكي"
    >
      {variant === "hero" ? (
        <div className="mk-smart-search__intro">
          <h2>{definition.config.heading}</h2>
          {definition.config.description ? <p className="mk-smart-search__description">{definition.config.description}</p> : null}
          {definition.config.promo_text ? <p className="mk-smart-search__promo">{definition.config.promo_text}</p> : null}
        </div>
      ) : null}

      <div className="mk-smart-search__form" onKeyDown={(event) => {
        if (event.key === "Enter" && canSearch && !isSearching) {
          event.preventDefault();
          submitSearch();
        }
      }}>
        <div className="mk-smart-search__fields">{formFields}</div>
        <button
          type="button"
          className="mk-smart-search__submit"
          onClick={submitSearch}
          disabled={!canSearch || isSearching}
        >
          {isSearching ? (
            <span className="mk-smart-search__submit-spinner" aria-hidden="true" />
          ) : (
            variant === "bar" ? <SlidersHorizontal size={17} /> : <Search size={18} />
          )}
          <span>{isSearching ? "جاري البحث..." : canSearch ? (searchButton?.button_text || "ابحث") : "اختر القسم"}</span>
        </button>
      </div>
    </section>
  );
}
