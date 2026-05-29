// FILE: apps/storefront/src/themes/malak/app-shell/_components/AccountMenu.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
} from "react";
import Icon from "@/components/icon/Icon";

type IconName = ComponentProps<typeof Icon>["icon"];

type Props = {
  authed: boolean;
  customer: any;
  onOpenAuth: () => void;
};

const OPEN_DELAY = 60;
const CLOSE_DELAY = 120;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function customerName(customer: any) {
  return s(customer?.full_name) || s(customer?.name) || "مستخدم";
}

function customerEmail(customer: any) {
  return s(customer?.email);
}

export default function AccountMenu({ authed, customer, onOpenAuth }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [overlayTop, setOverlayTop] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  function clearTimers() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }

    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function calcOverlayTop() {
    const root = rootRef.current;
    if (!root) return;

    const header = root.closest(".mk-header") as HTMLElement | null;
    const top = header ? Math.round(header.getBoundingClientRect().bottom) : 0;

    setOverlayTop(top);
  }

  function openSoon() {
    if (!authed) return;

    clearTimers();

    openTimer.current = window.setTimeout(() => {
      calcOverlayTop();
      setOpen(true);
      openTimer.current = null;
    }, OPEN_DELAY);
  }

  function closeSoon() {
    clearTimers();

    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, CLOSE_DELAY);
  }

  function closeNow() {
    clearTimers();
    setOpen(false);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setLoggingOut(false);
        return;
      }

      closeNow();

      window.dispatchEvent(new CustomEvent("auth:changed"));
      window.location.assign("/");
    } catch {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeNow();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    calcOverlayTop();

    const onResize = () => calcOverlayTop();
    const onScroll = () => calcOverlayTop();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (authed) return;

    closeNow();
  }, [authed]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="mk-account-menu"
      style={
        {
          "--mk-account-overlay-top": `${overlayTop}px`,
        } as CSSProperties
      }
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        aria-expanded={authed ? open : false}
        aria-haspopup={authed ? "menu" : undefined}
        className="mk-account-menu__trigger"
        onClick={() => {
          if (!authed) {
            closeNow();
            onOpenAuth();
            return;
          }

          calcOverlayTop();
          setOpen((value) => !value);
        }}
        onFocus={() => {
          if (!authed) return;

          calcOverlayTop();
          setOpen(true);
        }}
      >
        <span>حسابي</span>
        <Icon icon="UserSquare" size={22} />

        {authed ? <span className="mk-account-menu__chevron">▾</span> : null}

        {authed && open ? (
          <span className="mk-account-menu__underline" />
        ) : null}
      </button>

      {!authed ? null : (
        <>
          {open ? (
            <button
              type="button"
              aria-label="Close overlay"
              onClick={closeNow}
              className="mk-account-menu__overlay"
            />
          ) : null}

          {open ? (
            <div
              dir="rtl"
              role="menu"
              aria-label="Account menu"
              className="mk-popover mk-account-menu__popover"
              onMouseEnter={() => {
                clearTimers();
                setOpen(true);
              }}
              onMouseLeave={closeSoon}
            >
              <div className="mk-account-menu__arrow" />

              <div className="mk-account-menu__head">
                <div className="mk-account-menu__headRow">
                  <div className="mk-account-menu__user">
                    <div className="mk-account-menu__name">
                      {customerName(customer)}
                    </div>

                    <div className="mk-account-menu__email">
                      {customerEmail(customer)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeNow}
                    className="mk-account-menu__back"
                    aria-label="Back"
                  >
                    <Icon icon="ArrowLeft01" size={25} />
                  </button>
                </div>
              </div>

              <div className="mk-account-menu__quickWrap">
                <div className="mk-account-menu__quickGrid">
                  <Quick
                    href="/account/favorites"
                    icon="FavouriteSquare"
                    label="المفضلات"
                    onNav={closeNow}
                    active
                  />

                  <Quick
                    href="/account/tickets"
                    icon="Ticket02"
                    label="تذاكر"
                    onNav={closeNow}
                  />

                  <Quick
                    href="/account/wallet"
                    icon="Wallet03"
                    label="الرصيد"
                    onNav={closeNow}
                  />

                  <Quick
                    href="/account/orders"
                    icon="ShoppingBag02"
                    label="الطلبات"
                    onNav={closeNow}
                  />
                </div>
              </div>

              <div className="mk-account-menu__separator" />

              <div className="mk-account-menu__rows">
                <RowItem
                  href="/account/gift-balance"
                  label="إهداء رصيد"
                  icon="GiftCard"
                  onNav={closeNow}
                />

                <RowItem
                  href="/account/rewards"
                  label="مكافأتي"
                  icon="StarCircle"
                  onNav={closeNow}
                />

                <RowItem
                  href="/account/addresses"
                  label="عناويني"
                  icon="Location01"
                  onNav={closeNow}
                />

                <RowItem
                  href="/account/refer"
                  label="أدع صديقاً"
                  icon="UserAdd01"
                  onNav={closeNow}
                />
              </div>

              <div className="mk-account-menu__separator" />

              <div className="mk-account-menu__logoutWrap">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="mk-account-menu__logout"
                >
                  <span>
                    {loggingOut ? "جاري تسجيل الخروج..." : "تسجيل خروج"}
                  </span>

                  <span className="mk-account-menu__logoutIcon">
                    <Icon icon="Logout01" size={18} />
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Quick({
  href,
  icon,
  label,
  onNav,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  onNav: () => void;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNav}
      className="mk-account-quick"
      role="menuitem"
    >
      <span className="mk-account-quick__outer">
        <span
          className={[
            "mk-account-quick__inner",
            active ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Icon icon={icon} size={25} />
        </span>
      </span>

      <span className="mk-account-quick__label">{label}</span>
    </Link>
  );
}

function RowItem({
  href,
  label,
  icon,
  onNav,
}: {
  href: string;
  label: string;
  icon: IconName;
  onNav: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNav}
      role="menuitem"
      className="mk-account-row"
    >
      <span className="mk-account-row__main">
        <span className="mk-account-row__icon">
          <Icon icon={icon} size={25} />
        </span>

        <span>{label}</span>
      </span>

      <span className="mk-account-row__arrow">
        <Icon icon="ArrowLeft01" size={25} />
      </span>
    </Link>
  );
}