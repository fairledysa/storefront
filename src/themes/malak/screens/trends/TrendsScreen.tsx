import Link from "next/link";

import ProductCard from "@/themes/malak/components/product-card/ProductCard";

export default function TrendsScreen({ trends }: { trends: any[] }) {
  return (
    <main className="mk-trends-page mk-dcat" dir="rtl">
      <div className="mk-trends-page__container mk-dcat__container">
        <header className="mk-trends-page__head">
          <span className="mk-trends-page__eyebrow">اكتشف الرائج الآن</span>
          <h1>الترندات</h1>
          <p>جميع الترندات النشطة والمنتجات المرتبطة بها في مكان واحد.</p>
        </header>

        {trends.length ? (
          <div className="mk-trends-page__list">
            {trends.map((trend) => {
              const hero = trend.imageUrl || trend.mobileImageUrl;
              return (
                <section className="mk-trends-group" key={trend.id}>
                  <Link href={trend.canonicalPath} className="mk-trends-group__hero">
                    {hero ? <img src={hero} alt={trend.title} /> : <div className="mk-trends-group__fallback" />}
                    <div className="mk-trends-group__shade" />
                    <div className="mk-trends-group__content">
                      <span
                        className="mk-trends-group__badge"
                        style={{ background: trend.badge.bg, color: trend.badge.color }}
                      >
                        {trend.badge.icon ? `${trend.badge.icon} ` : ""}
                        {trend.badge.text}
                      </span>
                      <h2>{trend.title}</h2>
                      {trend.subtitle ? <p>{trend.subtitle}</p> : null}
                    </div>
                  </Link>

                  <div className="mk-trends-group__toolbar">
                    <div>
                      <strong>{trend.name}</strong>
                      <span>{trend.productCount} منتج</span>
                    </div>
                    <Link href={trend.canonicalPath}>عرض الكل</Link>
                  </div>

                  {trend.products.length ? (
                    <div className="mk-dcat__grid">
                      {trend.products.map((product: any, index: number) => (
                        <ProductCard key={`${trend.id}-${product.id}-${index}`} item={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="mk-trends-group__empty">لا توجد منتجات متاحة في هذا الترند الآن.</div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mk-trends-page__empty">
            <strong>لا توجد ترندات نشطة الآن</strong>
            <span>عند تفعيل أي مجموعة من نوع ترند ستظهر هنا تلقائيًا.</span>
          </div>
        )}
      </div>

      <style>{`
        .mk-trends-page{min-height:65vh;padding:24px 0 64px;background:#fff}
        .mk-trends-page__container{width:min(1500px,calc(100% - 32px));margin:0 auto}
        .mk-trends-page__head{text-align:center;padding:20px 12px 34px}
        .mk-trends-page__eyebrow{font-size:13px;font-weight:800;color:#6b7280}
        .mk-trends-page__head h1{margin:8px 0 6px;font-size:clamp(32px,4vw,54px);line-height:1.15;font-weight:900}
        .mk-trends-page__head p{margin:0;color:#667085;font-size:15px}
        .mk-trends-page__list{display:grid;gap:44px}
        .mk-trends-group{display:grid;gap:14px}
        .mk-trends-group__hero{position:relative;display:block;overflow:hidden;border-radius:12px;min-height:250px;background:#f3f4f6;color:#fff;text-decoration:none}
        .mk-trends-group__hero img,.mk-trends-group__fallback{display:block;width:100%;height:clamp(250px,30vw,430px);object-fit:cover}
        .mk-trends-group__fallback{background:linear-gradient(135deg,#111827,#374151)}
        .mk-trends-group__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,.62))}
        .mk-trends-group__content{position:absolute;right:clamp(18px,4vw,56px);bottom:clamp(18px,4vw,48px);max-width:700px}
        .mk-trends-group__badge{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:5px;font-size:13px;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.12)}
        .mk-trends-group__content h2{margin:12px 0 7px;font-size:clamp(28px,4vw,50px);line-height:1.1;font-weight:900}
        .mk-trends-group__content p{margin:0;font-size:clamp(14px,1.5vw,19px)}
        .mk-trends-group__toolbar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding:5px 2px 13px}
        .mk-trends-group__toolbar>div{display:flex;align-items:center;gap:12px}.mk-trends-group__toolbar strong{font-size:21px}.mk-trends-group__toolbar span{color:#667085;font-size:13px}
        .mk-trends-group__toolbar>a{color:#111827;text-decoration:none;font-weight:800;border-bottom:1px solid currentColor;padding-bottom:2px}
        .mk-trends-group__empty,.mk-trends-page__empty{padding:50px 20px;text-align:center;border:1px dashed #d0d5dd;border-radius:12px;color:#667085}
        .mk-trends-page__empty{display:grid;gap:8px}.mk-trends-page__empty strong{font-size:20px;color:#111827}
        @media(max-width:760px){.mk-trends-page{padding-top:8px}.mk-trends-page__container{width:calc(100% - 12px)}.mk-trends-page__head{padding:16px 10px 24px}.mk-trends-page__list{gap:30px}.mk-trends-group__hero{border-radius:8px;min-height:220px}.mk-trends-group__hero img,.mk-trends-group__fallback{height:280px}.mk-trends-group__content{right:16px;left:16px;bottom:18px}.mk-trends-group__toolbar strong{font-size:18px}}
      `}</style>
    </main>
  );
}
