// FILE: apps/storefront/src/themes/basit/screens/home/_components/PromoBanners.tsx
"use client";

import Link from "next/link";

type Banner = {
  href: string;
  src: string;
  srcSet?: string;
  alt?: string;
  title?: string;
};

function s(v: any) {
  return String(v ?? "").trim();
}

function isCircularLinksMode(items: Banner[]) {
  return Array.isArray(items) && items.length > 0;
}

function isExternalHref(href: string) {
  const x = s(href).toLowerCase();
  return x.startsWith("http://") || x.startsWith("https://") || x.startsWith("//");
}

export default function PromoBanners(props: {
  title?: string;
  items?: Banner[];
}) {
  const items: Banner[] = Array.isArray(props.items)
    ? props.items
        .map((item) => ({
          href: s(item?.href) || "#",
          src: s(item?.src),
          srcSet: s(item?.srcSet) || undefined,
          alt: s(item?.alt || item?.title || "link"),
          title: s(item?.title),
        }))
        .filter((item) => item.src)
    : [];

  if (items.length === 0) return null;

  const sectionTitle = s(props.title);
  const circularMode = isCircularLinksMode(items);

  if (circularMode) {
    return (
      <section dir="rtl" className="mk-circle-links">
        <div className="mk-circle-links__wrap">
          {sectionTitle ? (
            <div className="mk-circle-links__head">
              <h2 className="mk-circle-links__title">{sectionTitle}</h2>
            </div>
          ) : null}

          <div className="mk-circle-links__grid">
            {items.map((item, idx) => {
              const content = (
                <>
                  <div className="mk-circle-links__imageWrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      srcSet={item.srcSet}
                      alt={item.alt || item.title || "link"}
                      loading="lazy"
                      className="mk-circle-links__image"
                    />
                  </div>

                  <div className="mk-circle-links__label">
                    {s(item.title) || `رابط ${idx + 1}`}
                  </div>
                </>
              );

              if (isExternalHref(item.href)) {
                return (
                  <a
                    key={`${item.href}-${idx}`}
                    href={item.href}
                    className="mk-circle-links__item"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={`${item.href}-${idx}`}
                  href={item.href || "#"}
                  className="mk-circle-links__item"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        <style jsx global>{`
          .mk-circle-links {
            margin: 20px 0 0;
          }

          .mk-circle-links__wrap {
            width: 100%;
          }

          .mk-circle-links__head {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 0 12px 12px;
          }

          .mk-circle-links__title {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            line-height: 1.4;
            color: #111827;
          }

          .mk-circle-links__grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px 12px;
            padding: 0 12px;
          }

          .mk-circle-links__item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            text-decoration: none;
          }

          .mk-circle-links__imageWrap {
            width: 100%;
            aspect-ratio: 1 / 1;
            max-width: 112px;
            border-radius: 9999px;
            overflow: hidden;
            background: #f3f4f6;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
            transition:
              transform 0.18s ease,
              box-shadow 0.18s ease;
          }

          .mk-circle-links__item:hover .mk-circle-links__imageWrap {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
          }

          .mk-circle-links__image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .mk-circle-links__label {
            margin-top: 10px;
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.6;
            color: #111827;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 42px;
          }

          @media (min-width: 768px) {
            .mk-circle-links__head {
              padding-left: 0;
              padding-right: 0;
            }

            .mk-circle-links__grid {
              grid-template-columns: repeat(6, minmax(0, 1fr));
              padding-left: 0;
              padding-right: 0;
              gap: 20px 16px;
            }

            .mk-circle-links__imageWrap {
              max-width: 132px;
            }

            .mk-circle-links__label {
              font-size: 14px;
            }
          }
        `}</style>
      </section>
    );
  }

  return null;
}