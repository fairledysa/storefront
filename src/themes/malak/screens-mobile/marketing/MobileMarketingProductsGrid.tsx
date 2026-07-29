"use client";

import ProductCard from "@/themes/malak/components/product-card/ProductCard";

export default function MobileMarketingProductsGrid({ products }: { products: any[] }) {
  if (!Array.isArray(products) || products.length === 0) return null;

  return (
    <div className="mk-mobile-marketing-grid">
      {products.map((product, index) => (
        <ProductCard key={`${product?.id ?? "product"}-${index}`} item={product} />
      ))}
      <style jsx global>{`
        .mk-mobile-marketing-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:8px 5px;
          width:100%;
          align-items:start;
        }
        .mk-mobile-marketing-grid > *{min-width:0}
      `}</style>
    </div>
  );
}
