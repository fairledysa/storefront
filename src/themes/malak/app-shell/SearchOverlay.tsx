// FILE: apps/storefront/src/themes/malak/app-shell/SearchOverlay.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/icon/Icon";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const POPULAR = [
  "تنت",
  "عدسات يوتيس",
  "توب فيس",
  "واق شمسي",
  "ديور",
  "كلا",
  "نفت",
  "بوچينا",
  "ريفالوفين",
  "يوسرين",
  "كونسيلر",
  "Nyx",
  "قوس",
  "ايسنس",
  "تارت",
  "بلشر",
  "سيروم",
  "مرطب",
  "تونر",
  "Elf",
  "مزل عرق",
  "كحل",
  "ماسكرا",
  "برايمر",
  "غسول",
  "مزيل مكياج",
  "سلبية مسامات",
  "محدد شفاه",
  "عناية كورية",
  "فيتامينات الشعر",
  "فلوليس",
  "مكملات غذائية",
];

const BRANDS = [
  "MESAUDA",
  "BEAUTEUOS",
  "topface",
  "CALLA MAKEUP",
  "FENTY BEAUTY",
  "OLA HAIR",
  "HUDA BEAUTY",
  "MAYBELLINE",
  "SKIN1004",
  "REVOLUTION",
  "LA ROCHE-POSAY",
  "NYX",
  "essence",
  "anua",
  "rfc",
];

export default function SearchOverlay({ open, onOpenChange }: Props) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => inputRef.current?.focus(), 50);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const filteredPopular = useMemo(() => {
    const s = q.trim();
    if (!s) return POPULAR.slice(0, 24);

    return POPULAR.filter((x) =>
      x.toLowerCase().includes(s.toLowerCase()),
    ).slice(0, 24);
  }, [q]);

  const filteredBrands = useMemo(() => {
    const s = q.trim();
    if (!s) return BRANDS;

    return BRANDS.filter((x) => x.toLowerCase().includes(s.toLowerCase()));
  }, [q]);

  if (!open) return null;

  return (
    <div className="mk-search-ov" dir="rtl" role="dialog" aria-modal="true">
      <div className="mk-search-ov__top">
        <button
          type="button"
          className="mk-search-ov__back"
          onClick={() => onOpenChange(false)}
          aria-label="رجوع"
        >
          <Icon icon={"ArrowRight01" as any} size={18} />
        </button>

        <div className="mk-search-ov__bar">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mk-search-ov__input"
            placeholder="بحث..."
          />

          <span className="mk-search-ov__icon" aria-hidden="true">
            <Icon icon={"Search01" as any} size={18} />
          </span>
        </div>

        <button
          type="button"
          className="mk-search-ov__close"
          onClick={() => onOpenChange(false)}
        >
          إلغاء
        </button>
      </div>

      <div className="mk-search-ov__content">
        <h3 className="mk-search-ov__title">عمليات البحث الشعبية</h3>

        <div className="mk-search-ov__chips">
          {filteredPopular.map((t) => (
            <button
              key={t}
              type="button"
              className="mk-search-ov__chip"
              onClick={() => setQ(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <h3 className="mk-search-ov__title">العلامات التجارية الشعبية</h3>

        <div className="mk-search-ov__brands">
          {filteredBrands.map((b) => (
            <button
              key={b}
              type="button"
              className="mk-search-ov__brand"
              onClick={() => setQ(b)}
              aria-label={b}
            >
              <span className="mk-search-ov__brandText">{b}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}