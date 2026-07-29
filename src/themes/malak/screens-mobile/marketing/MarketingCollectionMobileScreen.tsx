import MobileMarketingProductsGrid from "./MobileMarketingProductsGrid";

export default function MarketingCollectionMobileScreen({ collection }: { collection: any }) {
  const heroImage = collection.mobileImageUrl || collection.imageUrl;
  const products = collection.products.map((product: any) => ({
    ...product,
    marketing_badge: collection.badge,
    marketingCollection: {
      id: collection.id,
      slug: collection.slug,
      type: collection.type,
      name: collection.name || collection.title,
    },
  }));

  return (
    <main className="mk-mobile-collection" dir="rtl">
      {heroImage ? (
        <section className="mk-mobile-collection__hero">
          <img src={heroImage} alt={collection.title} />
          <div className="mk-mobile-collection__shade" />
          <div className="mk-mobile-collection__content">
            {collection.badge?.text ? <span style={{ background: collection.badge.bg, color: collection.badge.color }}>{collection.badge.icon ? `${collection.badge.icon} ` : ""}{collection.badge.text}</span> : null}
            <h1>{collection.title}</h1>
            {collection.subtitle ? <p>{collection.subtitle}</p> : null}
          </div>
        </section>
      ) : (
        <header className="mk-mobile-collection__head">
          {collection.badge?.text ? <span style={{ background: collection.badge.bg, color: collection.badge.color }}>{collection.badge.icon ? `${collection.badge.icon} ` : ""}{collection.badge.text}</span> : null}
          <h1>{collection.title}</h1>
          {collection.subtitle ? <p>{collection.subtitle}</p> : null}
        </header>
      )}

      {collection.description ? <p className="mk-mobile-collection__description">{collection.description}</p> : null}
      <div className="mk-mobile-collection__bar"><strong>{collection.name}</strong><span>{products.length} منتج</span></div>
      {products.length ? <MobileMarketingProductsGrid products={products} /> : <div className="mk-mobile-collection__empty">لا توجد منتجات متاحة في هذه المجموعة الآن.</div>}

      <style>{`
        .mk-mobile-collection{background:#fff;min-height:65vh;padding:8px 8px 40px}.mk-mobile-collection__hero{position:relative;overflow:hidden;border-radius:11px;background:#f3f4f6;min-height:220px;margin-bottom:13px}.mk-mobile-collection__hero img{display:block;width:100%;height:280px;object-fit:cover}.mk-mobile-collection__shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.68),rgba(0,0,0,.02) 72%)}.mk-mobile-collection__content{position:absolute;right:14px;left:14px;bottom:15px;color:#fff}.mk-mobile-collection__content>span,.mk-mobile-collection__head>span{display:inline-flex;padding:5px 9px;border-radius:5px;font-size:11px;font-weight:900}.mk-mobile-collection__content h1,.mk-mobile-collection__head h1{margin:8px 0 3px;font-size:26px;line-height:1.15}.mk-mobile-collection__content p,.mk-mobile-collection__head p{margin:0;font-size:12px}.mk-mobile-collection__head{text-align:center;padding:18px 12px}.mk-mobile-collection__description{margin:0 4px 14px;text-align:center;color:#667085;font-size:12px;line-height:1.8}.mk-mobile-collection__bar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8eaed;padding:7px 1px 10px;margin-bottom:10px}.mk-mobile-collection__bar strong{font-size:17px}.mk-mobile-collection__bar span{font-size:11px;color:#667085}.mk-mobile-collection__empty{padding:40px 14px;text-align:center;border:1px dashed #d0d5dd;border-radius:11px;color:#667085}
      `}</style>
    </main>
  );
}
