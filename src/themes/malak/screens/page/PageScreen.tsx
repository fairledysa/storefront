// FILE: apps/storefront/src/themes/malak/screens/page/PageScreen.tsx

type StorePageData = {
  id: string;
  title: string;
  page_type: string;
  content: string;
  seo_title?: string | null;
  seo_slug?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  data: StorePageData;
};

function isHtmlPage(type: string) {
  return String(type || "").trim().toLowerCase() === "html";
}

function nl2brText(content: string) {
  return String(content || "")
    .split(/\n/g)
    .map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
}

export default function PageScreen({ data }: Props) {
  const title = String(data?.title || "").trim();
  const content = String(data?.content || "");

  return (
    <main className="mk-page-screen" dir="rtl">
      <div className="mk-page-screen__container">
        <header className="mk-page-screen__header">
          <div className="mk-page-screen__eyebrow">صفحة تعريفية</div>
          <h1 className="mk-page-screen__title">{title}</h1>
        </header>

        <article className="mk-page-screen__card">
          {isHtmlPage(data?.page_type) ? (
            <div
              className="mk-page-screen__content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="mk-page-screen__content">{nl2brText(content)}</div>
          )}
        </article>
      </div>
    </main>
  );
}