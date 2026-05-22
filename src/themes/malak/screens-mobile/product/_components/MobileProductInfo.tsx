// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductInfo.tsx
"use client";

import type { ComponentProps } from "react";
import ProductInfo from "../../../screens/product/_components/ProductInfo";

type Props = ComponentProps<typeof ProductInfo>;

export default function MobileProductInfo(props: Props) {
  return (
    <section className="mk-mproduct-infoCard" aria-label="معلومات المنتج">
      <ProductInfo {...props} />
    </section>
  );
}