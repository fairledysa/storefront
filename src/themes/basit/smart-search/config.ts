// FILE: apps/storefront/src/themes/basit/smart-search/config.ts

export type SmartSearchCategoryList = {
  id: string;
  type: "category_list";
  list_number: number;
  name: string;
  placeholder: string;
  source: "root_categories" | "children_of_list";
  source_list_id: string | null;
};

export type SmartSearchKeywordList = {
  id: string;
  type: "keyword_list";
  list_number: number;
  name: string;
  placeholder: string;
  linked_list_id: string | null;
  selection_mode: "single" | "multiple";
  max_selections: number;
};

export type SmartSearchButton = {
  id: string;
  type: "search_button";
  list_number: number;
  name: string;
  button_text: string;
};

export type SmartSearchElement =
  | SmartSearchCategoryList
  | SmartSearchKeywordList
  | SmartSearchButton;

export type SmartSearchConfig = {
  background: {
    mode: "image" | "color";
    image_url: string;
    color: string;
    overlay: number;
  };
  heading: string;
  heading_color: string;
  description: string;
  description_color: string;
  promo_text: string;
  promo_text_color: string;
  elements: SmartSearchElement[];
};

export type SmartSearchDefinition = {
  instanceId: string;
  config: SmartSearchConfig;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function safeObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {}
  }

  return {};
}

function positiveInt(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(12, Math.floor(n)));
}

function normalizeElement(value: unknown, index: number): SmartSearchElement | null {
  const row = safeObject(value);
  const type = s(row.type).toLowerCase();
  const id = s(row.id) || `smart-search-element-${index + 1}`;
  const listNumber = positiveInt(row.list_number ?? row.listNumber, index + 1);

  if (type === "category_list") {
    const source = s(row.source) === "children_of_list"
      ? "children_of_list"
      : "root_categories";

    return {
      id,
      type: "category_list",
      list_number: listNumber,
      name: s(row.name) || `القائمة ${listNumber}`,
      placeholder: s(row.placeholder) || "اختر",
      source,
      source_list_id:
        source === "children_of_list" ? s(row.source_list_id ?? row.sourceListId) || null : null,
    };
  }

  if (type === "keyword_list") {
    const multiple = s(row.selection_mode ?? row.selectionMode) === "multiple";

    return {
      id,
      type: "keyword_list",
      list_number: listNumber,
      name: s(row.name) || "الكلمات المفتاحية",
      placeholder: s(row.placeholder) || "اختر الكلمات المفتاحية",
      linked_list_id: s(row.linked_list_id ?? row.linkedListId) || null,
      selection_mode: multiple ? "multiple" : "single",
      max_selections: multiple
        ? positiveInt(row.max_selections ?? row.maxSelections, 3)
        : 1,
    };
  }

  if (type === "search_button") {
    return {
      id,
      type: "search_button",
      list_number: listNumber,
      name: s(row.name) || "زر البحث",
      button_text: s(row.button_text ?? row.buttonText) || "ابحث",
    };
  }

  return null;
}

export function normalizeSmartSearchConfig(value: unknown): SmartSearchConfig | null {
  const source = safeObject(value);
  const rawElements = Array.isArray(source.elements) ? source.elements : [];
  const elements = rawElements
    .map((item, index) => normalizeElement(item, index))
    .filter(Boolean) as SmartSearchElement[];

  const categoryLists = elements.filter(
    (item): item is SmartSearchCategoryList => item.type === "category_list",
  );

  if (!categoryLists.length) return null;

  const background = safeObject(source.background);
  const overlay = Number(background.overlay ?? 0.42);

  return {
    background: {
      mode: s(background.mode) === "image" ? "image" : "color",
      image_url: s(background.image_url ?? background.imageUrl),
      color: s(background.color) || "#0D3B45",
      overlay: Number.isFinite(overlay) ? Math.max(0, Math.min(0.85, overlay)) : 0.42,
    },
    heading: s(source.heading) || "ابحث عن المنتج المناسب",
    heading_color: s(source.heading_color ?? source.headingColor) || "#ffffff",
    description: s(source.description) || "اختر الخيارات المناسبة للوصول إلى النتائج المطابقة.",
    description_color: s(source.description_color ?? source.descriptionColor) || "#ffffff",
    promo_text: s(source.promo_text ?? source.promoText),
    promo_text_color: s(source.promo_text_color ?? source.promoTextColor) || "#facc15",
    elements: elements.sort((a, b) => a.list_number - b.list_number),
  };
}

function readSections(value: unknown) {
  const root = safeObject(value);
  const homepage = safeObject(root.homepage);
  return Array.isArray(homepage.sections) ? homepage.sections : [];
}

function getInstanceId(section: Record<string, any>, index: number) {
  return s(
    section.instance_id ??
      section.instanceId ??
      section.id ??
      section.page_component_id ??
      section.pageComponentId,
  ) || `smart-search-${index + 1}`;
}

function isSectionEnabled(section: Record<string, any>) {
  const value = section.enabled ?? section.is_enabled ?? section.isEnabled;
  if (value === false || value === 0) return false;
  if (typeof value === "string") {
    return !["false", "0", "off", "disabled"].includes(value.trim().toLowerCase());
  }
  return true;
}

function getSectionKey(section: Record<string, any>) {
  return s(
    section.key ??
      section.component_key ??
      section.componentKey ??
      section.theme_component_key ??
      section.themeComponentKey,
  ).toLowerCase();
}

export function isSmartSearchSection(value: unknown) {
  const row = safeObject(value);
  return getSectionKey(row) === "smart_search";
}

export function getSmartSearchDefinitionFromThemeOptions(
  themeOptions: unknown,
  preferredInstanceId?: string | null,
): SmartSearchDefinition | null {
  const preferred = s(preferredInstanceId);
  const sections = readSections(themeOptions);

  const candidates = sections
    .map((section, index) => ({ section: safeObject(section), index }))
    .filter(({ section }) => isSmartSearchSection(section) && isSectionEnabled(section));

  const selected =
    (preferred
      ? candidates.find(({ section, index }) => getInstanceId(section, index) === preferred)
      : null) ?? candidates[0];

  if (!selected) return null;

  const values = safeObject(selected.section.values);
  const config = normalizeSmartSearchConfig(
    values.smart_search_config ?? values.smartSearchConfig ?? values,
  );

  if (!config) return null;

  return {
    instanceId: getInstanceId(selected.section, selected.index),
    config,
  };
}

export function getSmartSearchDefinitionFromData(
  data: any,
  preferredInstanceId?: string | null,
) {
  const themeOptions =
    data?.theme?.options ??
    data?.themeOptions ??
    data?.theme_options ??
    data?.bootstrap?.themeOptions ??
    null;

  return getSmartSearchDefinitionFromThemeOptions(themeOptions, preferredInstanceId);
}

export function getCategoryLists(definition: SmartSearchDefinition | null | undefined) {
  if (!definition) return [];
  return definition.config.elements.filter(
    (item): item is SmartSearchCategoryList => item.type === "category_list",
  );
}

export function getKeywordList(definition: SmartSearchDefinition | null | undefined) {
  if (!definition) return null;
  return (
    definition.config.elements.find(
      (item): item is SmartSearchKeywordList => item.type === "keyword_list",
    ) ?? null
  );
}

export function getSearchButton(definition: SmartSearchDefinition | null | undefined) {
  if (!definition) return null;
  return (
    definition.config.elements.find(
      (item): item is SmartSearchButton => item.type === "search_button",
    ) ?? null
  );
}

export function getKeywordScopeLists(
  definition: SmartSearchDefinition | null | undefined,
) {
  const categoryLists = getCategoryLists(definition);
  const keywordList = getKeywordList(definition);

  if (!keywordList) return [];

  const linkedIndex = categoryLists.findIndex(
    (item) => item.id === keywordList.linked_list_id,
  );

  return linkedIndex >= 0 ? categoryLists.slice(0, linkedIndex + 1) : categoryLists;
}

export function getSmartSearchDefinitionFromSection(
  section: unknown,
  index = 0,
): SmartSearchDefinition | null {
  const row = safeObject(section);
  if (!isSmartSearchSection(row)) return null;

  const values = safeObject(row.values);
  const config = normalizeSmartSearchConfig(
    values.smart_search_config ?? values.smartSearchConfig ?? values,
  );

  if (!config) return null;

  return {
    instanceId: getInstanceId(row, index),
    config,
  };
}
