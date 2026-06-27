import type { ReactNode } from "react";

import { BrandMark, PlatformButton } from "../ui/PlatformUI";
import { Icon } from "../ui/Icon";

const nav = [
  ["كيف تعمل", "#how-it-works"],
  ["الحلول", "#solutions"],
  ["القطاعات", "#industries"],
  ["الشركاء", "#enterprise"],
  ["قصص النجاح", "#stories"],
];

const footerGroups = [
  { title: "المنصة", links: ["عن إيلايا", "خطط الأسعار", "تواصل معنا", "قصص النجاح"] },
  { title: "الحلول", links: ["المتجر الإلكتروني", "المدفوعات", "الشحن والتوصيل", "التسويق"] },
  { title: "الموارد", links: ["مركز المساعدة", "أكاديمية إيلايا", "مدونة التجارة", "دليل البدء"] },
  { title: "للأعمال", links: ["كبار التجار", "خدمات التاجر", "متجر التطبيقات", "برنامج الشركاء"] },
];

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="platformTopline">
        <div className="platformContainer platformTopline__inner">
          <span><Icon name="spark" size={15} /> تجارة تنمو على إيقاعك، لا على تعقيد الأدوات.</span>
          <a href="#how-it-works">شاهد كيف تعمل <Icon name="arrow" size={15} /></a>
        </div>
      </div>

      <header className="platformHeader">
        <div className="platformContainer platformHeader__inner">
          <a href="/" className="platformHeader__brand" aria-label="إيلايا الرئيسية"><BrandMark /></a>
          <nav className="platformHeader__nav" aria-label="التنقل الرئيسي">
            {nav.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
          </nav>
          <div className="platformHeader__actions">
            <a href="#footer" className="platformHeader__lang"><Icon name="globe" size={16} /> En</a>
            <a href="https://e.elyaia.com/login" className="platformHeader__login">تسجيل الدخول</a>
            <PlatformButton href="https://e.elyaia.com/register" tone="dark" icon="arrow">ابدأ تجارتك</PlatformButton>
          </div>
          <details className="platformMobile">
            <summary aria-label="فتح القائمة"><Icon name="menu" size={22} /></summary>
            <div className="platformMobile__panel">
              {nav.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
              <PlatformButton href="https://e.elyaia.com/register" tone="dark" icon="arrow">ابدأ تجارتك</PlatformButton>
            </div>
          </details>
        </div>
      </header>

      <main>{children}</main>

      <footer className="platformFooter" id="footer">
        <div className="platformContainer">
          <div className="platformFooter__lead">
            <div>
              <BrandMark />
              <p>منصة تجارة إلكترونية تجمع كل حركة في متجرك، من أول منتج حتى آخر عميل.</p>
              <div className="platformFooter__socials"><span>in</span><span>𝕏</span><span>◉</span><span>▶</span></div>
            </div>
            <div className="platformFooter__download">
              <span>حمّل تطبيق التاجر</span>
              <div><b> App Store</b><b>▶ Google Play</b></div>
            </div>
          </div>
          <div className="platformFooter__links">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map((link) => <a href="#footer" key={link}>{link}</a>)}
              </div>
            ))}
          </div>
          <div className="platformFooter__bottom"><span>© {new Date().getFullYear()} إيلايا. جميع الحقوق محفوظة.</span><span><a href="#footer">سياسة الخصوصية</a><a href="#footer">الشروط والأحكام</a></span></div>
        </div>
      </footer>
    </>
  );
}
