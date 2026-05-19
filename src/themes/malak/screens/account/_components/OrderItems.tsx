// apps/storefront/src/themes/malak/screens/account/_components/OrderItems.tsx
"use client";

type Props = {
  orderNo: string;
};

type Item = {
  id: string;
  name: string;
  qty: number;
  price: string;
};

export default function OrderItems({ orderNo }: Props) {
  // بيانات تجريبية – سيتم ربطها لاحقًا من API
  const items: Item[] = [
    {
      id: "1",
      name: "منتج تجريبي رقم 1",
      qty: 2,
      price: "50.00 SAR",
    },
    {
      id: "2",
      name: "منتج تجريبي رقم 2",
      qty: 1,
      price: "200.00 SAR",
    },
  ];

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="text-sm font-semibold text-gray-700">عناصر الطلب</h2>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="mt-1 text-xs text-gray-500">
                الكمية: {item.qty}
              </div>
            </div>

            <div className="text-sm font-medium">{item.price}</div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-lg border p-6 text-center text-sm text-gray-500">
            لا توجد عناصر في هذا الطلب
          </div>
        )}
      </div>
    </div>
  );
}
