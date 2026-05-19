// FILE: apps/storefront/src/themes/malak/screens-mobile/account/RewardsMobileScreen.tsx
"use client";

import AccountMobileLayout from "./AccountMobileLayout";

export default function RewardsMobileScreen() {
  return (
    <AccountMobileLayout active="rewards" title="مكافآتي">
      <div className="mk-maccount-simpleCard">لا توجد مكافآت حالياً</div>
    </AccountMobileLayout>
  );
}