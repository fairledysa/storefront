// FILE: apps/storefront/src/app/checkout/_components/CheckoutHeader.tsx

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Lock, ShieldCheck, ShoppingBag } from "lucide-react";

type Props = {
  storeName: string;
  logoUrl?: string | null;
};

export default function CheckoutHeader({ storeName, logoUrl }: Props) {
  return (
    <header className="co-header">
      <div className="co-header__inner">
        <div className="co-header__side">
          <Link href="/cart" className="co-icon-btn" aria-label="الرجوع">
            <ChevronRight size={20} />
          </Link>

          <Link href="/" className="co-store-link">
            <span className="co-store-logo">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={storeName}
                  fill
                  sizes="38px"
                  className="co-store-logo__img"
                  priority
                />
              ) : (
                <ShoppingBag size={18} />
              )}
            </span>

            <span className="co-store-name">
              <span>إتمام الطلب</span>
              <strong>{storeName}</strong>
            </span>
          </Link>
        </div>

        <nav className="co-header__crumb">
          <Link href="/cart">سلة المشتريات</Link>
          <span>/</span>
          <strong>إتمام الطلب</strong>
        </nav>

        <div className="co-header__side co-header__side--left">
          <span className="co-security-chip co-security-chip--hide-sm">
            <Lock size={14} />
            دفع آمن
          </span>

          <span className="co-security-chip">
            <ShieldCheck size={14} />
            اتصال مشفّر
          </span>
        </div>
      </div>
    </header>
  );
}