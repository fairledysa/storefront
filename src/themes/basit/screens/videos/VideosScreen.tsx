"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductFloatingVideo, { type ProductShortItem } from "../product/_components/ProductFloatingVideo";

type Props = {
  items: ProductShortItem[];
  commentsEnabled?: boolean;
  commentSubmissionEnabled?: boolean;
  allowGuestComments?: boolean;
  questionsEnabled?: boolean;
  allowGuestQuestions?: boolean;
  allowHiddenNames?: boolean;
};

type SortKey = "newest" | "rating" | "comments";

const PAGE_SIZE = 18;

type CategoryOption = {
  key: string;
  label: string;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}



function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function validMediaUrl(value: unknown) {
  const url = cleanText(value);
  if (!url) return false;
  return /^(https?:\/\/|blob:|data:video\/|\/)/i.test(url);
}

function explicitUploadStatus(item: ProductShortItem) {
  const raw = item.raw ?? {};
  return cleanText(
    raw?.upload_status ??
      raw?.uploadStatus ??
      raw?.video_status ??
      raw?.videoStatus ??
      raw?.media_status ??
      raw?.mediaStatus ??
      raw?.status,
  ).toLowerCase();
}

function isReadyVideo(item: ProductShortItem) {
  if (!validMediaUrl(item.videoSrc)) return false;

  const status = explicitUploadStatus(item);
  if (!status) return true;

  return ["ready", "completed", "complete", "processed", "published", "active", "success"].includes(status);
}

function itemTimestamp(item: ProductShortItem) {
  const raw = item.raw ?? {};
  const candidates = [
    raw?.video_created_at,
    raw?.videoCreatedAt,
    raw?.media_created_at,
    raw?.mediaCreatedAt,
    raw?.published_at,
    raw?.publishedAt,
    raw?.created_at,
    raw?.createdAt,
    raw?.updated_at,
    raw?.updatedAt,
  ];

  for (const candidate of candidates) {
    const timestamp = Date.parse(cleanText(candidate));
    if (Number.isFinite(timestamp)) return timestamp;
  }

  return 0;
}

function itemEngagement(item: ProductShortItem) {
  const raw = item.raw ?? {};
  const explicit = [
    raw?.engagement_count,
    raw?.engagementCount,
    raw?.interactions_count,
    raw?.interactionsCount,
  ].map(finiteNumber).find((value) => value > 0);

  if (explicit) return explicit;

  return (
    finiteNumber(item.reviewsCount) +
    finiteNumber(raw?.comments_count ?? raw?.commentsCount) +
    finiteNumber(raw?.questions_count ?? raw?.questionsCount) +
    finiteNumber(raw?.likes_count ?? raw?.likesCount) +
    finiteNumber(raw?.views_count ?? raw?.viewsCount)
  );
}

function searchableText(item: ProductShortItem) {
  const raw = item.raw ?? {};
  const categories = categoryEntries(item).map((entry) => entry.label);
  return [
    item.title,
    raw?.name,
    raw?.sku,
    raw?.description,
    raw?.video_title,
    raw?.videoTitle,
    ...categories,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeSourceItems(items: ProductShortItem[]) {
  const seen = new Set<string>();
  const normalized: ProductShortItem[] = [];

  for (const item of items) {
    if (!item || !isReadyVideo(item)) continue;

    const title = cleanText(item.title) || cleanText(item.raw?.name) || "منتج";
    const id = cleanText(item.id) || cleanText(item.raw?.id) || item.videoSrc;
    const key = `${id}::${item.videoSrc}`;
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push({ ...item, id, title, videoSrc: cleanText(item.videoSrc) });
  }

  return normalized;
}

function itemPrice(item: ProductShortItem) {
  const direct = cleanText(item.price);
  if (direct) return direct;

  const raw = item.raw ?? {};
  const candidates = [
    raw?.pricing?.finalPrice,
    raw?.pricing?.final_price,
    raw?.pricing?.price,
    raw?.sale_price,
    raw?.salePrice,
    raw?.price,
    raw?.regular_price,
    raw?.regularPrice,
    raw?.base_price,
    raw?.basePrice,
  ];

  const value = candidates.find((candidate) => Number.isFinite(Number(candidate)));
  if (value === undefined) return "";

  const currency = cleanText(
    raw?.pricing?.currencySymbol ??
      raw?.pricing?.currency_symbol ??
      raw?.currency_symbol ??
      raw?.currencySymbol ??
      raw?.currency ??
      "SAR",
  );

  return `${Number(value).toFixed(2)} ${currency}`.trim();
}

function categoryEntries(item: ProductShortItem): CategoryOption[] {
  const raw = item.raw ?? {};
  const candidates: unknown[] = [];

  if (Array.isArray(raw?.categories)) candidates.push(...raw.categories);
  if (Array.isArray(raw?.category)) candidates.push(...raw.category);
  else if (raw?.category) candidates.push(raw.category);
  if (raw?.main_category) candidates.push(raw.main_category);
  if (raw?.primary_category) candidates.push(raw.primary_category);
  if (raw?.category_name) candidates.push({ name: raw.category_name, id: raw.category_id });
  if (raw?.categoryName) candidates.push({ name: raw.categoryName, id: raw.categoryId });

  const seen = new Set<string>();
  const result: CategoryOption[] = [];

  for (const candidate of candidates) {
    const objectCandidate = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : null;
    const label = cleanText(
      objectCandidate?.name ??
      objectCandidate?.title ??
      objectCandidate?.label ??
      objectCandidate?.category_name ??
      (typeof candidate === "string" ? candidate : ""),
    );
    if (!label) continue;

    const key = cleanText(
      objectCandidate?.id ??
      objectCandidate?.category_id ??
      objectCandidate?.slug ??
      label,
    ).toLowerCase();

    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ key, label });
  }

  return result;
}

export default function VideosScreen({
  items,
  commentsEnabled = false,
  commentSubmissionEnabled,
  allowGuestComments,
  questionsEnabled = true,
  allowGuestQuestions = false,
  allowHiddenNames = true,
}: Props) {
  const sourceItems = useMemo(() => normalizeSourceItems(items), [items]);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [category, setCategory] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openSignal, setOpenSignal] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo<CategoryOption[]>(() => {
    const byKey = new Map<string, CategoryOption>();

    for (const item of sourceItems) {
      for (const entry of categoryEntries(item)) {
        if (!byKey.has(entry.key)) byKey.set(entry.key, entry);
      }
    }

    return Array.from(byKey.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "ar", { sensitivity: "base" }),
    );
  }, [sourceItems]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = sourceItems.filter((item) => {
      const matchesQuery = !q || searchableText(item).includes(q);
      if (!matchesQuery) return false;
      if (category === "all") return true;
      return categoryEntries(item).some((entry) => entry.key === category);
    });

    if (sort === "rating") {
      filtered.sort((a, b) => finiteNumber(b.rating) - finiteNumber(a.rating));
    } else if (sort === "comments") {
      filtered.sort((a, b) => itemEngagement(b) - itemEngagement(a));
    } else {
      filtered.sort((a, b) => itemTimestamp(b) - itemTimestamp(a));
    }

    return filtered;
  }, [sourceItems, query, sort, category]);

  const pagedItems = useMemo(
    () => visibleItems.slice(0, visibleCount),
    [visibleItems, visibleCount],
  );

  const hasMoreItems = visibleCount < visibleItems.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, sort, category, sourceItems]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreItems) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) => Math.min(current + PAGE_SIZE, visibleItems.length));
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreItems, visibleItems.length]);

  const openShort = (item: ProductShortItem) => {
    const originalIndex = sourceItems.findIndex((entry) => entry.id === item.id && entry.videoSrc === item.videoSrc);
    setSelectedIndex(Math.max(originalIndex, 0));
    setOpenSignal((value) => value + 1);
  };

  return (
    <main className="mk-video-hub" dir="rtl">
      <header className="mk-video-hub__header">
        <div>
          <span className="mk-video-hub__eyebrow">تسوّق بالفيديو</span>
          <h1>فيديوهات المنتجات</h1>
          <p>شاهد المنتجات أثناء الاستخدام، وانتقل بينها بسرعة ثم أضف ما يعجبك إلى السلة مباشرة.</p>
        </div>

        <label className="mk-video-hub__search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
            <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن منتج أو فيديو" />
        </label>
      </header>

      <nav className="mk-video-hub__tabs" aria-label="ترتيب الفيديوهات">
        <button className={sort === "newest" ? "is-active" : ""} onClick={() => setSort("newest")} type="button">الأحدث</button>
        <button className={sort === "rating" ? "is-active" : ""} onClick={() => setSort("rating")} type="button">الأعلى تقييمًا</button>
        <button className={sort === "comments" ? "is-active" : ""} onClick={() => setSort("comments")} type="button">الأكثر تفاعلًا</button>
      </nav>

      <nav className="mk-video-hub__categories" aria-label="فلترة الفيديوهات حسب القسم">
          <button
            type="button"
            className={category === "all" ? "is-active" : ""}
            onClick={() => setCategory("all")}
          >
            الكل
          </button>
          {categories.map((entry) => (
            <button
              type="button"
              key={entry.key}
              className={category === entry.key ? "is-active" : ""}
              onClick={() => setCategory(entry.key)}
            >
              {entry.label}
            </button>
          ))}
      </nav>

      {visibleItems.length ? (
        <section className="mk-video-hub__grid" aria-label="جميع فيديوهات المنتجات">
          {pagedItems.map((item) => {
            const price = itemPrice(item);

            return (
            <article className="mk-video-hub__card" key={`${item.id}-${item.videoSrc}`}>
              <button type="button" className="mk-video-hub__thumb" onClick={() => openShort(item)} aria-label={`مشاهدة فيديو ${item.title}`}>
                {item.poster || item.image ? (
                  <img src={item.poster || item.image} alt={item.title} loading="lazy" decoding="async" />
                ) : (
                  <video src={item.videoSrc} muted playsInline preload="none" aria-label={item.title} />
                )}
                <span className="mk-video-hub__play" aria-hidden="true">▶</span>
                {item.reviewsCount ? <span className="mk-video-hub__count">{item.reviewsCount} تفاعل</span> : null}
              </button>
              <div className="mk-video-hub__info">
                {item.href && item.href !== "#" ? <a href={item.href}>{item.title}</a> : <strong>{item.title}</strong>}
                <div>
                  {price ? <span className="mk-video-hub__price">{price}</span> : null}
                  {item.rating ? <small>★ {item.rating.toFixed(1)}</small> : null}
                </div>
              </div>
            </article>
            );
          })}
        </section>
      ) : (
        <div className="mk-video-hub__empty">لا توجد فيديوهات ضمن هذا القسم.</div>
      )}

      {visibleItems.length ? (
        <div
          ref={loadMoreRef}
          className="mk-video-hub__load-more"
          aria-live="polite"
          aria-label={hasMoreItems ? "تحميل المزيد من الفيديوهات" : "تم عرض جميع الفيديوهات"}
        >
          {hasMoreItems ? (
            <span>جاري تحميل المزيد…</span>
          ) : (
            <span>تم عرض جميع الفيديوهات</span>
          )}
        </div>
      ) : null}

      {sourceItems.length ? (
        <ProductFloatingVideo
          src={sourceItems[0].videoSrc}
          poster={sourceItems[0].poster}
          title={sourceItems[0].title}
          shortsEnabled
          commentsEnabled={commentsEnabled}
          commentSubmissionEnabled={commentSubmissionEnabled}
          allowGuestComments={allowGuestComments}
          questionsEnabled={questionsEnabled}
          allowGuestQuestions={allowGuestQuestions}
          allowHiddenNames={allowHiddenNames}
          items={sourceItems}
          hideFloatingLauncher
          openShortsSignal={openSignal}
          initialShortIndex={selectedIndex}
        />
      ) : null}
    </main>
  );
}
