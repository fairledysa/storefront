import Link from "next/link";
import MobileMarketingProductsGrid from "./MobileMarketingProductsGrid";

export default function TrendsMobileScreen({ trends }: { trends: any[] }) {
  return (
    <main className="mk-mobile-trends" dir="rtl">
      <header className="mk-mobile-trends__head">
        <span>اكتشف الرائج الآن</span>
        <h1>الترندات</h1>
        <p>جميع الترندات النشطة والمنتجات المرتبطة بها.</p>
      </header>

      {trends.length ? (
        <div className="mk-mobile-trends__list">
          {trends.map((trend) => {
            const hero = trend.mobileImageUrl || trend.imageUrl;
            return (
              <section className="mk-mobile-trends__group" key={trend.id}>
                <Link href={trend.canonicalPath} className="mk-mobile-trends__hero">
                  {hero ? <img src={hero} alt={trend.title} /> : <div className="mk-mobile-trends__fallback" />}
                  <div className="mk-mobile-trends__shade" />
                  <div className="mk-mobile-trends__heroContent">
                    <span style={{ background: trend.badge.bg, color: trend.badge.color }}>{trend.badge.icon ? `${trend.badge.icon} ` : ""}{trend.badge.text}</span>
                    <h2>{trend.title}</h2>
                    {trend.subtitle ? <p>{trend.subtitle}</p> : null}
                  </div>
                </Link>
                <div className="mk-mobile-trends__toolbar">
                  <div><strong>{trend.name}</strong><span>{trend.productCount} منتج</span></div>
                  <Link href={trend.canonicalPath}>عرض الكل</Link>
                </div>
                {trend.products.length ? <MobileMarketingProductsGrid products={trend.products} /> : <div className="mk-mobile-trends__emptyGroup">لا توجد منتجات متاحة الآن.</div>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mk-mobile-trends__empty"><strong>لا توجد ترندات نشطة الآن</strong><span>ستظهر هنا تلقائيًا بعد تفعيلها من الإدارة.</span></div>
      )}

      <style>{`
        .mk-mobile-trends{background:#fff;min-height:65vh;padding:8px 8px 40px}.mk-mobile-trends__head{text-align:center;padding:15px 10px 22px}.mk-mobile-trends__head>span{font-size:11px;font-weight:900;color:#7c3aed}.mk-mobile-trends__head h1{margin:5px 0 4px;font-size:28px}.mk-mobile-trends__head p{margin:0;color:#667085;font-size:12px}.mk-mobile-trends__list{display:grid;gap:28px}.mk-mobile-trends__group{display:grid;gap:10px}.mk-mobile-trends__hero{position:relative;display:block;overflow:hidden;border-radius:11px;min-height:215px;background:#f3f4f6;color:#fff;text-decoration:none}.mk-mobile-trends__hero img,.mk-mobile-trends__fallback{display:block;width:100%;height:255px;object-fit:cover}.mk-mobile-trends__fallback{background:linear-gradient(135deg,#111827,#374151)}.mk-mobile-trends__shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.68),rgba(0,0,0,.02) 72%)}.mk-mobile-trends__heroContent{position:absolute;right:14px;left:14px;bottom:14px}.mk-mobile-trends__heroContent>span{display:inline-flex;padding:5px 9px;border-radius:5px;font-size:11px;font-weight:900}.mk-mobile-trends__heroContent h2{margin:8px 0 3px;font-size:24px}.mk-mobile-trends__heroContent p{margin:0;font-size:12px}.mk-mobile-trends__toolbar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8eaed;padding:3px 1px 9px}.mk-mobile-trends__toolbar>div{display:grid;gap:2px}.mk-mobile-trends__toolbar strong{font-size:16px}.mk-mobile-trends__toolbar span{font-size:11px;color:#667085}.mk-mobile-trends__toolbar>a{font-size:12px;color:#111827;font-weight:900;text-decoration:none;border-bottom:1px solid currentColor}.mk-mobile-trends__emptyGroup,.mk-mobile-trends__empty{padding:32px 14px;text-align:center;border:1px dashed #d0d5dd;border-radius:11px;color:#667085}.mk-mobile-trends__empty{display:grid;gap:5px}.mk-mobile-trends__empty strong{color:#111827;font-size:17px}
      `}</style>
    </main>
  );
}
