import Link from "next/link";

import ProductCard from "@/themes/basit/components/product-card/ProductCard";
import type { MarketingHubConfig } from "@/data/marketing/marketing-hubs.config";

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function MarketingHubScreen({
  config,
  collections,
}: {
  config: MarketingHubConfig;
  collections: any[];
}) {
  return (
    <main className={`mk-marketing-hub mk-marketing-hub--${config.tone} mk-dcat`} dir="rtl">
      <div className="mk-marketing-hub__container mk-dcat__container">
        <header className="mk-marketing-hub__head">
          <span className="mk-marketing-hub__icon" aria-hidden="true">{config.icon}</span>
          <div>
            <span className="mk-marketing-hub__eyebrow">{config.eyebrow}</span>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
        </header>

        {collections.length ? (
          <div className="mk-marketing-hub__list">
            {collections.map((collection) => {
              const hero = collection.imageUrl || collection.mobileImageUrl;
              const starts = formatDate(collection.startsAt);
              const ends = formatDate(collection.endsAt);
              return (
                <section className="mk-marketing-hub__group" key={collection.id}>
                  <Link href={collection.canonicalPath} className="mk-marketing-hub__hero">
                    {hero ? <img src={hero} alt={collection.title} /> : <div className="mk-marketing-hub__fallback" />}
                    <div className="mk-marketing-hub__shade" />
                    <div className="mk-marketing-hub__heroContent">
                      <span
                        className="mk-marketing-hub__badge"
                        style={{ background: collection.badge.bg, color: collection.badge.color }}
                      >
                        {collection.badge.icon ? `${collection.badge.icon} ` : ""}
                        {collection.badge.text}
                      </span>
                      <h2>{collection.title}</h2>
                      {collection.subtitle ? <p>{collection.subtitle}</p> : null}
                      {starts || ends ? (
                        <small>{starts && ends ? `${starts} — ${ends}` : starts ? `يبدأ ${starts}` : `ينتهي ${ends}`}</small>
                      ) : null}
                    </div>
                  </Link>

                  <div className="mk-marketing-hub__toolbar">
                    <div>
                      <strong>{collection.name}</strong>
                      <span>{collection.productCount} منتج</span>
                    </div>
                    <Link href={collection.canonicalPath}>عرض الكل</Link>
                  </div>

                  {collection.products.length ? (
                    <div className="mk-dcat__grid">
                      {collection.products.map((product: any, index: number) => (
                        <ProductCard key={`${collection.id}-${product.id}-${index}`} item={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="mk-marketing-hub__groupEmpty">لا توجد منتجات متاحة في هذه المجموعة الآن.</div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mk-marketing-hub__empty">
            <strong>{config.emptyTitle}</strong>
            <span>{config.emptyDescription}</span>
          </div>
        )}
      </div>

      <style>{`
        .mk-marketing-hub{--hub-accent:#7c3aed;--hub-soft:#f5f3ff;min-height:65vh;padding:24px 0 64px;background:#fff}
        .mk-marketing-hub--seasonal{--hub-accent:#a16207;--hub-soft:#fffbeb}.mk-marketing-hub--best-seller{--hub-accent:#b7791f;--hub-soft:#fff8e6}.mk-marketing-hub--new-arrival{--hub-accent:#047857;--hub-soft:#ecfdf5}.mk-marketing-hub--clearance{--hub-accent:#dc2626;--hub-soft:#fff1f2}.mk-marketing-hub--flash-sale{--hub-accent:#ea580c;--hub-soft:#fff7ed}
        .mk-marketing-hub__container{width:min(1500px,calc(100% - 32px));margin:0 auto}.mk-marketing-hub__head{display:flex;align-items:center;justify-content:center;gap:18px;text-align:right;padding:24px 18px 38px;background:linear-gradient(135deg,var(--hub-soft),#fff);border:1px solid color-mix(in srgb,var(--hub-accent) 16%,#fff);border-radius:18px;margin-bottom:30px}.mk-marketing-hub__icon{width:64px;height:64px;display:grid;place-items:center;border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.08);font-size:30px}.mk-marketing-hub__eyebrow{font-size:13px;font-weight:900;color:var(--hub-accent)}.mk-marketing-hub__head h1{margin:7px 0 6px;font-size:clamp(32px,4vw,54px);line-height:1.1;font-weight:900}.mk-marketing-hub__head p{margin:0;color:#667085;font-size:15px}.mk-marketing-hub__list{display:grid;gap:44px}.mk-marketing-hub__group{display:grid;gap:14px}.mk-marketing-hub__hero{position:relative;display:block;overflow:hidden;border-radius:14px;min-height:250px;background:var(--hub-soft);color:#fff;text-decoration:none}.mk-marketing-hub__hero img,.mk-marketing-hub__fallback{display:block;width:100%;height:clamp(250px,30vw,430px);object-fit:cover}.mk-marketing-hub__fallback{background:linear-gradient(135deg,var(--hub-accent),#111827)}.mk-marketing-hub__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,.66))}.mk-marketing-hub__heroContent{position:absolute;right:clamp(18px,4vw,56px);bottom:clamp(18px,4vw,48px);max-width:720px}.mk-marketing-hub__badge{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:6px;font-size:13px;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.12)}.mk-marketing-hub__heroContent h2{margin:12px 0 7px;font-size:clamp(28px,4vw,50px);line-height:1.1;font-weight:900}.mk-marketing-hub__heroContent p{margin:0 0 8px;font-size:clamp(14px,1.5vw,19px)}.mk-marketing-hub__heroContent small{font-size:13px;opacity:.9}.mk-marketing-hub__toolbar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding:5px 2px 13px}.mk-marketing-hub__toolbar>div{display:flex;align-items:center;gap:12px}.mk-marketing-hub__toolbar strong{font-size:21px}.mk-marketing-hub__toolbar span{color:#667085;font-size:13px}.mk-marketing-hub__toolbar>a{color:#111827;text-decoration:none;font-weight:800;border-bottom:1px solid currentColor;padding-bottom:2px}.mk-marketing-hub__groupEmpty,.mk-marketing-hub__empty{padding:50px 20px;text-align:center;border:1px dashed #d0d5dd;border-radius:12px;color:#667085}.mk-marketing-hub__empty{display:grid;gap:8px;min-height:260px;place-content:center}.mk-marketing-hub__empty strong{font-size:20px;color:#111827}
        @media(max-width:760px){.mk-marketing-hub{padding-top:8px}.mk-marketing-hub__container{width:calc(100% - 12px)}.mk-marketing-hub__head{justify-content:flex-start;padding:18px 14px 24px;border-radius:12px}.mk-marketing-hub__icon{width:50px;height:50px;border-radius:15px;font-size:24px}.mk-marketing-hub__list{gap:30px}.mk-marketing-hub__hero{border-radius:8px;min-height:220px}.mk-marketing-hub__hero img,.mk-marketing-hub__fallback{height:280px}.mk-marketing-hub__heroContent{right:16px;left:16px;bottom:18px}.mk-marketing-hub__toolbar strong{font-size:18px}}
      `}</style>
    </main>
  );
}
