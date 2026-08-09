// FILE: apps/storefront/src/themes/basit/screens/account/AccountLayout.tsx
"use client";

import { useRouter } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  Gift,
  Heart,
  LogOut,
  MapPin,
  Package,
  Settings,
  Share2,
  Ticket,
  Trophy,
  User,
  Wallet,
} from "lucide-react";

type NavIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

type Item = {
  label: string;
  href: string;
  key: string;
  icon: NavIcon;
};

const ITEMS: Item[] = [
  { key: "account", label: "الملف الشخصي", href: "/account", icon: User },
  { key: "orders", label: "الطلبات", href: "/account/orders", icon: Package },
  { key: "addresses", label: "العناوين", href: "/account/addresses", icon: MapPin },
  { key: "favorites", label: "المفضلة", href: "/account/favorites", icon: Heart },
  { key: "wallet", label: "الرصيد والمحفظة", href: "/account/wallet", icon: Wallet },
  { key: "rewards", label: "مكافآتي", href: "/account/rewards", icon: Trophy },
  { key: "gift_balance", label: "إهداء رصيد", href: "/account/gift-balance", icon: Gift },
  { key: "tickets", label: "تذاكري", href: "/account/tickets", icon: Ticket },
  { key: "refer", label: "أدع صديقًا", href: "/account/refer", icon: Share2 },
];

function getInitial(name?: string | null) {
  const value = String(name || "").trim();
  return value ? value.slice(0, 1) : "س";
}

export default function AccountLayout({
  active,
  title,
  subtitle,
  customerName,
  memberSince,
  children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  customerName?: string | null;
  memberSince?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      try {
        await fetch("/api/auth/logout", {
          credentials: "include",
        });
      } catch {
        // ignore
      }
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div dir="rtl" className="mk-account">
      <aside className="mk-account__aside">
        <div className="mk-account__profile">
          <div className="mk-account__avatar">{getInitial(customerName)}</div>

          <div className="mk-account__profileText">
            <div className="mk-account__hello">
              {customerName ? `مرحباً ${customerName}` : "مرحباً بك"}
            </div>
            {memberSince ? (
              <div className="mk-account__member">{memberSince}</div>
            ) : null}
          </div>
        </div>

        <div className="mk-account__divider" />

        <div className="mk-account__nav" aria-label="قائمة الحساب">
          {ITEMS.map((item) => {
            const isActive = item.key === active;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.href)}
                className={`mk-account__navBtn ${isActive ? "is-active" : ""}`}
              >
                <Icon size={20} strokeWidth={1.85} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => router.push("/account")}
            className={`mk-account__navBtn ${
              active === "settings" ? "is-active" : ""
            }`}
          >
            <Settings size={20} strokeWidth={1.85} />
            <span>الإعدادات</span>
          </button>
        </div>

        <div className="mk-account__divider" />

        <button type="button" onClick={logout} className="mk-account__logout">
          <LogOut size={19} strokeWidth={1.85} />
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      <section className="mk-account__main">
        <div className="mk-account__pageHead">
          <h1 className="mk-account__sectionTitle">{title}</h1>
          {subtitle ? <p className="mk-account__pageSubtitle">{subtitle}</p> : null}
        </div>

        {children}
      </section>
    </div>
  );
}