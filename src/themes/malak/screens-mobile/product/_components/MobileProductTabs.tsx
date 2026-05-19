// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductTabs.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ProductReviews from "@/themes/malak/screens/product/_components/ProductReviews";

type TabKey = "description" | "specs" | "reviews";

type Props = {
  productId: string;
  reviewsEnabled?: boolean;
  questionsEnabled?: boolean;
  allowGuestQuestions?: boolean;
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  specsHtml?: string | null;
  reviewsCount?: number | null;
  showSeeMoreButton?: boolean;
};

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampText(text: string, maxChars: number) {
  const t = (text ?? "").trim();
  if (t.length <= maxChars) return { short: t, cut: false };
  return { short: t.slice(0, maxChars).trimEnd() + "…", cut: true };
}

export default function MobileProductTabs({
  productId,
  reviewsEnabled = true,
  questionsEnabled = true,
  allowGuestQuestions = false,
  descriptionHtml = null,
  descriptionText = null,
  specsHtml = null,
  reviewsCount = 0,
  showSeeMoreButton = true,
}: Props) {
  const [tab, setTab] = useState<TabKey>("description");
  const [expanded, setExpanded] = useState(false);

  const descPlain = useMemo(() => {
    const html = String(descriptionHtml ?? "").trim();
    const text = String(descriptionText ?? "").trim();
    const plain = html ? stripHtml(html) : text;
    return plain.trim();
  }, [descriptionHtml, descriptionText]);

  const specsPlain = useMemo(() => {
    const html = String(specsHtml ?? "").trim();
    return html ? stripHtml(html) : "";
  }, [specsHtml]);

  const { short, cut } = useMemo(() => clampText(descPlain, 260), [descPlain]);

  const canCollapse = Boolean(showSeeMoreButton && cut);
  const content = canCollapse && !expanded ? short : descPlain;

  useEffect(() => {
    if (!showSeeMoreButton) {
      setExpanded(true);
      return;
    }

    setExpanded(false);
  }, [showSeeMoreButton, descPlain]);

  return (
    <section className="mkmtabs" dir="rtl">
      <div className="mkmtabs-head">
        <button
          type="button"
          onClick={() => setTab("description")}
          className={`mkmtabs-btn ${
            tab === "description" ? "mkmtabs-btn--active" : ""
          }`}
        >
          الوصف
        </button>

        <button
          type="button"
          onClick={() => setTab("specs")}
          className={`mkmtabs-btn ${
            tab === "specs" ? "mkmtabs-btn--active" : ""
          }`}
        >
          مواصفات
        </button>

        <button
          type="button"
          onClick={() => setTab("reviews")}
          className={`mkmtabs-btn ${
            tab === "reviews" ? "mkmtabs-btn--active" : ""
          }`}
        >
          التقييمات ({Number(reviewsCount ?? 0)})
        </button>
      </div>

      <div className="mkmtabs-body">
        {tab === "description" ? (
          <div className="mkmtabs-content">
            {String(descriptionHtml ?? "").trim() ? (
              <div
                className={[
                  "mkmtabs-rich",
                  canCollapse && !expanded ? "mkmtabs-clamp" : "",
                ].join(" ")}
                dangerouslySetInnerHTML={{
                  __html: String(descriptionHtml ?? ""),
                }}
              />
            ) : (
              <div
                className={[
                  "mkmtabs-pre",
                  canCollapse && !expanded ? "mkmtabs-clamp" : "",
                ].join(" ")}
              >
                {content || "لا يوجد وصف لهذا المنتج."}
              </div>
            )}

            {canCollapse ? (
              <div className="mkmtabs-moreWrap">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mkmtabs-more"
                >
                  {expanded ? "عرض أقل" : "مشاهدة المزيد"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "specs" ? (
          <div className="mkmtabs-content">
            {specsPlain || "لا توجد مواصفات إضافية."}
          </div>
        ) : null}

        {tab === "reviews" ? (
          <ProductReviews
            productId={productId}
            enabled={reviewsEnabled}
            questionsEnabled={questionsEnabled}
            allowGuestQuestions={allowGuestQuestions}
          />
        ) : null}
      </div>
    </section>
  );
}