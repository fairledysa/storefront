//apps/storefront/src/themes/classic/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-600">
        <div className="flex flex-col gap-2">
          <div>© {new Date().getFullYear()} المتجر</div>
          <div className="text-xs">Powered by elyaia</div>
        </div>
      </div>
    </footer>
  );
}
