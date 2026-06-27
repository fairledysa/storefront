import Link from "next/link";

type Props = { kicker: string; title: string; description: string; bullets: string[] };

export function InternalPage({ kicker, title, description, bullets }: Props) {
  return (
    <section className="ely-internal-page">
      <div className="ely-shell">
        <span className="ely-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="ely-internal-page__grid">
          {bullets.map((bullet, i) => <article key={bullet}><span>{String(i + 1).padStart(2, "0")}</span><h2>{bullet}</h2><p>تفاصيل عملية مصممة لتجربة أكثر وضوحًا وتنظيمًا داخل منصة إيلايا.</p></article>)}
        </div>
        <Link href="https://e.elyaia.com/register" className="ely-button ely-button--primary">ابدأ متجرك مجانًا <span>←</span></Link>
      </div>
    </section>
  );
}
