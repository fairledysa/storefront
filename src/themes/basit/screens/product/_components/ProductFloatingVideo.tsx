"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ProductShortItem = {
  id: string;
  title: string;
  href?: string;
  price?: string;
  image?: string;
  videoSrc: string;
  poster?: string;
  rating?: number;
  reviewsCount?: number;
  raw?: any;
};

export type ProductProductShortItem = ProductShortItem;

type Props = {
  src: string;
  poster?: string | null;
  title?: string | null;
  shortsEnabled?: boolean;
  commentsEnabled?: boolean;
  commentSubmissionEnabled?: boolean;
  allowGuestComments?: boolean;
  /** Legacy fallbacks kept for older callers. */
  questionsEnabled?: boolean;
  allowGuestQuestions?: boolean;
  allowHiddenNames?: boolean;
  items?: ProductShortItem[];
  hideFloatingLauncher?: boolean;
  openShortsSignal?: number;
  initialShortIndex?: number;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function maskPublicName(name?: string | null) {
  const clean = text(name);
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

function publicAuthorName(name: unknown, allowHiddenNames: boolean) {
  const clean = text(name) || "زائر";
  return allowHiddenNames ? maskPublicName(clean) : clean;
}

function itemPrice(item: ProductShortItem) {
  if (text(item.price)) return text(item.price);

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

  const symbol = text(
    raw?.pricing?.currencySymbol ??
      raw?.pricing?.currency_symbol ??
      raw?.currency_symbol ??
      raw?.currencySymbol ??
      raw?.currency ??
      "SAR",
  );

  return `${Number(value).toFixed(2)} ${symbol}`.trim();
}

const MAX_COMMENT_LENGTH = 120;

function getReviewSessionId() {
  if (typeof window === "undefined") return "";

  const key = "review_session_id";
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

function readMuxPlaybackId(src: string) {
  const value = text(src);
  const match = value.match(/stream\.mux\.com\/([^/?#.]+)(?:\.m3u8)?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function postPlayerMethod(
  iframe: HTMLIFrameElement | null,
  method: "play" | "pause" | "mute" | "unmute",
) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({
      context: "player.js",
      version: "0.0.11",
      method,
    }),
    "https://player.mux.com",
  );
}

function VideoMedia({
  item,
  active,
  controls = false,
  muted = true,
}: {
  item: ProductShortItem;
  active: boolean;
  controls?: boolean;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const muxPlaybackId = useMemo(() => readMuxPlaybackId(item.videoSrc), [item.videoSrc]);

  // Sound changes must never recreate the media or seek it back to the start.
  useEffect(() => {
    const video = ref.current;
    if (video) {
      video.defaultMuted = muted;
      video.muted = muted;
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;
    postPlayerMethod(iframe, muted ? "mute" : "unmute");
  }, [muted]);

  // Start only the active slide and pause the others. Keep this independent
  // from the sound state so toggling sound does not restart playback.
  useEffect(() => {
    const video = ref.current;
    if (video) {
      if (!active) {
        video.pause();
        return;
      }

      let cancelled = false;
      let retryTimer: number | null = null;
      let attempts = 0;

      const startPlayback = () => {
        if (cancelled || !ref.current) return;
        const currentVideo = ref.current;
        currentVideo.playsInline = true;
        currentVideo.defaultMuted = muted;
        currentVideo.muted = muted;
        const attempt = currentVideo.play();
        if (attempt && typeof attempt.catch === "function") {
          void attempt.catch(() => {
            if (cancelled || attempts >= 12) return;
            attempts += 1;
            retryTimer = window.setTimeout(startPlayback, 180);
          });
        }
      };

      startPlayback();
      return () => {
        cancelled = true;
        if (retryTimer !== null) window.clearTimeout(retryTimer);
      };
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    if (!active) {
      postPlayerMethod(iframe, "pause");
      return;
    }

    // Start muted first so mobile autoplay succeeds, then restore the user's
    // selected sound state without rebuilding the iframe or restarting time.
    postPlayerMethod(iframe, "mute");
    postPlayerMethod(iframe, "play");
    if (!muted) {
      window.setTimeout(() => postPlayerMethod(iframeRef.current, "unmute"), 80);
    }
  }, [active, item.videoSrc]);

  if (muxPlaybackId) {
    return (
      <iframe
        ref={iframeRef}
        src={`https://player.mux.com/${encodeURIComponent(muxPlaybackId)}?autoplay=false&muted=true&loop=true&playsinline=true`}
        title={item.title || "فيديو المنتج"}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        onLoad={() => {
          const iframe = iframeRef.current;
          if (!iframe) return;
          if (!active) {
            postPlayerMethod(iframe, "pause");
            return;
          }
          postPlayerMethod(iframe, "mute");
          postPlayerMethod(iframe, "play");
          if (!muted) {
            window.setTimeout(() => postPlayerMethod(iframeRef.current, "unmute"), 80);
          }
        }}
      />
    );
  }

  const ensurePlaying = () => {
    if (!active || !ref.current) return;
    ref.current.defaultMuted = muted;
    ref.current.muted = muted;
    void ref.current.play().catch(() => undefined);
  };

  return (
    <video
      ref={ref}
      src={item.videoSrc}
      poster={item.poster || undefined}
      controls={controls}
      playsInline
      muted
      autoPlay={active}
      loop
      preload={active ? "auto" : "metadata"}
      onCanPlay={ensurePlaying}
      onLoadedData={ensurePlaying}
      onLoadedMetadata={ensurePlaying}
    />
  );
}

function ReviewCommentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 18.25 4 20l.85-3.75A8 8 0 1 1 7.5 18.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10.5h8M8 13.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m17 9 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.25 10.9 7.5-4.65M8.25 13.1l7.5 4.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}


function optionalNumberFrom(source: any, keys: string[]) {
  for (const key of keys) {
    const raw = source?.[key];
    if (raw === null || raw === undefined || raw === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function totalReviewActivity(summaryPayload: any, reviewsPayload: any, visibleItems: any[]) {
  const summary = summaryPayload?.data ?? summaryPayload ?? {};
  const response = reviewsPayload?.data ?? reviewsPayload ?? {};

  // Prefer an explicit all-types total when the API supplies one.
  const explicitTotal = optionalNumberFrom(response, [
    "total",
    "totalCount",
    "total_count",
  ]) ?? optionalNumberFrom(summary, [
    "total",
    "totalCount",
    "total_count",
    "allCount",
    "all_count",
  ]);

  if (explicitTotal !== null) return Math.max(explicitTotal, visibleItems.length);

  // Otherwise add the three independent type counters only when present.
  const reviews = optionalNumberFrom(summary, [
    "totalReviews",
    "total_reviews",
    "reviewsCount",
    "reviews_count",
  ]);
  const comments = optionalNumberFrom(summary, [
    "totalComments",
    "total_comments",
    "commentsCount",
    "comments_count",
  ]);
  const questions = optionalNumberFrom(summary, [
    "totalQuestions",
    "total_questions",
    "questionsCount",
    "questions_count",
  ]);

  const typedCounts = [reviews, comments, questions].filter(
    (value): value is number => value !== null,
  );

  return Math.max(
    typedCounts.length ? typedCounts.reduce((sum, value) => sum + value, 0) : 0,
    visibleItems.length,
  );
}

function reviewItemsFrom(payload: any) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];

  return items.filter((item: any) =>
    ["review", "comment", "question"].includes(String(item?.review_type)),
  );
}

function getReviewMedia(review: any) {
  if (!Array.isArray(review?.media)) return [];
  return review.media
    .filter((media: any) => {
      const url = text(media?.thumbnail_url) || text(media?.file_url);
      const type = text(media?.media_type || "image");
      return Boolean(url) && type !== "video";
    })
    .sort((a: any, b: any) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0));
}

export default function ProductFloatingVideo({
  src,
  poster,
  title,
  shortsEnabled = false,
  commentsEnabled = false,
  commentSubmissionEnabled,
  allowGuestComments,
  questionsEnabled = true,
  allowGuestQuestions = false,
  allowHiddenNames = true,
  items = [],
  hideFloatingLauncher = false,
  openShortsSignal = 0,
  initialShortIndex = 0,
}: Props) {
  const [open, setOpen] = useState(true);
  const [shortsOpen, setShortsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  const [authed, setAuthed] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentFocused, setCommentFocused] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shortsMuted, setShortsMuted] = useState(true);
  const shareMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const shortsFeedRef = useRef<HTMLDivElement | null>(null);
  const canSubmitComments = commentSubmissionEnabled ?? questionsEnabled;
  const canGuestComment = allowGuestComments ?? allowGuestQuestions;

  const feed = useMemo<ProductShortItem[]>(() => {
    const fallback: ProductShortItem = {
      id: "current-product",
      title: text(title) || "المنتج",
      videoSrc: text(src),
      poster: text(poster),
    };
    const source = items.length ? items : [fallback];
    const seen = new Set<string>();
    return source.filter((item) => {
      if (!text(item.videoSrc)) return false;
      const key = `${item.id}:${item.videoSrc}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items, poster, src, title]);

  const current = feed[activeIndex] ?? feed[0];

  function showShareMessage(message: string) {
    setShareMessage(message);
    if (shareMessageTimerRef.current) clearTimeout(shareMessageTimerRef.current);
    shareMessageTimerRef.current = setTimeout(() => setShareMessage(""), 2200);
  }

  async function shareProduct(item: ProductShortItem) {
    if (typeof window === "undefined") return;

    const href = text(item.href);
    const url = href && href !== "#" ? new URL(href, window.location.origin).toString() : window.location.href;
    const shareData = {
      title: text(item.title) || "المنتج",
      text: text(item.title) || "شاهد هذا المنتج",
      url,
    };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      showShareMessage("تم نسخ رابط المنتج");
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      showShareMessage("تعذر مشاركة رابط المنتج");
    }
  }

  async function fetchReviewState(productId: string) {
    const query = new URLSearchParams({
      target_type: "product",
      target_id: productId,
      page: "1",
      page_size: "100",
      sort: "newest",
    });

    const [summaryResponse, reviewsResponse] = await Promise.all([
      fetch(
        `/api/reviews/summary?target_type=product&target_id=${encodeURIComponent(productId)}`,
        { cache: "no-store" },
      ),
      fetch(`/api/reviews?${query.toString()}`, { cache: "no-store" }),
    ]);

    if (!summaryResponse.ok || !reviewsResponse.ok) {
      throw new Error("تعذر تحميل التعليقات والتقييمات");
    }

    const [summaryJson, reviewsJson] = await Promise.all([
      summaryResponse.json(),
      reviewsResponse.json(),
    ]);
    const items = reviewItemsFrom(reviewsJson);

    return {
      items,
      total: totalReviewActivity(summaryJson, reviewsJson, items),
    };
  }

  useEffect(() => {
    if (!openShortsSignal || !shortsEnabled || !feed.length) return;
    const safeIndex = Math.min(Math.max(initialShortIndex, 0), feed.length - 1);
    setActiveIndex(safeIndex);
    setCommentsOpen(false);
    setShortsOpen(true);
  }, [openShortsSignal, shortsEnabled, initialShortIndex, feed.length]);

  useEffect(() => {
    if (!shortsOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const node = shortsFeedRef.current?.querySelector<HTMLElement>(`[data-short-index="${activeIndex}"]`);
      node?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shortsOpen]);

  useEffect(() => {
    if (!shortsOpen) return;
    const nodes = Array.from(
      shortsFeedRef.current?.querySelectorAll<HTMLElement>("[data-short-index]") ?? [],
    );
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.shortIndex ?? 0);
        if (Number.isFinite(index) && index !== activeIndex) {
          setActiveIndex(index);
        }
      },
      { threshold: [0.6, 0.85] },
    );
    nodes.forEach((node) => observerRef.current?.observe(node));
    return () => observerRef.current?.disconnect();
  }, [shortsOpen, feed.length, activeIndex]);

  useEffect(() => {
    if (!shortsOpen) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    let attempts = 0;

    const playActiveSlide = () => {
      if (cancelled) return;
      const activeSlide = shortsFeedRef.current?.querySelector<HTMLElement>(
        `[data-short-index="${activeIndex}"]`,
      );
      const activeVideo = activeSlide?.querySelector<HTMLVideoElement>("video");
      const activeIframe = activeSlide?.querySelector<HTMLIFrameElement>("iframe");

      if (activeVideo) {
        activeVideo.defaultMuted = shortsMuted;
        activeVideo.muted = shortsMuted;
        activeVideo.playsInline = true;

        const playback = activeVideo.play();
        if (playback && typeof playback.catch === "function") {
          void playback.catch(() => {
            if (cancelled || attempts >= 12) return;
            attempts += 1;
            retryTimer = window.setTimeout(playActiveSlide, 180);
          });
        }
        return;
      }

      if (activeIframe) {
        postPlayerMethod(activeIframe, "mute");
        postPlayerMethod(activeIframe, "play");
        if (!shortsMuted) {
          window.setTimeout(() => postPlayerMethod(activeIframe, "unmute"), 80);
        }
      }
    };

    const frame = window.requestAnimationFrame(playActiveSlide);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [shortsOpen, activeIndex]);

  useEffect(() => {
    if (!commentsOpen) return;

    let cancelled = false;
    fetch("/api/auth/me", { method: "GET", cache: "no-store" })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok || !json?.authed) {
          setAuthed(false);
          setCustomerName("");
          return;
        }
        setAuthed(true);
        setCustomerName(text(json?.customer?.full_name));
      })
      .catch(() => {
        if (cancelled) return;
        setAuthed(false);
        setCustomerName("");
      });

    return () => {
      cancelled = true;
    };
  }, [commentsOpen]);

  useEffect(() => {
    if (!commentsEnabled || !current?.id) return;

    let cancelled = false;
    const productId = String(current.id);

    setCommentBody("");
    setCommentFocused(false);
    setCommentMessage("");
    if (commentsOpen) {
      setReviews([]);
      setLoadingReviews(true);
    }

    fetchReviewState(productId)
      .then((state) => {
        if (cancelled) return;
        setReviewCounts((prev) => ({ ...prev, [productId]: state.total }));
        if (commentsOpen) setReviews(state.items);
      })
      .catch(() => {
        if (cancelled) return;
        if (commentsOpen) setReviews([]);
      })
      .finally(() => {
        if (!cancelled && commentsOpen) setLoadingReviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [commentsEnabled, commentsOpen, current?.id]);

  useEffect(() => {
    if (!shortsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShortsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("mk-shorts-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("mk-shorts-open");
    };
  }, [shortsOpen]);

  if (!open || !text(src)) return null;

  const submitComment = async () => {
    if (!canSubmitComments || !current?.id || sendingComment) return;

    const cleanBody = text(commentBody);
    if (cleanBody.length < 3 || cleanBody.length > MAX_COMMENT_LENGTH) return;

    if (!authed && !canGuestComment) {
      setCommentMessage("لا يمكنك كتابة تعليق، الرجاء تسجيل الدخول أولًا");
      return;
    }

    setSendingComment(true);
    setCommentMessage("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "product",
          target_id: String(current.id),
          review_type: "comment",
          body: cleanBody,
          author_name: authed && customerName ? customerName : "زائر",
          session_id: getReviewSessionId(),
        }),
      });

      const json = await response.json();
      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || "تعذر إرسال التعليق");
      }

      setCommentBody("");
      setCommentMessage(
        json?.moderation === "published"
          ? "تم إرسال تعليقك بنجاح."
          : "تم إرسال تعليقك وبانتظار المراجعة.",
      );

      const productId = String(current.id);
      const state = await fetchReviewState(productId);
      setReviews(state.items);
      setReviewCounts((prev) => ({
        ...prev,
        [productId]:
          json?.moderation === "published"
            ? Math.max(state.total, (prev[productId] ?? 0) + 1)
            : state.total,
      }));
    } catch (error: any) {
      setCommentMessage(text(error?.message) || "تعذر إرسال التعليق.");
    } finally {
      setSendingComment(false);
    }
  };

  const toggleShortsSound = () => {
    const nextMuted = !shortsMuted;

    const activeSlide = shortsFeedRef.current?.querySelector<HTMLElement>(
      `[data-short-index="${activeIndex}"]`,
    );
    const activeVideo = activeSlide?.querySelector<HTMLVideoElement>("video");
    const activeIframe = activeSlide?.querySelector<HTMLIFrameElement>("iframe");

    // Apply the sound change directly to the existing player before updating
    // React state. This preserves the current playback position.
    if (activeVideo) {
      activeVideo.defaultMuted = nextMuted;
      activeVideo.muted = nextMuted;
      if (activeVideo.paused) void activeVideo.play().catch(() => undefined);
    } else if (activeIframe) {
      postPlayerMethod(activeIframe, nextMuted ? "mute" : "unmute");
      postPlayerMethod(activeIframe, "play");
    }

    setShortsMuted(nextMuted);
  };

  const addToCart = (item: ProductShortItem) => {
    const raw = item.raw ?? {};
    const hasOptions = Boolean(
      (Array.isArray(raw?.options) && raw.options.length) ||
      (Array.isArray(raw?.variants) && raw.variants.length),
    );
    window.dispatchEvent(
      new CustomEvent(hasOptions ? "product:quickview" : "product:add-to-cart", {
        detail: { ...raw, id: item.id, product_id: item.id, title: item.title, name: item.title, quickView: hasOptions },
      }),
    );
  };

  return (
    <>
      {!hideFloatingLauncher ? (
        <aside className="mk-product-floating-video" aria-label={text(title) || "فيديو المنتج"}>
          <button
            type="button"
            className="mk-product-floating-video__close"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            aria-label="إغلاق فيديو المنتج"
          >
            ×
          </button>
          <div className="mk-product-floating-video__media">
            <VideoMedia item={feed[0]} active={!shortsOpen} controls={!shortsEnabled} />
            {shortsEnabled ? (
              <button
                type="button"
                className="mk-product-floating-video__openShorts"
                onClick={() => setShortsOpen(true)}
                aria-label="فتح الفيديوهات القصيرة"
              >
                <span className="mk-product-floating-video__hint">اضغط للمشاهدة</span>
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}

      {shortsEnabled && shortsOpen ? (
        <div className="mk-product-shorts" role="dialog" aria-modal="true" aria-label="فيديوهات المنتجات القصيرة">
          <button className="mk-product-shorts__close" type="button" onClick={() => setShortsOpen(false)} aria-label="إغلاق">×</button>
          <div className="mk-product-shorts__feed" ref={shortsFeedRef}>
            {feed.map((item, index) => (
              <article className="mk-product-shorts__slide" data-short-index={index} key={`${item.id}-${item.videoSrc}`}>
                <div className="mk-product-shorts__video"><VideoMedia item={item} active={activeIndex === index} muted={shortsMuted} /></div>
                <div className="mk-product-shorts__shade" />
                <div className="mk-product-shorts__product" dir="rtl">
                  {item.image ? (
                    item.href && item.href !== "#" ? (
                      <a className="mk-product-shorts__productLink mk-product-shorts__productImageLink" href={item.href} aria-label={`عرض ${item.title}`}>
                        <img src={item.image} alt={item.title} />
                      </a>
                    ) : <img src={item.image} alt={item.title} />
                  ) : null}
                  <div className="mk-product-shorts__meta">
                    {item.href && item.href !== "#" ? (
                      <a className="mk-product-shorts__productLink" href={item.href}><strong>{item.title}</strong></a>
                    ) : <strong>{item.title}</strong>}
                    {itemPrice(item) ? (
                      <span className="mk-product-shorts__price" aria-label={`سعر المنتج ${itemPrice(item)}`}>
                        {itemPrice(item)}
                      </span>
                    ) : null}
                    {item.rating ? <small>★ {item.rating.toFixed(1)} {item.reviewsCount ? `(${item.reviewsCount})` : ""}</small> : null}
                  </div>
                  <button type="button" onClick={() => addToCart(item)}>أضف للسلة</button>
                </div>
                <button
                  className={`mk-product-shorts__soundBtn${commentsEnabled ? "" : " mk-product-shorts__soundBtn--solo"}`}
                  type="button"
                  onClick={toggleShortsSound}
                  aria-label={shortsMuted ? "تشغيل صوت الفيديو" : "كتم صوت الفيديو"}
                  aria-pressed={!shortsMuted}
                >
                  <span className="mk-product-shorts__soundIcon"><VolumeIcon muted={shortsMuted} /></span>
                  <small>{shortsMuted ? "الصوت" : "كتم"}</small>
                </button>
                <button
                  className={`mk-product-shorts__shareBtn${commentsEnabled ? "" : " mk-product-shorts__shareBtn--solo"}`}
                  type="button"
                  onClick={() => void shareProduct(item)}
                  aria-label={`مشاركة رابط ${item.title}`}
                >
                  <span className="mk-product-shorts__shareIcon"><ShareIcon /></span>
                  <small>مشاركة</small>
                </button>
                {commentsEnabled ? (
                  <button className="mk-product-shorts__commentsBtn" type="button" onClick={() => setCommentsOpen(true)} aria-label="عرض تعليقات وتقييمات المنتج">
                    <span className="mk-product-shorts__commentsIcon"><ReviewCommentIcon /></span>
                    <small>{reviewCounts[String(item.id)] ?? item.reviewsCount ?? 0}</small>
                  </button>
                ) : null}
              </article>
            ))}
          </div>

          {shareMessage ? (
            <div className="mk-product-shorts__shareToast" role="status" aria-live="polite">
              {shareMessage}
            </div>
          ) : null}

          {commentsEnabled && commentsOpen ? (
            <aside className="mk-product-shorts__comments" dir="rtl">
              <div className="mk-product-shorts__commentsHead">
                <strong>تعليقات وتقييمات المنتج</strong>
                <button type="button" onClick={() => setCommentsOpen(false)}>×</button>
              </div>
              <div className="mk-product-shorts__commentsBody">
                {canSubmitComments ? (
                  <div className="mk-product-shorts__commentForm">
                    {!authed && !canGuestComment ? (
                      <div className="mk-product-shorts__commentBlocked">
                        لا يمكنك كتابة تعليق، الرجاء تسجيل الدخول أولًا
                      </div>
                    ) : (
                      <div className="mk-product-shorts__composer">
                        <div className="mk-product-shorts__composerAvatar" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7"/><path d="M5.5 19c.8-3.5 3-5.3 6.5-5.3s5.7 1.8 6.5 5.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                        </div>
                        <div className="mk-product-shorts__composerMain">
                          <textarea
                            value={commentBody}
                            onFocus={() => setCommentFocused(true)}
                            onChange={(event) =>
                              setCommentBody(event.target.value.slice(0, MAX_COMMENT_LENGTH))
                            }
                            placeholder="إضافة تعليق..."
                            rows={1}
                            maxLength={MAX_COMMENT_LENGTH}
                          />
                          {commentFocused || commentBody.length ? (
                            <div className="mk-product-shorts__commentFormFooter">
                              <small>
                                {commentBody.length}/{MAX_COMMENT_LENGTH}
                              </small>
                              <div className="mk-product-shorts__composerActions">
                                <button
                                  className="mk-product-shorts__commentCancel"
                                  type="button"
                                  onClick={() => {
                                    setCommentBody("");
                                    setCommentFocused(false);
                                    setCommentMessage("");
                                  }}
                                >
                                  إلغاء
                                </button>
                                <button
                                  className="mk-product-shorts__commentSubmit"
                                  type="button"
                                  onClick={submitComment}
                                  disabled={
                                    sendingComment ||
                                    text(commentBody).length < 3 ||
                                    text(commentBody).length > MAX_COMMENT_LENGTH
                                  }
                                >
                                  {sendingComment ? "جاري الإرسال…" : "تعليق"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {commentMessage ? (
                      <div className="mk-product-shorts__commentMessage">{commentMessage}</div>
                    ) : null}
                  </div>
                ) : null}
                {loadingReviews ? <p>جاري تحميل التعليقات…</p> : null}
                {!loadingReviews && !reviews.length ? <p>لا توجد تعليقات حتى الآن.</p> : null}
                {reviews.map((review) => {
                  const media = getReviewMedia(review);
                  return (
                    <div className="mk-product-shorts__review" key={String(review.id)}>
                      <div>
                        <strong>{publicAuthorName(review.customer_name ?? review.author_name, allowHiddenNames)}</strong>
                        <span>{"★".repeat(Math.max(0, Math.min(5, Number(review.rating ?? 0))))}</span>
                      </div>
                      <p>{text(review.comment ?? review.content ?? review.body ?? review.title)}</p>
                      {media.length ? (
                        <div className="mk-product-shorts__reviewMedia">
                          {media.map((item: any) => {
                            const src = text(item?.thumbnail_url) || text(item?.file_url);
                            return <a href={text(item?.file_url) || src} target="_blank" rel="noreferrer" key={String(item?.id || src)}><img src={src} alt={text(item?.alt_text) || "صورة مرفقة مع التقييم"} /></a>;
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
