// FILE: apps/storefront/src/themes/malak/screens-mobile/account/TicketsMobileScreen.tsx
"use client";

import AccountMobileLayout from "./AccountMobileLayout";

export default function TicketsMobileScreen() {
  return (
    <AccountMobileLayout active="tickets" title="تذاكري">
      <div className="mk-maccount-simpleCard">لا توجد تذاكر حالياً</div>
    </AccountMobileLayout>
  );
}