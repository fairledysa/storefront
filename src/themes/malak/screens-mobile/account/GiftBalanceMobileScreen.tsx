// FILE: apps/storefront/src/themes/malak/screens-mobile/account/GiftBalanceMobileScreen.tsx
"use client";

import AccountMobileLayout from "./AccountMobileLayout";

export default function GiftBalanceMobileScreen() {
  return (
    <AccountMobileLayout active="gift_balance" title="إهداء رصيد">
      <div className="mk-mgift">
        <div className="mk-mgift__title">إرسال رصيد لشخص آخر</div>

        <div className="mk-mgift__desc">
          أدخل البريد والمبلغ والرسالة، وبعدها أرسل الهدية.
        </div>

        <div className="mk-mgift__form">
          <input className="mk-mgift__input" placeholder="البريد الإلكتروني" />

          <input className="mk-mgift__input" placeholder="المبلغ" />

          <textarea
            className="mk-mgift__textarea"
            placeholder="رسالة الإهداء"
          />

          <button type="button" className="mk-mgift__btn">
            إرسال الهدية
          </button>
        </div>
      </div>
    </AccountMobileLayout>
  );
}