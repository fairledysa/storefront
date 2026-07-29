"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MarketingData = {
  badge?: {
    text?: string | null;
    bg?: string | null;
    color?: string | null;
    icon?: string | null;
  } | null;
  collection?: {
    id?: string | null;
    slug?: string | null;
    type?: string | null;
    name?: string | null;
  } | null;
};

type Props = {
  productId?: string | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeTag(value: unknown) {
  const valueText = text(value).replace(/^#+/, "");
  return valueText ? `#${valueText.replace(/\s+/g, "_")}` : "";
}

export default function ProductMarketingBanner({ productId }: Props) {
  const id = text(productId);
  const [marketing, setMarketing] = useState<MarketingData | null>(null);

  useEffect(() => {
    if (!id) {
      setMarketing(null);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/catalog/product-marketing?ids=${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.items?.[id] ?? null;
      })
      .then((value) => setMarketing(value))
      .catch((error) => {
        if (error?.name !== "AbortError") setMarketing(null);
      });

    return () => controller.abort();
  }, [id]);

  const view = useMemo(() => {
    const badgeText = text(marketing?.badge?.text);
    const collectionName = text(marketing?.collection?.name);
    const slug = text(marketing?.collection?.slug);

    if (!badgeText && !collectionName) return null;

    return {
      badgeText: badgeText || "ترندات",
      collectionTag: normalizeTag(collectionName || badgeText),
      icon: text(marketing?.badge?.icon),
      bg: text(marketing?.badge?.bg) || "#8b5cf6",
      color: text(marketing?.badge?.color) || "#ffffff",
      href: slug ? `/collections/${encodeURIComponent(slug)}` : "",
    };
  }, [marketing]);

  if (!view) return null;

  const content = (
    <>
      <span
        className="mk-dproduct-marketingBanner__badge"
        style={{ backgroundColor: view.bg, color: view.color }}
      >
        {view.icon ? <span aria-hidden="true">{view.icon}</span> : null}
        <span>{view.badgeText}</span>
      </span>

      <span className="mk-dproduct-marketingBanner__content">
        <strong>{view.collectionTag}</strong>
        <small>هذا المنتج ضمن مجموعة رائجة</small>
      </span>

      {view.href ? (
        <span className="mk-dproduct-marketingBanner__action">عرض المجموعة</span>
      ) : null}
    </>
  );

  return view.href ? (
    <Link className="mk-dproduct-marketingBanner" href={view.href}>
      {content}
    </Link>
  ) : (
    <div className="mk-dproduct-marketingBanner">{content}</div>
  );
}
