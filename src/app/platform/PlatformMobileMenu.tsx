"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function PlatformMobileMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isMenuOpen]);

  return (
    <>
      <button 
        className="ely-header__mobile-toggle" 
        onClick={() => setIsMenuOpen(true)}
        aria-label="فتح القائمة"
      >
        ☰
      </button>

      <div
        className={`ely-header__mobile-panel ${isMenuOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <button 
          className="ely-header__mobile-close" 
          onClick={() => setIsMenuOpen(false)}
          aria-label="إغلاق القائمة"
        >
          ✕
        </button>
        <nav className="ely-header__mobile-nav">
          <Link href="/platform/solutions" onClick={() => setIsMenuOpen(false)}>كيف تعمل</Link>
          <Link href="/platform/solutions" onClick={() => setIsMenuOpen(false)}>الحلول</Link>
          <Link href="/platform/industries" onClick={() => setIsMenuOpen(false)}>القطاعات</Link>
          <Link href="/platform/pricing" onClick={() => setIsMenuOpen(false)}>الأسعار</Link>
          <Link href="/platform/success-stories" onClick={() => setIsMenuOpen(false)}>قصص النجاح</Link>
          <Link href="/platform/partners" onClick={() => setIsMenuOpen(false)}>الشركاء</Link>
          <Link href="/platform/resources" onClick={() => setIsMenuOpen(false)}>الموارد</Link>
        </nav>
        <div className="ely-header__mobile-actions">
          <a className="ely-login" href="https://e.elyaia.com/login" onClick={() => setIsMenuOpen(false)}>تسجيل الدخول</a>
          <Link className="ely-header__cta" href="https://e.elyaia.com/register" onClick={() => setIsMenuOpen(false)}>
            ابدأ متجرك مجانًا
          </Link>
        </div>
      </div>
    </>
  );
}
