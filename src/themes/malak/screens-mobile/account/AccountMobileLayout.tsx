// FILE: apps/storefront/src/themes/malak/screens-mobile/account/AccountMobileLayout.tsx
"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Item = {
  key: string;
  label: string;
  href: string;
  icon: string;
};

const ITEMS: Item[] = [
  { key: "account", label: "حسابي", href: "/account", icon: "👤" },
  { key: "orders", label: "طلباتي", href: "/account/orders", icon: "📦" },
  { key: "addresses", label: "عناويني", href: "/account/addresses", icon: "📍" },
  { key: "wallet", label: "الرصيد", href: "/account/wallet", icon: "💳" },
  { key: "rewards", label: "مكافآتي", href: "/account/rewards", icon: "🎁" },
  {
    key: "gift_balance",
    label: "إهداء رصيد",
    href: "/account/gift-balance",
    icon: "🎀",
  },
  { key: "tickets", label: "تذاكري", href: "/account/tickets", icon: "🎫" },
  { key: "refer", label: "أدع صديقًا", href: "/account/refer", icon: "🤝" },
  { key: "favorites", label: "المفضلة", href: "/account/favorites", icon: "❤️" },
];

export default function AccountMobileLayout({
  active,
  title,
  children,
}: {
  active: string;
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div dir="rtl" className="mk-maccount">
      <div className="mk-maccount__header">
        <div className="mk-maccount__headerRow">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="الرئيسية"
            className="mk-maccount__headerBtn"
          >
            ⌂
          </button>

          <div className="mk-maccount__title">{title}</div>

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="رجوع"
            className="mk-maccount__headerBtn"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mk-maccount__body">
        <div className="mk-maccount__nav">
          {ITEMS.map((item) => {
            const isActive = item.key === active;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.href)}
                className={`mk-maccount__navItem ${
                  isActive ? "is-active" : ""
                }`}
              >
                <span className="mk-maccount__navIcon">{item.icon}</span>
                <span className="mk-maccount__navLabel">{item.label}</span>
              </button>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}