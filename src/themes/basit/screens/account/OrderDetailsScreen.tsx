// FILE: apps/storefront/src/themes/basit/screens/account/OrderDetailsScreen.tsx
"use client";

import AccountLayout from "./AccountLayout";
import OrderDetailsClient from "./[orderNo]/_components/OrderDetailsClient";

export default function OrderDetailsScreen({
  data,
}: {
  data?: { orderNo?: string };
}) {
  const orderNo = String(data?.orderNo ?? "").trim();

  return (
    <AccountLayout active="orders" title="تفاصيل الطلب">
      {!orderNo ? (
        <div className="mk-account-state">رقم الطلب غير موجود.</div>
      ) : (
        <OrderDetailsClient
          orderNo={orderNo}
          i18n={{
            orderStatusAr: {
              pending: "قيد الانتظار",
              paid: "مدفوع",
              failed: "فشل",
              cancelled: "ملغي",
              shipped: "تم الشحن",
              completed: "مكتمل",
            },
            paymentStatusAr: {
              unpaid: "غير مدفوع",
              paid: "مدفوع",
              failed: "فشل",
              refunded: "مسترجع",
            },
          }}
        />
      )}
    </AccountLayout>
  );
}