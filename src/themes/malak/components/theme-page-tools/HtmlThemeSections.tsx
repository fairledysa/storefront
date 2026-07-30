"use client";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function optionsFromData(data: any) {
  return (
    data?.theme?.options ||
    data?.themeOptions ||
    data?.theme_options ||
    data?.bootstrap?.themeOptions ||
    data?.bootstrap?.theme_options ||
    {}
  );
}

function pageSections(data: any, pageKey: string, entityId?: string | null) {
  const options = optionsFromData(data);
  const aliases =
    pageKey === "homepage"
      ? ["homepage", "home"]
      : pageKey === "category"
        ? ["category", "categories"]
        : pageKey === "product"
          ? ["product", "products"]
          : ["page", "pages"];

  const targetId = text(entityId);

  for (const key of aliases) {
    const page = options?.[key];
    if (!page || typeof page !== "object") continue;

    // التخصيص المحدد يتغلب على التخصيص العام.
    // وجود سجل للمعرف المحدد—even بقائمة فارغة—يعني أن التاجر اختار
    // تخصيص هذه الصفحة بشكل مستقل، لذلك لا ندمجه مع "تخصيص الكل".
    if (targetId && page.selected && typeof page.selected === "object") {
      const hasSelected = Object.prototype.hasOwnProperty.call(page.selected, targetId);
      if (hasSelected) {
        const selectedSections = page.selected?.[targetId]?.sections;
        return Array.isArray(selectedSections) ? selectedSections : [];
      }
    }

    // عند عدم وجود تخصيص محدد، نرجع لتخصيص كل المنتجات/التصنيفات.
    const allSections = page?.all?.sections;
    if (Array.isArray(allSections)) return allSections;

    // توافق مع البنية القديمة للصفحة الرئيسية وأي بيانات قديمة.
    const legacySections = page?.sections;
    if (Array.isArray(legacySections)) return legacySections;
  }

  return [];
}

function isHtmlSection(section: any) {
  const tokens = [
    section?.key,
    section?.slug,
    section?.render_key,
    section?.renderKey,
    section?.component_key,
    section?.componentKey,
    section?.theme_component_key,
    section?.themeComponentKey,
    section?.component?.key,
    section?.component?.slug,
    section?.theme_component?.key,
    section?.theme_component?.slug,
    section?.definition?.key,
    section?.definition?.slug,
  ].map(lower);

  return tokens.some((token) =>
    ["html", "html5", "html_content", "custom_html", "content_html"].includes(token),
  );
}

function htmlValue(section: any) {
  const values = section?.values && typeof section.values === "object" ? section.values : {};
  const candidates = [
    values.html_content,
    values.html5,
    values.html,
    values.content_html,
    values.custom_html,
    values.code,
    values.content,
    values.field_1,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = text(candidate.value || candidate.text || candidate.html || candidate.content);
      if (nested) return nested;
    }
  }

  return "";
}

function matchesScope(section: any, entityId?: string | null) {
  const rules = section?.visibility_rules || section?.visibilityRules || {};
  const scope = lower(rules?.scope || section?.scope_mode || section?.scopeMode || "all");
  if (!scope || scope === "all") return true;

  const target = text(entityId);
  if (!target) return false;

  const ids = [
    rules?.entity_id,
    rules?.entityId,
    rules?.product_id,
    rules?.productId,
    rules?.category_id,
    rules?.categoryId,
    rules?.page_id,
    rules?.pageId,
    ...(Array.isArray(rules?.entity_ids) ? rules.entity_ids : []),
    ...(Array.isArray(rules?.entityIds) ? rules.entityIds : []),
  ].map(text).filter(Boolean);

  return ids.includes(target);
}

function sanitizeHtml(input: string) {
  return String(input || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(?:iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "");
}

export default function HtmlThemeSections({
  data,
  pageKey,
  entityId,
}: {
  data: any;
  pageKey: "homepage" | "product" | "category" | "page";
  entityId?: string | null;
}) {
  const sections = pageSections(data, pageKey, entityId)
    .filter((section: any) => section && section.enabled !== false && section.is_enabled !== false)
    .filter(isHtmlSection)
    .filter((section: any) => matchesScope(section, entityId))
    .sort((a: any, b: any) => Number(a?.sort_order ?? a?.sort ?? 0) - Number(b?.sort_order ?? b?.sort ?? 0));

  if (!sections.length) return null;

  return (
    <>
      {sections.map((section: any, index: number) => {
        const html = htmlValue(section);
        if (!html) return null;

        const key = text(section?.instance_key || section?.instance_id || section?.id) || `${pageKey}-html-${index}`;
        return (
          <section key={key} data-theme-tool="html_content" data-theme-page={pageKey}>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
          </section>
        );
      })}
    </>
  );
}
