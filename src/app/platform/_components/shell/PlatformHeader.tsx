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
          {navItems.map(([label, href], index) => (
            <a href={href} key={label} className={index < 2 ? "plHeader__navHasMenu" : ""}>
              {label}
              {index < 2 ? <span className="plHeader__chevron">⌄</span> : null}
            </a>
          ))}
        </nav>

        <div className="plHeader__actions">
          <a className="plHeader__language" href="#language" aria-label="اللغة الإنجليزية">
            <span className="plHeader__globe">◉</span>
            <span>En</span>
          </a>
          <a className="plHeader__login" href="#login">تسجيل الدخول</a>
          <a className="plHeader__cta" href="#start">ابدأ متجرك مجانًا</a>
        </div>

        <details className="plHeader__mobileMenu">
          <summary aria-label="فتح القائمة">☰</summary>
          <div className="plHeader__mobilePanel">
            {navItems.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
            <a href="#login">تسجيل الدخول</a>
            <a href="#start">ابدأ متجرك مجانًا</a>
          </div>
        </details>
      </div>
    </header>
  );
}
