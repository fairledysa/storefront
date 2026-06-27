import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { PlatformFooter } from "./_components/shell/PlatformFooter";

import "./platform.css";

const theme = {
  "--ely-teal": "#073942",
  "--ely-teal-2": "#0B4A54",
  "--ely-mint": "#5DD0B5",
  "--ely-mint-soft": "#EAFBF6",
  "--ely-mint-pale": "#F5FFFC",
  "--ely-ink": "#15323B",
  "--ely-muted": "#607984",
  "--ely-line": "#DCE9E8",
  "--ely-gold": "#E8D6A8",
} as CSSProperties;

function BrandMark() {
  return (
    <Link href="/" className="ely-brand" aria-label="إيلايا">
      <span className="ely-brand__word">
        <strong>إيلايا</strong>
        <small>ELYAIA</small>
      </span>
      <span className="ely-brand__glyph" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </Link>
  );
}


export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ely-platform" style={theme}>
      <div className="ely-topbar">
        <span>✦ منصة إيلايا للتجارة الإلكترونية — ابدأ متجرك في دقائق، وركز على ما يهمك 🚀</span>
      </div>

      <header className="ely-header">
        <div className="ely-header__inner">
          <BrandMark />

          <nav className="ely-nav" aria-label="التنقل الرئيسي">
            <Link href="/platform/solutions">كيف تعمل</Link>
            <Link href="/platform/solutions">الحلول</Link>
            <Link href="/platform/industries">القطاعات</Link>
            <Link href="/platform/pricing">الأسعار</Link>
            <Link href="/platform/success-stories">قصص النجاح</Link>
            <Link href="/platform/partners">الشركاء</Link>
            <Link href="/platform/resources">الموارد</Link>
          </nav>

          <div className="ely-header__actions">
            <a className="ely-login" href="https://e.elyaia.com/login">تسجيل الدخول</a>
            <Link className="ely-header__cta" href="https://e.elyaia.com/register">
              ابدأ متجرك مجانًا
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <PlatformFooter />
    </div>
  );
}
