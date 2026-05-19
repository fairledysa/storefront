// FILE: apps/storefront/src/themes/malak/screens-mobile/account/ReferMobileScreen.tsx
"use client";

import AccountMobileLayout from "./AccountMobileLayout";

export default function ReferMobileScreen() {
  return (
    <AccountMobileLayout active="refer" title="أدع صديقًا">
      <div className="mk-mrefer">
        <div className="mk-mrefer__title">شارك رابط الدعوة</div>

        <div className="mk-mrefer__desc">
          ادعُ أصدقاءك، وسيتم لاحقًا ربط المكافآت والعمولات.
        </div>

        <div className="mk-mrefer__form">
          <input
            readOnly
            value="https://darb.localhost:3003/r/ABCD1234"
            className="mk-mrefer__input"
          />

          <button type="button" className="mk-mrefer__btn">
            نسخ الرابط
          </button>
        </div>
      </div>
    </AccountMobileLayout>
  );
}