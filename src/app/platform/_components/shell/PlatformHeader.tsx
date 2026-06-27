function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`plBrand ${compact ? "plBrand--compact" : ""}`} href="/" aria-label="إيلايا الرئيسية">
      <span className="plBrand__word">
        <b>إيلايا</b>
        <small>ELYAIA</small>
      </span>
      <span className="plBrand__icon" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </a>
  );
}

const navItems = [
  ["الحلول", "#solutions"],
  ["القطاعات", "#industries"],
  ["الشركاء", "#partners"],
  ["قصص النجاح", "#stories"],
  ["الأسعار", "#pricing"],
];

export function PlatformHeader() {
  return (
    <header className="plHeader">
      <div className="plHeader__inner">
        <BrandMark />

        <nav className="plHeader__nav" aria-label="التنقل الرئيسي">
          {navItems.map(([label, href]) => (
            <a href={href} key={label}>
              {label}
            </a>
          ))}
        </nav>

        <div className="plHeader__actions">
          <a className="plHeader__login" href="https://e.elyaia.com/login">تسجيل الدخول</a>
          <a className="plHeader__cta" href="https://e.elyaia.com/register">ابدأ متجرك مجانًا</a>
        </div>

        <details className="plHeader__mobileMenu">
          <summary aria-label="فتح القائمة">☰</summary>
          <div className="plHeader__mobilePanel">
            {navItems.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
            <a href="https://e.elyaia.com/login">تسجيل الدخول</a>
            <a href="https://e.elyaia.com/register">ابدأ متجرك مجانًا</a>
          </div>
        </details>
      </div>
    </header>
  );
}
