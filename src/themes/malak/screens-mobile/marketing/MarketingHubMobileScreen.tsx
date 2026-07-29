import Link from "next/link";

import type { MarketingHubConfig } from "@/data/marketing/marketing-hubs.config";
import MobileMarketingProductsGrid from "./MobileMarketingProductsGrid";

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function MarketingHubMobileScreen({
  config,
  collections,
}: {
  config: MarketingHubConfig;
  collections: any[];
}) {
  return (
    <main className={`mk-mobile-marketing mk-mobile-marketing--${config.tone}`} dir="rtl">
      <header className="mk-mobile-marketing__head">
        <span className="mk-mobile-marketing__headIcon" aria-hidden="true">{config.icon}</span>
        <div>
          <span>{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
      </header>

      {collections.length ? (
        <div className="mk-mobile-marketing__list">
          {collections.map((collection) => {
            const hero = collection.mobileImageUrl || collection.imageUrl;
            const starts = formatDate(collection.startsAt);
            const ends = formatDate(collection.endsAt);

            return (
              <section className="mk-mobile-marketing__group" key={collection.id}>
                <Link href={collection.canonicalPath} className="mk-mobile-marketing__hero">
                  {hero ? <img src={hero} alt={collection.title} /> : <div className="mk-mobile-marketing__fallback" />}
                  <div className="mk-mobile-marketing__shade" />
                  <div className="mk-mobile-marketing__heroContent">
                    <span style={{ background: collection.badge.bg, color: collection.badge.color }}>
                      {collection.badge.icon ? `${collection.badge.icon} ` : ""}{collection.badge.text}
                    </span>
                    <h2>{collection.title}</h2>
                    {collection.subtitle ? <p>{collection.subtitle}</p> : null}
                    {starts || ends ? <small>{starts && ends ? `${starts} — ${ends}` : starts ? `يبدأ ${starts}` : `ينتهي ${ends}`}</small> : null}
                  </div>
                </Link>

                <div className="mk-mobile-marketing__toolbar">
                  <div><strong>{collection.name}</strong><span>{collection.productCount} منتج</span></div>
                  <Link href={collection.canonicalPath}>عرض الكل</Link>
                </div>

                {collection.products.length ? (
                  <MobileMarketingProductsGrid products={collection.products} />
                ) : (
                  <div className="mk-mobile-marketing__emptyGroup">لا توجد منتجات متاحة الآن.</div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mk-mobile-marketing__empty"><strong>{config.emptyTitle}</strong><span>{config.emptyDescription}</span></div>
      )}

      <style>{`
        .mk-mobile-marketing{--accent:#7c3aed;--soft:#f5f3ff;background:#fff;min-height:65vh;padding:8px 8px 40px}
        .mk-mobile-marketing--seasonal{--accent:#a16207;--soft:#fffbeb}.mk-mobile-marketing--best-seller{--accent:#b7791f;--soft:#fff8e6}.mk-mobile-marketing--new-arrival{--accent:#047857;--soft:#ecfdf5}.mk-mobile-marketing--clearance{--accent:#dc2626;--soft:#fff1f2}.mk-mobile-marketing--flash-sale{--accent:#ea580c;--soft:#fff7ed}
        .mk-mobile-marketing__head{display:flex;gap:11px;align-items:flex-start;padding:16px 13px;margin-bottom:18px;border:1px solid color-mix(in srgb,var(--accent) 16%,#fff);background:linear-gradient(135deg,var(--soft),#fff);border-radius:14px}.mk-mobile-marketing__headIcon{width:46px;height:46px;flex:0 0 46px;display:grid;place-items:center;background:#fff;border-radius:14px;font-size:23px;box-shadow:0 8px 22px rgba(15,23,42,.08)}.mk-mobile-marketing__head>div>span{font-size:11px;font-weight:900;color:var(--accent)}.mk-mobile-marketing__head h1{margin:4px 0;font-size:24px;line-height:1.2}.mk-mobile-marketing__head p{margin:0;color:#667085;font-size:12px;line-height:1.65}
        .mk-mobile-marketing__list{display:grid;gap:28px}.mk-mobile-marketing__group{display:grid;gap:10px}.mk-mobile-marketing__hero{position:relative;display:block;overflow:hidden;border-radius:11px;background:var(--soft);min-height:210px;color:#fff;text-decoration:none}.mk-mobile-marketing__hero img,.mk-mobile-marketing__fallback{display:block;width:100%;height:255px;object-fit:cover}.mk-mobile-marketing__fallback{background:linear-gradient(135deg,var(--accent),#111827)}.mk-mobile-marketing__shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.68),rgba(0,0,0,.02) 70%)}.mk-mobile-marketing__heroContent{position:absolute;right:14px;left:14px;bottom:14px}.mk-mobile-marketing__heroContent>span{display:inline-flex;padding:5px 9px;border-radius:5px;font-size:11px;font-weight:900}.mk-mobile-marketing__heroContent h2{margin:8px 0 3px;font-size:24px;line-height:1.15}.mk-mobile-marketing__heroContent p{margin:0 0 4px;font-size:12px}.mk-mobile-marketing__heroContent small{font-size:10px;opacity:.9}
        .mk-mobile-marketing__toolbar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8eaed;padding:3px 1px 9px}.mk-mobile-marketing__toolbar>div{display:grid;gap:2px}.mk-mobile-marketing__toolbar strong{font-size:16px}.mk-mobile-marketing__toolbar span{font-size:11px;color:#667085}.mk-mobile-marketing__toolbar>a{font-size:12px;color:#111827;font-weight:900;text-decoration:none;border-bottom:1px solid currentColor}.mk-mobile-marketing__emptyGroup,.mk-mobile-marketing__empty{padding:32px 14px;text-align:center;border:1px dashed #d0d5dd;border-radius:11px;color:#667085}.mk-mobile-marketing__empty{display:grid;gap:5px;margin-top:20px}.mk-mobile-marketing__empty strong{font-size:17px;color:#111827}
      `}</style>
    </main>
  );
}
