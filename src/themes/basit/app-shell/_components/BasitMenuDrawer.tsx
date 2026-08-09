"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Icon from "@/components/icon/Icon";
import type { SeoUrlMode } from "@/data/store/settings";
import type { MalakBootstrap } from "../../bootstrap/types";
import CurrencySwitcher from "./CurrencySwitcher";

type Props = {
  open: boolean;
  onClose: () => void;
  bootstrap?: MalakBootstrap;
  seoMode: SeoUrlMode;
  backgroundColor?: string;
  textColor?: string;
  showProductVideos?: boolean;
};

type DrawerCategory = {
  id?: string | number;
  name?: string;
  href?: string;
  url?: string;
  children?: DrawerCategory[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function getHref(item: any) {
  return text(item?.href) || text(item?.url) || "/";
}

export default function BasitMenuDrawer({
  open,
  onClose,
  bootstrap,
  backgroundColor = "#ffffff",
  textColor = "#111111",
  showProductVideos = true,
}: Props) {
  const categories = useMemo<DrawerCategory[]>(() => {
    const rows = (bootstrap as any)?.navigation?.categories;
    return Array.isArray(rows) ? rows : [];
  }, [bootstrap]);

  const [activeCategory, setActiveCategory] = useState<DrawerCategory | null>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activeCategory) {
          setActiveCategory(null);
          return;
        }

        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, activeCategory]);

  useEffect(() => {
    if (open) return;

    const timer = window.setTimeout(() => {
      setActiveCategory(null);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open]);

  const currentCurrency =
    text((bootstrap as any)?.currencies?.selected?.code) ||
    text((bootstrap as any)?.currencies?.default_code) ||
    "SAR";

  const childItems = Array.isArray(activeCategory?.children) ? activeCategory.children : [];
  const level = activeCategory ? 1 : 0;

  return (
    <div
      className="bs-menu-drawer"
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
      style={
        {
          "--bs-sidebar-bg": backgroundColor,
          "--bs-sidebar-text": textColor,
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="bs-menu-drawer__backdrop"
        onClick={onClose}
        aria-label="إغلاق القائمة"
        tabIndex={open ? 0 : -1}
      />

      <aside className="bs-menu-drawer__panel" dir="rtl" role="dialog" aria-modal="true" aria-label="قائمة المتجر">
        <div className="bs-menu-drawer__head">
          <button type="button" className="bs-menu-drawer__close" onClick={onClose} aria-label="إغلاق القائمة">
            <Icon icon={"Cancel01" as any} size={24} />
          </button>

          <div className="bs-menu-drawer__currencyControl">
            {(bootstrap as any)?.currencies?.has_multiple ? (
              <CurrencySwitcher
                storeId={(bootstrap as any)?.store?.id}
                currencies={(bootstrap as any)?.currencies}
              />
            ) : (
              <span className="bs-menu-drawer__currency">{currentCurrency}</span>
            )}
          </div>
        </div>

        <div className="bs-menu-drawer__viewport" data-level={String(level)}>
          <div className="bs-menu-drawer__track">
            <section className="bs-menu-drawer__screen bs-menu-drawer__screen--root" aria-hidden={level !== 0}>
              <nav className="bs-menu-drawer__nav" aria-label="تصنيفات المتجر">
                <Link href="/" prefetch={false} className="bs-menu-drawer__link bs-menu-drawer__link--direct" onClick={onClose}>
                  <span>الرئيسية</span>
                </Link>

                {showProductVideos ? (
                  <Link
                    href="/videos"
                    prefetch={false}
                    className="bs-menu-drawer__link bs-menu-drawer__link--direct bs-menu-drawer__link--videos"
                    onClick={onClose}
                  >
                    <span className="bs-menu-drawer__videoLabel">
                      <Icon icon={"Video01" as any} size={21} />
                      <span>فيديوهات المنتجات</span>
                    </span>
                    <Icon icon={"ArrowLeft01" as any} size={17} />
                  </Link>
                ) : null}

                {categories.map((category) => {
                  const id = text(category?.id) || text(category?.name);
                  const children = Array.isArray(category?.children) ? category.children : [];
                  const label = text(category?.name) || "قسم";

                  if (children.length) {
                    return (
                      <div key={id} className="bs-menu-drawer__item">
                        <div className="bs-menu-drawer__row">
                          <Link
                            href={getHref(category)}
                            prefetch={false}
                            className="bs-menu-drawer__linkText"
                            onClick={onClose}
                          >
                            {label}
                          </Link>

                          <button
                            type="button"
                            className="bs-menu-drawer__expand"
                            onClick={() => setActiveCategory(category)}
                            aria-label={`فتح أقسام ${label}`}
                          >
                            <Icon icon={"ArrowLeft01" as any} size={17} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={id} className="bs-menu-drawer__item">
                      <Link
                        href={getHref(category)}
                        prefetch={false}
                        className="bs-menu-drawer__link bs-menu-drawer__link--direct"
                        onClick={onClose}
                      >
                        <span>{label}</span>
                      </Link>
                    </div>
                  );
                })}
              </nav>

              <div className="bs-menu-drawer__services">
                <Link href="/account/tickets" prefetch={false} onClick={onClose}>
                  <Icon icon={"CustomerService01" as any} size={18} />
                  <span>خدمة العملاء</span>
                </Link>
                <Link href="/account/orders" prefetch={false} onClick={onClose}>
                  <Icon icon={"Package" as any} size={18} />
                  <span>تتبع الطلب</span>
                </Link>
                <Link href="/pages/about" prefetch={false} onClick={onClose}>
                  <Icon icon={"UserMultiple02" as any} size={18} />
                  <span>من نحن</span>
                </Link>
                <Link href="/pages/shipping-policy" prefetch={false} onClick={onClose}>
                  <Icon icon={"DeliveryTruck01" as any} size={18} />
                  <span>سياسة الشحن</span>
                </Link>
              </div>
            </section>

            <section className="bs-menu-drawer__screen bs-menu-drawer__screen--child" aria-hidden={level !== 1}>
              {activeCategory ? (
                <>
                  <button
                    type="button"
                    className="bs-menu-drawer__backLink"
                    onClick={() => setActiveCategory(null)}
                    aria-label="الرجوع إلى القائمة الرئيسية"
                  >
                    <span>الرجوع إلى القائمة الرئيسية</span>
                    <span className="bs-menu-drawer__backIcon">
                      <Icon icon={"ArrowRight01" as any} size={18} />
                    </span>
                  </button>

                  <div className="bs-menu-drawer__sectionTitle">{text(activeCategory?.name) || "القسم"}</div>

                  <nav className="bs-menu-drawer__nav" aria-label={`أقسام ${text(activeCategory?.name) || "القسم"}`}>
                    <Link
                      href={getHref(activeCategory)}
                      prefetch={false}
                      className="bs-menu-drawer__link bs-menu-drawer__link--all"
                      onClick={onClose}
                    >
                      <span>عرض كل {text(activeCategory?.name) || "القسم"}</span>
                    </Link>

                    {childItems.map((child) => {
                      const childId = text(child?.id) || text(child?.name);
                      const grandChildren = Array.isArray(child?.children) ? child.children : [];

                      return (
                        <Link
                          key={childId}
                          href={getHref(child)}
                          prefetch={false}
                          className="bs-menu-drawer__link"
                          onClick={onClose}
                        >
                          <span>{text(child?.name) || "قسم فرعي"}</span>
                          {grandChildren.length > 0 ? (
                            <Icon icon={"ArrowLeft01" as any} size={17} />
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>
                </>
              ) : null}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
