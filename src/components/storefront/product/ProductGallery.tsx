//apps/storefront/src/components/storefront/product/ProductGallery.tsx
"use client";

import { useMemo, useState } from "react";

type MediaRow = {
  id?: string;
  media_kind?: "image" | "video" | string;
  original_url?: string | null;
  thumbnail_url?: string | null;
  alt?: string | null;
  video_url?: string | null;
  is_default?: boolean;
  sort_order?: number | null;
};

function sortMedia(arr: MediaRow[]) {
  const x = (arr || []).filter(Boolean);
  x.sort((a, b) => {
    const ad = a?.is_default ? 1 : 0;
    const bd = b?.is_default ? 1 : 0;
    if (bd !== ad) return bd - ad;
    return Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0);
  });
  return x;
}

export default function ProductGallery({
  name,
  image_url,
  thumbnail_url,
  media,
}: {
  name: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  media: MediaRow[];
}) {
  const sorted = useMemo(() => sortMedia(media || []), [media]);

  const images = useMemo(
    () =>
      sorted.filter(
        (m) => (m.media_kind || "image") === "image" && !!m.original_url,
      ),
    [sorted],
  );

  const videos = useMemo(
    () =>
      sorted.filter(
        (m) =>
          (m.media_kind || "") === "video" &&
          (!!m.video_url || !!m.original_url),
      ),
    [sorted],
  );

  const initialHero =
    images[0]?.original_url || image_url || thumbnail_url || null;

  const [hero, setHero] = useState<string | null>(initialHero);

  return (
    <div className="mb-6">
      {/* Hero */}
      {hero ? (
        <div className="overflow-hidden rounded-2xl border bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            alt={name}
            className="h-[360px] w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-[260px] items-center justify-center rounded-2xl border bg-slate-50 text-sm text-slate-500">
          لا توجد صورة
        </div>
      )}

      {/* Thumbs */}
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.slice(0, 18).map((m, idx) => {
            const src = m.thumbnail_url || m.original_url || "";
            const isActive = hero === (m.original_url || "");
            return (
              <button
                key={(m.id || src) + idx}
                type="button"
                onClick={() => setHero(m.original_url || null)}
                className={[
                  "overflow-hidden rounded-xl border bg-white text-left",
                  isActive ? "ring-2 ring-slate-900" : "hover:bg-slate-50",
                ].join(" ")}
                title={m.alt || name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={m.alt || name}
                  className="h-20 w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Videos */}
      {videos.length ? (
        <div className="mt-5 space-y-3">
          {videos.slice(0, 3).map((v, idx) => {
            const src = (v.video_url || v.original_url) ?? "";
            if (!src) return null;
            return (
              <div
                key={(v.id || src) + idx}
                className="overflow-hidden rounded-2xl border bg-black"
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={src} controls className="w-full" />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
