// FILE: apps/storefront/src/themes/malak/screens/page/PageScreen.tsx

import SafePageHtml from "./SafePageHtml";
import HtmlThemeSections from "../../components/theme-page-tools/HtmlThemeSections";

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
  data: StorePageData & { theme?: any; themeOptions?: any; theme_options?: any };
};

function isHtmlPage(type: string) {
  return String(type || "").trim().toLowerCase() === "html";
}

function looksLikeHtml(content: string) {
  const value = String(content || "");

  return (
    (value.includes("<") && value.includes(">")) ||
    (value.includes("&lt;") && value.includes("&gt;"))
  );
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
  const renderAsHtml = isHtmlPage(data?.page_type) || looksLikeHtml(content);

  return (
    <main className="mk-page-screen" dir="rtl">
      <div className="mk-page-screen__container">
        <header className="mk-page-screen__header">
          <h1 className="mk-page-screen__title">{title}</h1>
        </header>

        <article className="mk-page-screen__card">
          {renderAsHtml ? (
            <div className="mk-page-screen__content malak-page-content">
              <SafePageHtml html={content} />
            </div>
          ) : (
            <div className="mk-page-screen__content malak-page-content">
              {nl2brText(content)}
            </div>
          )}
        </article>
        <HtmlThemeSections data={data} pageKey="page" entityId={String(data?.id || "")} />
      </div>
    </main>
  );
}
