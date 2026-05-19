// FILE: apps/storefront/src/themes/malak/app-shell/_components/AccountMenu.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
} from "react";
import Icon from "@/components/icon/Icon";

type IconName = ComponentProps<typeof Icon>["icon"];

export default function AccountMenu({
  authed,
  customer,
  onOpenAuth,
}: {
  authed: boolean;
  customer: any;
  onOpenAuth: () => void;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [overlayTop, setOverlayTop] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const OPEN_DELAY = 60;
  const CLOSE_DELAY = 120;

  function clearTimers() {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);

    openTimer.current = null;
    closeTimer.current = null;
  }

  function calcOverlayTop() {
    const root = rootRef.current;
    if (!root) return;

    const header = root.closest(".mk-header") as HTMLElement | null;
    const top = header ? Math.round(header.getBoundingClientRect().bottom) : 0;

    setOverlayTop(top);
  }

  function openSoon() {
    /**
     * لا نفتح القائمة بالهوفر إلا لو المستخدم مسجل.
     * لو غير مسجل، الضغط فقط يفتح مودال الدخول.
     */
    if (!authed) return;

    clearTimers();

    openTimer.current = window.setTimeout(() => {
      calcOverlayTop();
      setOpen(true);
    }, OPEN_DELAY);
  }

  function closeSoon() {
    clearTimers();

    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, CLOSE_DELAY);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const r = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!r.ok) {
        setLoggingOut(false);
        return;
      }

      setOpen(false);
      window.dispatchEvent(new CustomEvent("auth:changed"));
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  useEffect(() => () => clearTimers(), []);

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
        aria-expanded={open}
        aria-haspopup="menu"
        className="mk-account-menu__trigger"
        onClick={() => {
          /**
           * مهم:
           * النص ثابت "حسابي" دائمًا.
           * إذا لم يكن مسجلًا نفتح مودال الدخول.
           */
          if (!authed) {
            setOpen(false);
            onOpenAuth();
            return;
          }

          calcOverlayTop();
          setOpen((v) => !v);
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
              onClick={() => setOpen(false)}
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
                      {(customer?.full_name &&
                        String(customer.full_name).trim()) ||
                        "مستخدم"}
                    </div>

                    <div className="mk-account-menu__email">
                      {customer?.email ?? ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
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
                    icon="FavouriteSquare"
                    label="المفضلات"
                    onClick={() => {
                      setOpen(false);
                      router.push("/account/favorites");
                    }}
                    active
                  />

                  <Quick
                    icon="Ticket02"
                    label="تذاكر"
                    onClick={() => {
                      setOpen(false);
                      router.push("/account/tickets");
                    }}
                  />

                  <Quick
                    icon="Wallet03"
                    label="الرصيد"
                    onClick={() => {
                      setOpen(false);
                      router.push("/account/wallet");
                    }}
                  />

                  <Quick
                    icon="ShoppingBag02"
                    label="الطلبات"
                    onClick={() => {
                      setOpen(false);
                      router.push("/account/orders");
                    }}
                  />
                </div>
              </div>

              <div className="mk-account-menu__separator" />

              <div className="mk-account-menu__rows">
                <RowItem
                  href="/account/gift-balance"
                  label="إهداء رصيد"
                  icon="GiftCard"
                  onNav={() => setOpen(false)}
                />

                <RowItem
                  href="/account/rewards"
                  label="مكافأتي"
                  icon="StarCircle"
                  onNav={() => setOpen(false)}
                />

                <RowItem
                  href="/account/addresses"
                  label="عناويني"
                  icon="Location01"
                  onNav={() => setOpen(false)}
                />

                <RowItem
                  href="/account/refer"
                  label="أدع صديقاً"
                  icon="UserAdd01"
                  onNav={() => setOpen(false)}
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
  icon,
  label,
  onClick,
  active,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="mk-account-quick">
      <span className="mk-account-quick__outer">
        <span
          className={[
            "mk-account-quick__inner",
            active ? "is-active" : "",
          ].join(" ")}
        >
          <Icon icon={icon} size={25} />
        </span>
      </span>

      <span className="mk-account-quick__label">{label}</span>
    </button>
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