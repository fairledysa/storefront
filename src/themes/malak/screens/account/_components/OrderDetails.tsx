// apps/storefront/src/themes/malak/screens/account/_components/OrderDetails.tsx

"use client";

type Props = {
  orderNo: string;
};

export default function OrderDetails({ orderNo }: Props) {
  // بيانات تجريبية (سنستبدلها بالـ API لاحقًا)
  const order = {
    status: "تم الدفع",
    paymentMethod: "بطاقة",
    createdAt: "2026-01-29",
    subtotal: "300.00 SAR",
    shipping: "20.00 SAR",
    discount: "0.00 SAR",
    tax: "0.00 SAR",
    total: "320.00 SAR",
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* معلومات الطلب */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700">معلومات الطلب</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">رقم الطلب</span>
              <span>#{orderNo}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">الحالة</span>
              <span className="font-medium">{order.status}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">تاريخ الطلب</span>
              <span>{order.createdAt}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">طريقة الدفع</span>
              <span>{order.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* ملخص الفاتورة */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700">ملخص الفاتورة</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span>{order.subtotal}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">الشحن</span>
              <span>{order.shipping}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">الخصم</span>
              <span>{order.discount}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">الضريبة</span>
              <span>{order.tax}</span>
            </div>

            <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
              <span>الإجمالي</span>
              <span>{order.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
