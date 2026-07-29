import ProductCard from "@/themes/malak/components/product-card/ProductCard";

export default function MarketingCollectionScreen({ collection }: { collection: any }) {
  const heroImage = collection.imageUrl || collection.mobileImageUrl;

  return (
    <main className="mk-marketing-collection" dir="rtl">
      <div className="mk-marketing-collection__container">
        {heroImage ? (
          <div className="mk-marketing-collection__hero">
            <img src={heroImage} alt={collection.title} />
            <div className="mk-marketing-collection__heroShade" />
            <div className="mk-marketing-collection__heroContent">
              {collection.badge?.text ? <span style={{ background: collection.badge.bg, color: collection.badge.color }}>{collection.badge.icon ? `${collection.badge.icon} ` : ""}{collection.badge.text}</span> : null}
              <h1>{collection.title}</h1>
              {collection.subtitle ? <p>{collection.subtitle}</p> : null}
            </div>
          </div>
        ) : (
          <header className="mk-marketing-collection__head">
            {collection.badge?.text ? <span style={{ background: collection.badge.bg, color: collection.badge.color }}>{collection.badge.icon ? `${collection.badge.icon} ` : ""}{collection.badge.text}</span> : null}
            <h1>{collection.title}</h1>
            {collection.subtitle ? <p>{collection.subtitle}</p> : null}
          </header>
        )}

        {collection.description ? (
          <p className="mk-marketing-collection__description">{collection.description}</p>
        ) : null}

        <div className="mk-marketing-collection__bar">
          <strong>{collection.name}</strong>
          <span>{collection.products.length} منتج</span>
        </div>

        {collection.products.length ? (
          <div className="mk-dcat__grid mk-marketing-collection__grid">
            {collection.products.map((product: any, index: number) => (
              <ProductCard
                key={`${product.id}-${index}`}
                item={{
                  ...product,
                  marketing_badge: collection.badge,
                  marketingCollection: {
                    id: collection.id,
                    slug: collection.slug,
                    type: collection.type,
                    name: collection.name || collection.title,
                  },
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mk-marketing-collection__empty">لا توجد منتجات متاحة في هذه المجموعة الآن.</div>
        )}
      </div>

      <style>{`
        .mk-marketing-collection{padding:18px 0 56px;background:#fff;min-height:60vh}
        .mk-marketing-collection__container{width:min(1500px,calc(100% - 32px));margin:0 auto}
        .mk-marketing-collection__hero{position:relative;overflow:hidden;border-radius:12px;min-height:280px;background:#f3f4f6;margin-bottom:22px}
        .mk-marketing-collection__hero img{display:block;width:100%;height:clamp(280px,34vw,500px);object-fit:cover}
        .mk-marketing-collection__heroShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.05),rgba(0,0,0,.62))}
        .mk-marketing-collection__heroContent{position:absolute;right:clamp(18px,4vw,58px);bottom:clamp(20px,4vw,56px);color:#fff;max-width:620px}
        .mk-marketing-collection__heroContent span,.mk-marketing-collection__head span{display:inline-flex;padding:6px 11px;border-radius:4px;background:#7c3aed;color:#fff;font-size:13px;font-weight:800}
        .mk-marketing-collection__heroContent h1,.mk-marketing-collection__head h1{font-size:clamp(28px,4vw,54px);line-height:1.15;margin:12px 0 8px;font-weight:900}
        .mk-marketing-collection__heroContent p,.mk-marketing-collection__head p{font-size:clamp(14px,1.6vw,20px);margin:0}
        .mk-marketing-collection__head{text-align:center;padding:34px 16px 26px}
        .mk-marketing-collection__description{max-width:900px;margin:0 auto 24px;text-align:center;line-height:1.9;color:#5b6472}
        .mk-marketing-collection__bar{display:flex;align-items:center;justify-content:space-between;padding:14px 2px;border-bottom:1px solid #e8eaed;margin-bottom:14px}
        .mk-marketing-collection__bar strong{font-size:22px}.mk-marketing-collection__bar span{color:#6b7280}
        .mk-marketing-collection__grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px 10px}
        .mk-marketing-collection__empty{padding:70px 20px;text-align:center;border:1px dashed #d7dce2;border-radius:12px;color:#6b7280}
        @media(max-width:1100px){.mk-marketing-collection__grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
        @media(max-width:760px){.mk-marketing-collection{padding-top:8px}.mk-marketing-collection__container{width:calc(100% - 12px)}.mk-marketing-collection__hero{border-radius:7px;min-height:220px}.mk-marketing-collection__hero img{height:280px}.mk-marketing-collection__heroContent{right:16px;bottom:18px;left:16px}.mk-marketing-collection__grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 5px}.mk-marketing-collection__bar strong{font-size:18px}}
      `}</style>
    </main>
  );
}
