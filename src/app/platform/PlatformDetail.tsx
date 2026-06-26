import Link from "next/link";
import { PlatformButton, TinyIcon } from "./_components/PlatformUi";
import { industries, solutions } from "./_data/site";

export function PlatformDetail({
  eyebrow,
  title,
  description,
  points,
  cta = "ابدأ متجرك مجانًا",
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: readonly string[];
  cta?: string;
}) {
  return (
    <section className="pl-detail-page">
      <div className="pl-shell pl-detail-page__hero">
        <div><span className="pl-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p><div className="pl-detail-page__points">{points.map((point, index)=><span key={point}><i>{index+1}</i>{point}</span>)}</div><div className="pl-detail-page__actions"><PlatformButton href="/platform/pricing" variant="primary">{cta}</PlatformButton><PlatformButton href="/" variant="secondary">العودة للرئيسية</PlatformButton></div></div>
        <div className="pl-detail-page__visual"><div className="pl-detail-orbit"><span>إ</span><i/><i/><i/><i/></div><article><TinyIcon type="chart"/><b>نمو أوضح</b><small>كل تفاصيل تجارتك في مكان واحد</small></article><article><TinyIcon type="store"/><b>إدارة أسهل</b><small>من الفكرة وحتى طلب العميل</small></article></div>
      </div>
      <div className="pl-shell pl-detail-page__related"><h2>اكتشف المزيد من إيلايا</h2><div>{solutions.slice(0,3).map((solution)=><Link href={`/platform/solutions/${solution.slug}`} key={solution.slug}><span>{solution.eyebrow}</span><b>{solution.title}</b></Link>)}</div></div>
    </section>
  );
}

export function ListPage({ type }: { type: "solutions" | "industries" }) {
  const entries = type === "solutions" ? solutions.map((item)=>({slug:item.slug,label:item.eyebrow,title:item.title,description:item.description})) : industries.map((item)=>({slug:item.slug,label:"قطاع إيلايا",title:item.label,description:`حلول متخصصة لمتاجر ${item.label} تساعدك على الإطلاق والنمو بثقة.`}));
  return <section className="pl-list-page"><div className="pl-shell"><span className="pl-kicker">{type === "solutions" ? "حلول إيلايا" : "قطاعات إيلايا"}</span><h1>{type === "solutions" ? "كل ما تحتاجه لتدير تجارتك بثقة" : "حلول متخصصة لكل فكرة تجارية"}</h1><p>تجارب وأدوات عملية صُممت لتكون واضحة في البداية وقوية عند التوسع.</p><div className="pl-list-page__grid">{entries.map((item, index)=><Link href={`/platform/${type}/${item.slug}`} key={item.slug}><span>{String(index+1).padStart(2,"0")}</span><h2>{item.title}</h2><p>{item.description}</p><b>استكشف المزيد ←</b></Link>)}</div></div></section>;
}
