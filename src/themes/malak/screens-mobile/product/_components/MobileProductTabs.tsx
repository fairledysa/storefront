// FILE: apps/storefront/src/themes/malak/screens-mobile/product/_components/MobileProductTabs.tsx
"use client";

import type { ComponentProps } from "react";
import ProductTabs from "../../../screens/product/_components/ProductTabs";

type Props = ComponentProps<typeof ProductTabs>;

export default function MobileProductTabs(props: Props) {
  return (
    <section className="mk-mproduct-tabsCard" aria-label="وصف وتفاصيل المنتج">
      <ProductTabs {...props} />
    </section>
  );
}