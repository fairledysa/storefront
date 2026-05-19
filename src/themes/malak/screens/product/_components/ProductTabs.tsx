// FILE: apps/storefront/src/themes/malak/screens/product/_components/ProductTabs.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ProductReviews from "./ProductReviews";

type TabKey = "desc" | "specs" | "reviews";
type TabsMode = "full" | "details" | "details_cards" | "reviews";

export type ProductSpecRow = {
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  value?: string;
  description?: string;
  text?: string;
};

type NormalizedSpecRow = {
  id: string;
  name: string;
  value: string;
};

type Props = {
  productId: string;
  reviewsEnabled?: boolean;
  questionsEnabled?: boolean;
  allowGuestQuestions?: boolean;
  allowLikes?: boolean;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  specsHtml?: string | null;
  productSpecs?: ProductSpecRow[];
  reviewsCount?: number | null;
  showSeeMoreButton?: boolean;
  hideRatings?: boolean;
  mode?: TabsMode;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function stripHtml(html: string) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clampText(value: string, maxChars: number) {
  const t = text(value);

  if (t.length <= maxChars) {
    return {
      short: t,
      cut: false,
    };
  }

  return {
    short: t.slice(0, maxChars).trimEnd() + "…",
    cut: true,
  };
}

function normalizeProductSpecs(rows: ProductSpecRow[] | undefined) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((item, index): NormalizedSpecRow => {
      const name = text(item?.name || item?.label || item?.title);
      const value = text(item?.value || item?.description || item?.text);
      const id = text(item?.id) || `spec-${index}-${name}-${value}`;

      return {
        id,
        name,
        value,
      };
    })
    .filter((item) => item.name && item.value);
}

function parseSpecsFromHtml(specsHtml: string | null | undefined) {
  const raw = String(specsHtml ?? "").trim();
  if (!raw) return [];

  const out: NormalizedSpecRow[] = [];

  const trMatches = Array.from(raw.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));

  for (const tr of trMatches) {
    const rowHtml = String(tr[1] ?? "");

    const cells = Array.from(
      rowHtml.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi),
    );

    if (cells.length >= 2) {
      const name = stripHtml(String(cells[0]?.[2] ?? ""));
      const value = stripHtml(String(cells[1]?.[2] ?? ""));

      if (name && value) {
        out.push({
          id: `spec-html-${out.length}-${name}-${value}`,
          name,
          value,
        });
      }
    }
  }

  if (out.length) return out;

  const plain = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ");

  const lines = plain
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split(/[:：|-]/).map((x) => x.trim());

    if (parts.length >= 2) {
      const name = parts[0];
      const value = parts.slice(1).join(" - ");

      if (name && value) {
        out.push({
          id: `spec-line-${out.length}-${name}-${value}`,
          name,
          value,
        });
      }
    }
  }

  return out;
}

function SpecsTable({ rows }: { rows: NormalizedSpecRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="mk-ptabs-specs">
      {rows.map((row, index) => (
        <div key={row.id || `spec-${index}`} className="mk-ptabs-specs__row">
          <div className="mk-ptabs-specs__label">{row.name}</div>
          <div className="mk-ptabs-specs__value">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string;
  meta?: string | null;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`mk-ptabs-section ${open ? "is-open" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`mk-ptabs-section__head ${open ? "is-open" : ""}`}
        aria-expanded={open}
      >
        <span className="mk-ptabs-section__titleWrap">
          <span className="mk-ptabs-section__title">{title}</span>

          {meta ? (
            <span className="mk-ptabs-section__meta">{meta}</span>
          ) : null}
        </span>

        <span className={`mk-ptabs-section__arrow ${open ? "is-open" : ""}`}>
          ⌄
        </span>
      </button>

      {open ? <div className="mk-ptabs-section__body">{children}</div> : null}
    </section>
  );
}

export default function ProductTabs({
  productId,
  reviewsEnabled = true,
  questionsEnabled = true,
  allowGuestQuestions = false,
  allowLikes = false,
  descriptionHtml = null,
  descriptionText = null,
  specsHtml = null,
  productSpecs = [],
  reviewsCount = 0,
  showSeeMoreButton = true,
  hideRatings = false,
  mode = "full",
}: Props) {
  const initialTab: TabKey = mode === "reviews" ? "reviews" : "desc";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [expanded, setExpanded] = useState(false);

  const descPlain = useMemo(() => {
    const html = text(descriptionHtml);
    const plainText = text(descriptionText);

    return html ? stripHtml(html) : plainText;
  }, [descriptionHtml, descriptionText]);

  const normalizedSpecs = useMemo(() => {
    const fromArray = normalizeProductSpecs(productSpecs);
    if (fromArray.length) return fromArray;

    return parseSpecsFromHtml(specsHtml);
  }, [productSpecs, specsHtml]);

  const specsPlain = useMemo(() => {
    return stripHtml(String(specsHtml ?? ""));
  }, [specsHtml]);

  const { short, cut } = useMemo(() => {
    return clampText(descPlain, 520);
  }, [descPlain]);

  const canCollapse = Boolean(showSeeMoreButton && cut);
  const descContent = canCollapse && !expanded ? short : descPlain;

  const hasDescription = Boolean(descPlain);
  const hasSpecs = Boolean(normalizedSpecs.length || specsPlain);

  const [specsOpen, setSpecsOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  const showDetailsTabs = mode === "full" || mode === "details";
  const showReviewsTab = mode === "full" || mode === "reviews";

  useEffect(() => {
    if (!showSeeMoreButton) {
      setExpanded(true);
      return;
    }

    setExpanded(false);
  }, [showSeeMoreButton, descPlain]);

  useEffect(() => {
    if (mode !== "details_cards") return;

    setSpecsOpen(hasSpecs);
    setDescOpen(!hasSpecs && hasDescription);
  }, [mode, hasSpecs, hasDescription, productId]);

  useEffect(() => {
    if (mode === "reviews") {
      setTab("reviews");
      return;
    }

    if ((mode === "details" || mode === "details_cards") && tab === "reviews") {
      setTab("desc");
      return;
    }

    if (hideRatings && tab === "reviews") {
      setTab("desc");
    }
  }, [hideRatings, mode, tab]);

  if (mode === "reviews" && hideRatings) {
    return null;
  }

  if (mode === "details_cards") {
    if (!hasDescription && !hasSpecs) return null;

    const specsMeta = normalizedSpecs.length
      ? `${normalizedSpecs.length} مواصفات`
      : specsPlain
        ? "مواصفات المنتج"
        : null;

    const descMeta = descPlain.length > 140 ? "وصف كامل" : "وصف مختصر";

    return (
      <div dir="rtl" className="mk-ptabs mk-ptabs--cards">
        {hasSpecs ? (
          <SectionCard
            title="التفاصيل"
            meta={specsMeta}
            open={specsOpen}
            onToggle={() => setSpecsOpen((v) => !v)}
          >
            {normalizedSpecs.length ? (
              <SpecsTable rows={normalizedSpecs} />
            ) : (
              <div className="mk-ptabs-text">{specsPlain}</div>
            )}
          </SectionCard>
        ) : null}

        {hasDescription ? (
          <SectionCard
            title="الوصف"
            meta={descMeta}
            open={descOpen}
            onToggle={() => setDescOpen((v) => !v)}
          >
            <div className="mk-ptabs-text">{descContent}</div>

            {canCollapse ? (
              <div className="mk-ptabs-more">
                <button
                  type="button"
                  onClick={() => setExpanded((x) => !x)}
                  className="mk-ptabs-more__btn"
                >
                  {expanded ? "عرض أقل" : "مشاهدة المزيد"}
                  <span className={expanded ? "is-open" : ""}>⌄</span>
                </button>
              </div>
            ) : null}
          </SectionCard>
        ) : null}
      </div>
    );
  }

  return (
    <div dir="rtl" className="mk-ptabs">
      <div className="mk-ptabs-head">
        <div className="mk-ptabs-list">
          {showDetailsTabs ? (
            <>
              <button
                type="button"
                onClick={() => setTab("desc")}
                className={`mk-ptabs-btn ${tab === "desc" ? "is-active" : ""}`}
              >
                الوصف
              </button>

              <button
                type="button"
                onClick={() => setTab("specs")}
                className={`mk-ptabs-btn ${tab === "specs" ? "is-active" : ""}`}
              >
                التفاصيل
              </button>
            </>
          ) : null}

          {showReviewsTab && !hideRatings ? (
            <button
              type="button"
              onClick={() => setTab("reviews")}
              className={`mk-ptabs-btn ${tab === "reviews" ? "is-active" : ""}`}
            >
              التقييمات ({Number(reviewsCount ?? 0)})
            </button>
          ) : null}

          <span className="mk-ptabs-spacer" />
        </div>
      </div>

      <div className="mk-ptabs-body">
        {showDetailsTabs && tab === "desc" ? (
          <>
            <div className="mk-ptabs-text">
              {descContent || "لا يوجد وصف لهذا المنتج."}
            </div>

            {canCollapse ? (
              <div className="mk-ptabs-more">
                <button
                  type="button"
                  onClick={() => setExpanded((x) => !x)}
                  className="mk-ptabs-more__btn"
                >
                  {expanded ? "عرض أقل" : "مشاهدة المزيد"}
                  <span className={expanded ? "is-open" : ""}>⌄</span>
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {showDetailsTabs && tab === "specs" ? (
          normalizedSpecs.length ? (
            <SpecsTable rows={normalizedSpecs} />
          ) : (
            <div className="mk-ptabs-text">
              {specsPlain || "لا توجد مواصفات إضافية."}
            </div>
          )
        ) : null}

        {showReviewsTab && tab === "reviews" && !hideRatings ? (
          <ProductReviews
            productId={productId}
            enabled={reviewsEnabled}
            questionsEnabled={questionsEnabled}
            allowGuestQuestions={allowGuestQuestions}
            allowLikes={allowLikes}
          />
        ) : null}
      </div>
    </div>
  );
}