//apps/storefront/src/themes/malak/screens-mobile/account/_components/MobileOrderItems.tsx
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

export default function MobileOrderItems({ orderNo }: Props) {
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
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(17,24,39,0.06)",
        borderRadius: 24,
        padding: 16,
        boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 950,
          color: "#111827",
          marginBottom: 14,
        }}
      >
        عناصر الطلب
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(17,24,39,0.06)",
              background: "#f8fafc",
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.7,
              }}
            >
              {item.name}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  fontWeight: 700,
                }}
              >
                الكمية: {item.qty}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#111827",
                  fontWeight: 900,
                }}
              >
                {item.price}
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(17,24,39,0.06)",
              padding: 16,
              textAlign: "center",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            لا توجد عناصر في هذا الطلب
          </div>
        ) : null}
      </div>
    </div>
  );
}