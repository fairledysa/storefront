// FILE: apps/storefront/src/app/platform/page.tsx
export default function PlatformHome() {
  return (
    <main style={{ padding: 40, direction: "rtl" }}>
      <h1>منصة elyaia</h1>
      <p>هذه الصفحة تظهر على localhost:3003</p>

      <ul>
        <li>
          <a href="/platform/pricing">الأسعار</a>
        </li>
        <li>
          <a href="/platform/features">المميزات</a>
        </li>
        <li>
          <a href="/platform/contact">تواصل معنا</a>
        </li>
      </ul>
    </main>
  );
}
