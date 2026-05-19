//apps/storefront/src/themes/classic/components/Header.tsx
export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <div className="text-lg font-bold">المتجر</div>

        <nav className="flex items-center gap-4 text-sm">
          <a href="/" className="hover:underline">
            الرئيسية
          </a>
          <a href="/cart" className="hover:underline">
            السلة
          </a>
        </nav>
      </div>
    </header>
  );
}
