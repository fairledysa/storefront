//apps/storefront/src/themes/malak/screens-mobile/account/OrderDetailsMobileScreen.tsx
"use client";

import AccountMobileLayout from "../AccountMobileLayout";
import MobileOrderDetails from "../_components/MobileOrderDetails";
 
import RequireCustomer from "../../../screens/account/_components/RequireCustomer";


export default function OrderDetailsMobileScreen({
  data,
}: {
  data?: { orderNo?: string };
}) {
  const orderNo = String(data?.orderNo ?? "").trim();

  return (
    <RequireCustomer>
      <AccountMobileLayout active="orders" title="تفاصيل الطلب">
        {!orderNo ? (
          <div className="mk-mod-state">رقم الطلب غير موجود.</div>
        ) : (
          <MobileOrderDetails orderNo={orderNo} />
        )}
      </AccountMobileLayout>
    </RequireCustomer>
  );
}