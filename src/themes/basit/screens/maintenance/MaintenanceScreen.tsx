// FILE: apps/storefront/src/themes/basit/screens/maintenance/MaintenanceScreen.tsx

import type { CSSProperties } from "react";

type ContactItem = {
  id: string;
  title: string;
  value?: string | null;
  href: string;
};

type Props = {
  data?: {
    store?: {
      name?: string | null;
      logo_url?: string | null;
      favicon_url?: string | null;
    };
    appearance?: Record<string, any> | null;
    maintenance?: {
      title?: string | null;
      message?: string | null;
      show_contact_methods?: boolean | null;
    } | null;
    contactItems?: ContactItem[];
  };
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

export default function MaintenanceScreen({ data }: Props) {
  const store = data?.store ?? {};
  const appearance = data?.appearance ?? {};
  const maintenance = data?.maintenance ?? {};

  const storeName = s(store.name) || "المتجر";
  const logoUrl = s(store.logo_url) || s(store.favicon_url);

  const title = s(maintenance.title) || "المتجر مغلق حاليًا";
  const message =
    s(maintenance.message) ||
    "عذرًا عزيزي العميل، المتجر حاليًا قيد الصيانة وسنعاود العمل خلال وقت قريب.";

  const primary =
    s(appearance.primary_color) ||
    s(appearance.brand_color) ||
    s(appearance.accent_color) ||
    "#111827";

  const pageBg = s(appearance.store_bg) || "#ffffff";
  const textColor = s(appearance.store_text_color) || "#111827";
  const mutedColor = s(appearance.store_text_color_secondary) || "#64748b";

  const contactItems = Array.isArray(data?.contactItems)
    ? data.contactItems.filter((item) => s(item.href) && s(item.title))
    : [];

  const style = {
    "--mk-maint-primary": primary,
    "--mk-maint-bg": pageBg,
    "--mk-maint-text": textColor,
    "--mk-maint-muted": mutedColor,
  } as CSSProperties;

  return (
    <main className="mk-maintenance" dir="rtl" style={style}>
      <section className="mk-maintenance__wrap">
        <div className="mk-maintenance__card">
          <div className="mk-maintenance__brand">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="mk-maintenance__logo"
              />
            ) : (
              <div className="mk-maintenance__logoFallback">{storeName[0]}</div>
            )}

            <div className="mk-maintenance__brandText">
              <span className="mk-maintenance__eyebrow">وضع الصيانة</span>
              <strong>{storeName}</strong>
            </div>
          </div>

          <div className="mk-maintenance__hero">
            <div className="mk-maintenance__icon" aria-hidden="true">
              <span />
            </div>

            <h1>{title}</h1>

            <p>{message}</p>
          </div>

          {maintenance.show_contact_methods !== false && contactItems.length > 0 ? (
            <div className="mk-maintenance__contacts">
              <div className="mk-maintenance__contactsTitle">
                يمكنك التواصل معنا عبر
              </div>

              <div className="mk-maintenance__contactsGrid">
                {contactItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="mk-maintenance__contact"
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      item.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    <span>{item.title}</span>
                    {item.value ? <small>{item.value}</small> : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}