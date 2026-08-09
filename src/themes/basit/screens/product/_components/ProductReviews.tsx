// FILE: apps/storefront/src/themes/basit/screens/product/_components/ProductReviews.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ReviewMedia = {
  id: string;
  review_id?: string;
  file_url: string;
  thumbnail_url?: string | null;
  alt_text?: string | null;
  media_type?: "image" | "video";
  sort_order?: number;
};

type ReviewReply = {
  id: string;
  author_type: "admin" | "customer";
  body: string;
  created_at: string;
};

type ReviewItem = {
  id: string;
  review_type: "review" | "comment" | "question";
  rating: number | null;
  title: string | null;
  body: string | null;
  author_name: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  media?: ReviewMedia[];
  replies?: ReviewReply[];
};

type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  totalComments: number;
  totalWithMedia: number;
  recommendationPercentage: number;
  distribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
};

type AuthMeResponse = {
  authed?: boolean;
  customer?: {
    id?: string | null;
    full_name?: string | null;
  } | null;
};

type ReviewsApiResponse = {
  ok?: boolean;
  items?: ReviewItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  message?: string;
};

type ReviewReactionResponse = {
  ok?: boolean;
  helpful_count?: number;
  duplicated?: boolean;
  message?: string;
};

type MediaViewerSlide = {
  review: ReviewItem;
  media: ReviewMedia;
};

type MediaViewerState = {
  slides: MediaViewerSlide[];
  index: number;
};

type Props = {
  productId: string;
  enabled?: boolean;
  questionsEnabled?: boolean;
  allowGuestQuestions?: boolean;
  allowLikes?: boolean;
  allowHiddenNames?: boolean;
  showRatingSummary?: boolean;
  showRecommendation?: boolean;
  title?: string;
  placeholder?: string;
};

const MAX_BODY_LENGTH = 120;
const FIRST_PAGE_SIZE = 10;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function maskPublicName(name?: string | null) {
  const clean = s(name);

  if (!clean || clean === "زائر") return "زائر";

  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const chars = Array.from(part);

      if (chars.length <= 1) return `${chars[0] || "ع"}**`;
      if (chars.length === 2) return `${chars[0]}**${chars[1]}`;

      const first = chars[0];
      const last = chars[chars.length - 1];
      const stars = "*".repeat(Math.max(2, chars.length - 2));

      return `${first}${stars}${last}`;
    })
    .join(" ");
}

function publicAuthorName(
  name: string | null | undefined,
  allowHiddenNames: boolean,
) {
  if (!allowHiddenNames) return s(name) || "زائر";

  return maskPublicName(name);
}

function stars(rating?: number | null) {
  const n = Number(rating ?? 0);
  return [1, 2, 3, 4, 5].map((i) => (i <= n ? "★" : "☆")).join("");
}

function formatDate(value?: string | null) {
  const d = value ? new Date(value) : null;

  if (!d || Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

function sessionIdKey() {
  return "review_session_id";
}

function helpfulStorageKey() {
  return "review_helpful_ids";
}

function getSessionId() {
  if (typeof window === "undefined") return "";

  const key = sessionIdKey();
  const current = window.localStorage.getItem(key);

  if (current) return current;

  const id =
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2);

  window.localStorage.setItem(key, id);

  return id;
}

function getHelpfulSet() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(helpfulStorageKey());
    const arr = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(arr)) return new Set<string>();

    return new Set(arr.map((x) => String(x)).filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function saveHelpfulSet(set: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      helpfulStorageKey(),
      JSON.stringify(Array.from(set)),
    );
  } catch {
    //
  }
}

function summaryPercent(summary: ReviewSummary | null, rating: number) {
  if (!summary) return 0;

  const row = summary.distribution.find((x) => Number(x.rating) === rating);
  return Number(row?.percentage ?? 0);
}

function recommendationPercent(summary: ReviewSummary | null) {
  const value = Number(summary?.recommendationPercentage ?? 0);

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function reviewMediaUrl(media: ReviewMedia) {
  return s(media.thumbnail_url) || s(media.file_url);
}

function reviewMediaOpenUrl(media: ReviewMedia) {
  return s(media.file_url) || s(media.thumbnail_url);
}

function reviewText(item: ReviewItem) {
  return s(item.body) || s(item.title);
}

function getReviewMedia(item: ReviewItem) {
  if (!Array.isArray(item.media)) return [];

  return item.media
    .filter((media) => {
      const url = reviewMediaUrl(media);
      const type = s(media.media_type || "image");
      return Boolean(url) && type !== "video";
    })
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function buildMediaSlides(reviews: ReviewItem[]) {
  const slides: MediaViewerSlide[] = [];

  for (const review of reviews) {
    if (!reviewText(review)) continue;

    const mediaItems = getReviewMedia(review);

    for (const media of mediaItems) {
      slides.push({
        review,
        media,
      });
    }
  }

  return slides;
}

function PersonAvatar({ name }: { name?: string | null }) {
  const cleanName = s(name);
  const first = cleanName === "***" ? "ع" : cleanName.charAt(0) || "ز";

  return (
    <div className="mk-prev-avatar" aria-hidden="true">
      <span>{first}</span>
    </div>
  );
}

function LikeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 10v10H4.8C3.8 20 3 19.2 3 18.2v-6.4C3 10.8 3.8 10 4.8 10H7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.5L10.9 4.7C11.4 4 12.4 3.8 13.1 4.3C13.7 4.7 14 5.4 13.8 6.1L13.1 9H18.6C20 9 21 10.3 20.7 11.6L19.5 17.1C19.1 18.8 17.6 20 15.9 20H7V10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function typeLabel(item: ReviewItem) {
  if (item.review_type === "review") return "تقييم";
  if (item.review_type === "question") return "سؤال";
  if (item.review_type === "comment") return "تعليق";
  return "";
}

function typeBadgeClass(item: ReviewItem) {
  if (item.review_type === "review") return "mk-prev-type mk-prev-type--review";

  if (item.review_type === "question") {
    return "mk-prev-type mk-prev-type--question";
  }

  return "mk-prev-type";
}

export default function ProductReviews({
  productId,
  enabled = true,
  questionsEnabled = true,
  allowGuestQuestions = false,
  allowLikes = false,
  allowHiddenNames = false,
  showRatingSummary = true,
  showRecommendation = true,
  title = "التعليقات",
  placeholder = "شاركنا سؤالك أو تعليقك 🙂",
}: Props) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");
  const [authed, setAuthed] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reactingIds, setReactingIds] = useState<Record<string, boolean>>({});
  const [helpfulIds, setHelpfulIds] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState | null>(null);

  const bodyText = useMemo(() => s(body), [body]);
  const canSubmit = bodyText.length >= 3 && bodyText.length <= MAX_BODY_LENGTH;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const set = getHelpfulSet();
    const map: Record<string, boolean> = {};

    for (const id of set) {
      map[id] = true;
    }

    setHelpfulIds(map);
  }, []);

  useEffect(() => {
    if (!mediaViewer) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMediaViewer(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setMediaViewer((prev) => {
          if (!prev || prev.slides.length <= 1) return prev;

          return {
            ...prev,
            index: prev.index <= 0 ? prev.slides.length - 1 : prev.index - 1,
          };
        });
      }

      if (event.key === "ArrowLeft") {
        setMediaViewer((prev) => {
          if (!prev || prev.slides.length <= 1) return prev;

          return {
            ...prev,
            index: prev.index >= prev.slides.length - 1 ? 0 : prev.index + 1,
          };
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mediaViewer]);

  async function loadAuthState() {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
      });

      const json: AuthMeResponse = await res.json();

      if (!res.ok || !json?.authed) {
        setAuthed(false);
        setCustomerName("");
        return;
      }

      setAuthed(true);
      setCustomerName(s(json?.customer?.full_name) || "");
    } catch {
      setAuthed(false);
      setCustomerName("");
    }
  }

  async function loadSummary() {
    const res = await fetch(
      `/api/reviews/summary?target_type=product&target_id=${encodeURIComponent(
        productId,
      )}`,
      { cache: "no-store" },
    );

    const json = await res.json();

    if (!res.ok || !json?.ok) {
      throw new Error(json?.message || "FAILED_TO_FETCH_REVIEW_SUMMARY");
    }

    setSummary({
      averageRating: Number(json.averageRating ?? 0),
      totalReviews: Number(json.totalReviews ?? 0),
      totalComments: Number(json.totalComments ?? 0),
      totalWithMedia: Number(json.totalWithMedia ?? 0),
      recommendationPercentage: Number(json.recommendationPercentage ?? 0),
      distribution: Array.isArray(json.distribution) ? json.distribution : [],
    });
  }

  async function fetchItems(nextPage: number) {
    const qs = new URLSearchParams({
      target_type: "product",
      target_id: productId,
      page: String(nextPage),
      page_size: String(FIRST_PAGE_SIZE),
      sort: "newest",
    });

    const res = await fetch(`/api/reviews?${qs.toString()}`, {
      cache: "no-store",
    });

    const json: ReviewsApiResponse = await res.json();

    if (!res.ok || !json?.ok) {
      throw new Error(json?.message || "FAILED_TO_FETCH_REVIEWS");
    }

    const nextItems = Array.isArray(json.items)
      ? json.items.filter((item) =>
          ["review", "comment", "question"].includes(String(item.review_type)),
        )
      : [];

    return {
      items: nextItems,
      page: Number(json.page ?? nextPage),
      hasMore: Boolean(json.hasMore),
    };
  }

  async function loadFirstPage() {
    const result = await fetchItems(1);

    setItems(result.items);
    setPage(result.page);
    setHasMore(result.hasMore);
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const result = await fetchItems(nextPage);

      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];

        for (const item of result.items) {
          if (seen.has(item.id)) continue;

          seen.add(item.id);
          merged.push(item);
        }

        return merged;
      });

      setPage(result.page);
      setHasMore(result.hasMore);
    } catch {
      //
    } finally {
      setLoadingMore(false);
    }
  }

  async function reload() {
    setLoading(true);

    try {
      await Promise.all([loadAuthState(), loadSummary(), loadFirstPage()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled || !productId) {
      setLoading(false);
      return;
    }

    reload().catch(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, productId]);

  async function submitQuestion() {
    if (!questionsEnabled) return;
    if (!canSubmit || sending) return;

    if (!authed && !allowGuestQuestions) {
      setSubmitMsg("لا يمكنك كتابة سؤال، الرجاء تسجيل الدخول أولًا");
      return;
    }

    setSending(true);
    setSubmitMsg("");

    try {
      const finalAuthorName = authed && customerName ? customerName : "زائر";

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_type: "product",
          target_id: productId,
          review_type: "question",
          body: bodyText,
          author_name: finalAuthorName,
          session_id: getSessionId(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "FAILED_TO_CREATE_QUESTION");
      }

      setBody("");
      setSubmitMsg(
        json?.moderation === "published"
          ? "تم إرسال سؤالك بنجاح."
          : "تم إرسال سؤالك وبانتظار المراجعة.",
      );

      await loadFirstPage();
    } catch (error: any) {
      setSubmitMsg(s(error?.message) || "تعذر إرسال السؤال.");
    } finally {
      setSending(false);
    }
  }

  async function submitHelpful(reviewId: string) {
    const cleanReviewId = s(reviewId);
    if (!allowLikes || !cleanReviewId) return;
    if (reactingIds[cleanReviewId] || helpfulIds[cleanReviewId]) return;

    setReactingIds((prev) => ({
      ...prev,
      [cleanReviewId]: true,
    }));

    try {
      const res = await fetch("/api/reviews/react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          review_id: cleanReviewId,
          session_id: getSessionId(),
        }),
      });

      const json: ReviewReactionResponse = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "FAILED_TO_REACT");
      }

      const nextHelpfulCount = Number(json.helpful_count ?? 0);

      setItems((prev) =>
        prev.map((item) =>
          item.id === cleanReviewId
            ? {
                ...item,
                helpful_count: Number.isFinite(nextHelpfulCount)
                  ? nextHelpfulCount
                  : Number(item.helpful_count ?? 0),
              }
            : item,
        ),
      );

      const set = getHelpfulSet();
      set.add(cleanReviewId);
      saveHelpfulSet(set);

      setHelpfulIds((prev) => ({
        ...prev,
        [cleanReviewId]: true,
      }));
    } catch {
      //
    } finally {
      setReactingIds((prev) => {
        const next = { ...prev };
        delete next[cleanReviewId];
        return next;
      });
    }
  }

  function openMediaViewer(review: ReviewItem, media: ReviewMedia) {
    const slides = buildMediaSlides(items);
    if (!slides.length) return;

    const targetUrl = reviewMediaOpenUrl(media);
    const targetId = s(media.id);

    const index = Math.max(
      0,
      slides.findIndex((slide) => {
        const sameReview = slide.review.id === review.id;
        const sameMediaId = targetId && s(slide.media.id) === targetId;
        const sameUrl = reviewMediaOpenUrl(slide.media) === targetUrl;

        return sameReview && (sameMediaId || sameUrl);
      }),
    );

    setMediaViewer({
      slides,
      index,
    });
  }

  function closeMediaViewer() {
    setMediaViewer(null);
  }

  function moveMediaViewer(direction: "prev" | "next") {
    setMediaViewer((prev) => {
      if (!prev || prev.slides.length <= 1) return prev;

      const last = prev.slides.length - 1;

      return {
        ...prev,
        index:
          direction === "prev"
            ? prev.index <= 0
              ? last
              : prev.index - 1
            : prev.index >= last
              ? 0
              : prev.index + 1,
      };
    });
  }

  if (!enabled) {
    return <div className="mk-prev-state">التعليقات معطلة لهذا المنتج.</div>;
  }

  if (loading) {
    return <div className="mk-prev-state">جاري تحميل التعليقات...</div>;
  }

  const canShowForm = Boolean(questionsEnabled);
  const guestBlocked = canShowForm && !authed && !allowGuestQuestions;
  const remainingChars = MAX_BODY_LENGTH - bodyText.length;

  const activeSlide =
    mediaViewer && mediaViewer.slides[mediaViewer.index]
      ? mediaViewer.slides[mediaViewer.index]
      : null;

  const activeMedia = activeSlide?.media ?? null;
  const activeReview = activeSlide?.review ?? null;
  const activeText = activeReview ? reviewText(activeReview) : "";
  const activeAuthorName = publicAuthorName(
    activeReview?.author_name,
    allowHiddenNames,
  );

  const totalReviews = Number(summary?.totalReviews ?? 0);
  const recommendPercent = recommendationPercent(summary);
  const canShowRecommendation = Boolean(showRecommendation && totalReviews > 0);

  return (
    <div dir="rtl" className="mk-prev">
      <div className="mk-prev-formCard">
        <div className="mk-prev-formHead">
          <PersonAvatar name={authed ? customerName || "مستخدم" : "زائر"} />

          <div className="mk-prev-formHead__text">
            <div className="mk-prev-formHead__name">
              {authed ? customerName || "مستخدم" : "أضف تعليقك"}
            </div>

            <div className="mk-prev-formHead__title">{title}</div>
          </div>
        </div>

        {canShowForm ? (
          guestBlocked ? (
            <div className="mk-prev-blocked">
              لا يمكنك كتابة سؤال، الرجاء تسجيل الدخول أولًا
            </div>
          ) : (
            <>
              <textarea
                value={body}
                onChange={(e) =>
                  setBody(e.target.value.slice(0, MAX_BODY_LENGTH))
                }
                placeholder={placeholder}
                rows={4}
                maxLength={MAX_BODY_LENGTH}
                className="mk-prev-textarea"
              />

              <div className="mk-prev-formFooter">
                <div
                  className={`mk-prev-counter ${
                    remainingChars < 15 ? "is-danger" : ""
                  }`}
                >
                  المتبقي {remainingChars} / {MAX_BODY_LENGTH}
                </div>

                <button
                  type="button"
                  onClick={submitQuestion}
                  disabled={!canSubmit || sending}
                  className="mk-prev-submit"
                >
                  {sending ? "جاري الإرسال..." : "إرسال"}
                </button>
              </div>
              {submitMsg ? <div className="mk-prev-msg">{submitMsg}</div> : null}
            </>
          )
        ) : null}
      </div>

      {showRatingSummary || canShowRecommendation ? (
        <div className="mk-prev-summary">
          <div className="mk-prev-summary__grid">
            {showRatingSummary ? (
              <>
                <div className="mk-prev-summary__score">
                  <div className="mk-prev-summary__number">
                    {Number(summary?.averageRating ?? 0).toFixed(1)}
                  </div>

                  <div className="mk-prev-summary__stars">
                    {stars(Math.round(Number(summary?.averageRating ?? 0)))}
                  </div>

                  <div className="mk-prev-summary__text">
                    بناءً على {Number(summary?.totalReviews ?? 0)} تقييم
                  </div>
                </div>

                <div className="mk-prev-bars">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={`summary-${rating}`} className="mk-prev-barRow">
                      <div className="mk-prev-barRow__rating">{rating}</div>

                      <div className="mk-prev-barRow__track">
                        <div
                          className="mk-prev-barRow__fill"
                          style={{
                            width: `${summaryPercent(summary, rating)}%`,
                          }}
                        />
                      </div>

                      <div className="mk-prev-barRow__pct">
                        {summaryPercent(summary, rating)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {canShowRecommendation ? (
              <div className="mk-prev-summary__score">
                <div className="mk-prev-summary__number">
                  {recommendPercent}%
                </div>

                <div className="mk-prev-summary__stars">
                  {recommendPercent >= 70 ? "موصى به" : "نسبة التوصية"}
                </div>

                <div className="mk-prev-summary__text">
                  من العملاء يوصون بهذا المنتج
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mk-prev-list">
        {items.length === 0 ? (
          <div className="mk-prev-empty">
            لا توجد تقييمات أو أسئلة منشورة لهذا المنتج حتى الآن.
          </div>
        ) : (
          <>
            {items.map((item) => {
              const reacted = Boolean(helpfulIds[item.id]);
              const reacting = Boolean(reactingIds[item.id]);
              const helpfulCount = Number(item.helpful_count ?? 0);
              const mediaItems = reviewText(item) ? getReviewMedia(item) : [];
              const displayAuthorName = publicAuthorName(
                item.author_name,
                allowHiddenNames,
              );

              return (
                <div key={item.id} className="mk-prev-item">
                  <div className="mk-prev-item__row">
                    <PersonAvatar name={displayAuthorName} />

                    <div className="mk-prev-item__content">
                      <div className="mk-prev-bubble">
                        <div className="mk-prev-bubble__head">
                          <div className="mk-prev-author">
                            {displayAuthorName}
                          </div>

                          <span className={typeBadgeClass(item)}>
                            {typeLabel(item)}
                          </span>

                          {item.review_type === "review" &&
                          Number(item.rating ?? 0) > 0 ? (
                            <div className="mk-prev-stars">
                              {stars(item.rating)}
                            </div>
                          ) : null}

                          {item.is_verified_purchase ? (
                            <span className="mk-prev-verified">شراء موثق</span>
                          ) : null}

                          <div className="mk-prev-date">
                            {formatDate(item.created_at)}
                          </div>
                        </div>

                        {item.title ? (
                          <div className="mk-prev-itemTitle">{item.title}</div>
                        ) : null}

                        {item.body ? (
                          <div className="mk-prev-body">{item.body}</div>
                        ) : null}

                        {mediaItems.length > 0 ? (
                          <div className="mk-prev-media">
                            {mediaItems.map((media, index) => {
                              const src = reviewMediaUrl(media);

                              return (
                                <button
                                  key={media.id || `${item.id}-media-${index}`}
                                  type="button"
                                  className="mk-prev-media__item"
                                  onClick={() => openMediaViewer(item, media)}
                                  aria-label="عرض صورة التقييم"
                                >
                                  <img
                                    src={src}
                                    alt={
                                      s(media.alt_text) ||
                                      s(item.title) ||
                                      s(item.body) ||
                                      "صورة التقييم"
                                    }
                                    loading="lazy"
                                    decoding="async"
                                    className="mk-prev-media__img"
                                  />

                                  {mediaItems.length > 1 ? (
                                    <span className="mk-prev-media__count">
                                      {index + 1}/{mediaItems.length}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        {allowLikes ? (
                          <div className="mk-prev-actions">
                            <button
                              type="button"
                              onClick={() => submitHelpful(item.id)}
                              disabled={reacted || reacting}
                              className={`mk-prev-helpful ${
                                reacted ? "is-active" : ""
                              }`}
                              aria-pressed={reacted}
                              title={
                                reacted
                                  ? "تم تسجيل إعجابك بهذا التعليق"
                                  : "هذا التعليق مفيد"
                              }
                            >
                              <span className="mk-prev-helpful__icon">
                                <LikeIcon />
                              </span>

                              <span>{reacting ? "جاري..." : "مفيد"}</span>

                              {helpfulCount > 0 ? (
                                <span className="mk-prev-helpful__count">
                                  {helpfulCount}
                                </span>
                              ) : null}
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {Array.isArray(item.replies) && item.replies.length > 0 ? (
                        <div className="mk-prev-replies">
                          {item.replies.map((reply) => (
                            <div key={reply.id} className="mk-prev-reply">
                              <PersonAvatar
                                name={
                                  reply.author_type === "admin"
                                    ? "المتجر"
                                    : "العميل"
                                }
                              />

                              <div className="mk-prev-reply__content">
                                <div className="mk-prev-replyBubble">
                                  <div className="mk-prev-replyBubble__head">
                                    <div className="mk-prev-author">
                                      {reply.author_type === "admin"
                                        ? "رد المتجر"
                                        : "رد العميل"}
                                    </div>

                                    <div className="mk-prev-date">
                                      {formatDate(reply.created_at)}
                                    </div>
                                  </div>

                                  <div className="mk-prev-body">{reply.body}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore ? (
              <div className="mk-prev-more">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="mk-prev-more__btn"
                >
                  {loadingMore ? "جاري التحميل..." : "عرض المزيد"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {mounted && mediaViewer && activeReview && activeMedia
        ? createPortal(
            <div
              className="mk-prev-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="معرض صور التقييم"
              onClick={closeMediaViewer}
            >
              <div
                className="mk-prev-lightbox__panel"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="mk-prev-lightbox__close"
                  onClick={closeMediaViewer}
                  aria-label="إغلاق"
                >
                  ×
                </button>

                <div className="mk-prev-lightbox__stage">
                  {mediaViewer.slides.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="mk-prev-lightbox__nav mk-prev-lightbox__nav--right"
                        onClick={() => moveMediaViewer("prev")}
                        aria-label="التقييم السابق"
                      >
                        ›
                      </button>

                      <button
                        type="button"
                        className="mk-prev-lightbox__nav mk-prev-lightbox__nav--left"
                        onClick={() => moveMediaViewer("next")}
                        aria-label="التقييم التالي"
                      >
                        ‹
                      </button>
                    </>
                  ) : null}

                  <img
                    src={reviewMediaOpenUrl(activeMedia)}
                    alt={
                      s(activeMedia.alt_text) ||
                      s(activeReview.title) ||
                      s(activeReview.body) ||
                      "صورة التقييم"
                    }
                    className="mk-prev-lightbox__img"
                  />

                  {mediaViewer.slides.length > 1 ? (
                    <div className="mk-prev-lightbox__counter">
                      تقييم {mediaViewer.index + 1} من {mediaViewer.slides.length}
                    </div>
                  ) : null}
                </div>

                <aside className="mk-prev-lightbox__info">
                  <div className="mk-prev-lightbox__top">
                    <PersonAvatar name={activeAuthorName} />

                    <div className="mk-prev-lightbox__customer">
                      <div className="mk-prev-lightbox__name">
                        {activeAuthorName}
                      </div>

                      <div className="mk-prev-lightbox__date">
                        {formatDate(activeReview.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="mk-prev-lightbox__meta">
                    <span className={typeBadgeClass(activeReview)}>
                      {typeLabel(activeReview)}
                    </span>

                    {activeReview.is_verified_purchase ? (
                      <span className="mk-prev-verified">شراء موثق</span>
                    ) : null}
                  </div>

                  {activeReview.review_type === "review" &&
                  Number(activeReview.rating ?? 0) > 0 ? (
                    <div className="mk-prev-lightbox__rating">
                      <div className="mk-prev-lightbox__ratingText">
                        <span>تقييم العميل</span>
                        <strong>
                          {Number(activeReview.rating ?? 0).toFixed(1)}
                        </strong>
                      </div>

                      <div className="mk-prev-lightbox__stars">
                        {stars(activeReview.rating)}
                      </div>
                    </div>
                  ) : null}

                  {activeText ? (
                    <div className="mk-prev-lightbox__quote">{activeText}</div>
                  ) : null}
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}