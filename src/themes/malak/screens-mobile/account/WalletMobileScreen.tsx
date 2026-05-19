// FILE: apps/storefront/src/themes/malak/screens-mobile/account/WalletMobileScreen.tsx
"use client";

import AccountMobileLayout from "./AccountMobileLayout";

export default function WalletMobileScreen() {
  return (
    <AccountMobileLayout active="wallet" title="الرصيد">
      <div className="mk-mwallet">
        <div className="mk-mwallet__hero">
          <div>
            <div className="mk-mwallet__label">الإجمالي</div>
            <div className="mk-mwallet__amount">0 ر.س</div>
          </div>

          <div>
            <button type="button" className="mk-mwallet__btn">
              إضافة رصيد
            </button>
          </div>
        </div>

        <div className="mk-maccount-simpleCard">لا توجد معاملات بعد</div>
      </div>
    </AccountMobileLayout>
  );
}