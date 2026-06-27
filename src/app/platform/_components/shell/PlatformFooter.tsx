import Link from "next/link";

type FooterIconName =
  | "apple"
  | "play"
  | "arrow"
  | "bell"
  | "box"
  | "chart"
  | "check"
  | "headset";

function FooterIcon({
  name,
  size = 20,
}: {
  name: FooterIconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "apple") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.6 12.8c0-2.05 1.68-3.04 1.76-3.09-.96-1.4-2.45-1.59-2.98-1.62-1.26-.13-2.47.74-3.12.74-.66 0-1.67-.72-2.75-.7-1.41.02-2.72.82-3.45 2.08-1.47 2.54-.38 6.28 1.05 8.29.7.98 1.53 2.08 2.62 2.04 1.05-.04 1.45-.67 2.72-.67 1.26 0 1.62.67 2.73.65 1.13-.02 1.84-1.01 2.54-2 .8-1.13 1.12-2.23 1.14-2.28-.03-.01-2.18-.84-2.18-3.39ZM15.55 6.74c.59-.71.98-1.69.87-2.67-.84.03-1.86.56-2.46 1.27-.54.62-1.01 1.62-.88 2.57.94.07 1.9-.47 2.47-1.17Z" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.2 3.9v16.2c0 .8.86 1.3 1.55.9l13.25-7.8a1.16 1.16 0 0 0 0-2L5.75 3a1.04 1.04 0 0 0-1.55.9Z" fill="currentColor" />
        <path d="m13.2 7.2 4.3 2.52M13.2 16.8l4.3-2.52" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 22h4" />
      </svg>
    );
  }

  if (name === "box") {
    return (
      <svg {...common}>
        <path d="m21 8-9 5-9-5 9-5 9 5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 2 5-6" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4.5 4.5L19 7" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 14a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2h-2v-6h4" />
      <path d="M4 13v6h4v-6H4Z" />
      <path d="M12 21h2" />
    </svg>
  );
}

function FooterBrand() {
  return (
    <Link href="/" className="ely-premium-footer__brand" aria-label="إيلايا الرئيسية">
      <span className="ely-premium-footer__brand-word">
        <strong>إيلايا</strong>
        <small>ELYAIA</small>
      </span>
      <span className="ely-premium-footer__brand-glyph" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </Link>
  );
}

const linkGroups = [
  {
    title: "عن إيلايا",
    links: [
      { label: "من نحن", href: "/platform/about" },
      { label: "قصص النجاح", href: "/platform/success-stories" },
      { label: "الشركاء", href: "/platform/partners" },
      { label: "تواصل معنا", href: "/platform/contact" },
      { label: "سياسة الخصوصية", href: "/platform/privacy" },
      { label: "حذف الحساب", href: "/platform/account-deletion" },
    ],
  },
  {
    title: "للتجار",
    links: [
      { label: "خدمات التاجر", href: "/platform/services" },
      { label: "تطبيقات وتكاملات", href: "/platform/apps" },
      { label: "كبار التجار", href: "/platform/enterprise" },
      { label: "مركز الموارد", href: "/platform/resources" },
    ],
  },
  {
    title: "نمِّ تجارتك",
    links: [
      { label: "تصميم المتجر", href: "/platform/solutions/store-builder" },
      { label: "المدفوعات", href: "/platform/solutions/payments" },
      { label: "الشحن والتوصيل", href: "/platform/solutions/shipping" },
      { label: "التسويق", href: "/platform/solutions/marketing" },
    ],
  },
  {
    title: "اكتشف إيلايا",
    links: [
      { label: "كيف تعمل المنصة", href: "/platform/solutions" },
      { label: "الحلول", href: "/platform/solutions" },
      { label: "القطاعات", href: "/platform/industries" },
      { label: "الأسعار والباقات", href: "/platform/pricing" },
    ],
  },
] as const;

export function PlatformFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="ely-premium-footer">
      <section className="ely-premium-footer__app" id="app-download">
        <div className="ely-shell ely-premium-footer__app-inner">
          <div className="ely-premium-footer__app-copy">
            <span className="ely-premium-footer__eyebrow">
              <span className="ely-premium-footer__eyebrow-dot" />
              تطبيق إيلايا للتجار
            </span>

            <h2>
              تجارتك معك،
              <em> في كل مكان.</em>
            </h2>

            <p>
              تابع طلباتك ومبيعاتك ومنتجاتك لحظة بلحظة، وخذ قراراتك من مكان واحد أينما كنت.
            </p>

            <div className="ely-premium-footer__download-actions" aria-label="تحميل تطبيق إيلايا">
              <Link className="ely-premium-footer__store-button" href="/platform/apps">
                <FooterIcon name="apple" size={25} />
                <span>
                  <small>حمّل من</small>
                  <b>App Store</b>
                </span>
              </Link>

              <Link className="ely-premium-footer__store-button" href="/platform/apps">
                <FooterIcon name="play" size={24} />
                <span>
                  <small>متوفر على</small>
                  <b>Google Play</b>
                </span>
              </Link>
            </div>

            <div className="ely-premium-footer__app-features">
              <span><FooterIcon name="bell" size={15} /> إشعارات فورية</span>
              <span><FooterIcon name="box" size={15} /> إدارة الطلبات</span>
              <span><FooterIcon name="chart" size={15} /> تقارير سريعة</span>
            </div>
          </div>

          <div className="ely-premium-footer__app-visual" aria-hidden="true">
            <div className="ely-premium-footer__orb ely-premium-footer__orb--one" />
            <div className="ely-premium-footer__orb ely-premium-footer__orb--two" />
            <div className="ely-premium-footer__grid" />

            <div className="ely-premium-footer__phone">
              <div className="ely-premium-footer__phone-notch" />
              <div className="ely-premium-footer__phone-screen">
                <div className="ely-premium-footer__phone-head">
                  <span className="ely-premium-footer__mini-brand">إيلايا</span>
                  <span className="ely-premium-footer__phone-bell"><FooterIcon name="bell" size={15} /></span>
                </div>

                <div className="ely-premium-footer__phone-greeting">
                  <small>صباح الخير،</small>
                  <strong>متجر إيلايا</strong>
                </div>

                <div className="ely-premium-footer__phone-sales">
                  <span>مبيعات اليوم</span>
                  <b>متابعة اليوم</b>
                  <i>أداء أوضح</i>
                  <div className="ely-premium-footer__phone-bars">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="ely-premium-footer__phone-orders-head">
                  <b>أحدث الطلبات</b>
                  <small>عرض الكل</small>
                </div>

                <div className="ely-premium-footer__phone-order">
                  <span className="ely-premium-footer__phone-order-icon"><FooterIcon name="box" size={15} /></span>
                  <span><b>طلب جديد</b><small>قيد المتابعة</small></span>
                  <em>الآن</em>
                </div>

                <div className="ely-premium-footer__phone-order">
                  <span className="ely-premium-footer__phone-order-icon ely-premium-footer__phone-order-icon--mint"><FooterIcon name="check" size={15} /></span>
                  <span><b>طلب مكتمل</b><small>تم الشحن</small></span>
                  <em>محدّث</em>
                </div>

                <div className="ely-premium-footer__phone-nav">
                  <span className="is-active" />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="ely-premium-footer__floating-card ely-premium-footer__floating-card--order">
              <span className="ely-premium-footer__floating-card-icon"><FooterIcon name="box" size={17} /></span>
              <span><small>طلب جديد</small><b>متابعة فورية</b></span>
              <em>الآن</em>
            </div>

            <div className="ely-premium-footer__floating-card ely-premium-footer__floating-card--growth">
              <span className="ely-premium-footer__growth-line">↗</span>
              <span><small>نمو المبيعات</small><b>رؤية أوضح</b></span>
            </div>
          </div>
        </div>
      </section>

      <section className="ely-premium-footer__main">
        <div className="ely-shell ely-premium-footer__main-grid">
          <div className="ely-premium-footer__identity">
            <FooterBrand />
            <p>
              منصة تجارة إلكترونية عربية تجمع لك أدوات بناء المتجر، إدارة الطلبات،
              المدفوعات، الشحن، والتسويق في تجربة واحدة واضحة.
            </p>

            <Link href="/platform/contact" className="ely-premium-footer__support">
              <span className="ely-premium-footer__support-icon"><FooterIcon name="headset" size={19} /></span>
              <span>
                <small>تحتاج مساعدة؟</small>
                <b>فريق إيلايا قريب منك</b>
              </span>
              <FooterIcon name="arrow" size={17} />
            </Link>

            <div className="ely-premium-footer__trust">
              <span><i /> تجربة عربية أولًا</span>
              <span><i /> دعم للتاجر في كل مرحلة</span>
            </div>
          </div>

          <div className="ely-premium-footer__links">
            {linkGroups.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                <div>
                  {group.links.map((link) => (
                    <Link href={link.href} key={link.label}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <div className="ely-premium-footer__bottom">
        <div className="ely-shell ely-premium-footer__bottom-inner">
          <span>© {currentYear} إيلايا. جميع الحقوق محفوظة.</span>

          <div className="ely-premium-footer__legal">
            <Link href="/platform/privacy">سياسة الخصوصية</Link>
            <Link href="/terms">الشروط والأحكام</Link>
          </div>

          <span className="ely-premium-footer__signature">
            <i /> صُنع للتجارة العربية
          </span>
        </div>
      </div>
    </footer>
  );
}
