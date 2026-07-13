// FILE: apps/storefront/src/themes/malak/screens-mobile/account/AccountMobileLayout.tsx
"use client";

import {
  Gift,
  Heart,
  MapPin,
  Package,
  Ticket,
  Trophy,
  UserRound,
  UserRoundPlus,
  WalletCards,
  Home,
  ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

type Item = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
};

const ITEMS: Item[] = [
  { key: "account", label: "حسابي", href: "/account", icon: UserRound },
  { key: "orders", label: "طلباتي", href: "/account/orders", icon: Package },
  { key: "addresses", label: "عناويني", href: "/account/addresses", icon: MapPin },
  { key: "wallet", label: "الرصيد والمحفظة", href: "/account/wallet", icon: WalletCards },
  { key: "rewards", label: "مكافآتي", href: "/account/rewards", icon: Trophy },
  { key: "gift_balance", label: "إهداء رصيد", href: "/account/gift-balance", icon: Gift },
  { key: "tickets", label: "تذاكري", href: "/account/tickets", icon: Ticket },
  { key: "refer", label: "أدعُ صديقًا", href: "/account/refer", icon: UserRoundPlus },
  { key: "favorites", label: "المفضلة", href: "/account/favorites", icon: Heart },
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
    <div dir="rtl" lang="ar" className="mk-maccount">
      <header className="mk-maccount__header">
        <div className="mk-maccount__headerRow">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="العودة إلى الرئيسية"
            className="mk-maccount__headerBtn"
          >
            <Home size={17} strokeWidth={2} />
          </button>

          <h1 className="mk-maccount__title">{title}</h1>

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="رجوع"
            className="mk-maccount__headerBtn"
          >
            <ChevronLeft size={19} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <main className="mk-maccount__body">
        <nav className="mk-maccount__nav" aria-label="أدوات الحساب">
          {ITEMS.map((item) => {
            const isActive = item.key === active;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.href)}
                className={`mk-maccount__navItem${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="mk-maccount__navIcon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.9} />
                </span>
                <span className="mk-maccount__navLabel">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {children}
      </main>
    </div>
  );
}
