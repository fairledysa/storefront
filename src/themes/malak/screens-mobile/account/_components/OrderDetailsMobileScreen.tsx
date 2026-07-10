// FILE: apps/storefront/src/themes/malak/screens-mobile/account/_components/OrderDetailsMobileScreen.tsx
"use client";

import AccountMobileLayout from "../AccountMobileLayout";
import MobileOrderDetails from "./MobileOrderDetails";
import RequireMobileCustomer from "./RequireMobileCustomer";

type Props = {
  data?: {
    orderNo?: string | number | null;
  } | null;
};

export default function OrderDetailsMobileScreen({ data }: Props) {
  const orderNo = String(data?.orderNo ?? "").trim();

  return (
    <RequireMobileCustomer>
      <AccountMobileLayout active="orders" title="تفاصيل الطلب">
        <MobileOrderDetails orderNo={orderNo} />
      </AccountMobileLayout>
    </RequireMobileCustomer>
  );
}
