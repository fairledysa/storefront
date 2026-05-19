// FILE: apps/storefront/src/themes/malak/screens-mobile/cart/_components/MobileCartItemsList.tsx
"use client";

import type { CartItemEnriched } from "../../../screens/cart/_components/types";
import MobileCartItemCard from "./MobileCartItemCard";

type Props = {
  items: CartItemEnriched[];
  loading: boolean;
  busy: boolean;
  onInc: (cart_item_id: string, delta: number) => void;
  onRemove: (cart_item_id: string) => void;
  onEdit: (itemId: string) => void;
  onContinueShopping: () => void;
};

function SkeletonCard() {
  return (
    <div className="mk-mobile-cart-skeleton">
      <div className="mk-mobile-cart-skeleton__grid">
        <div className="mk-mobile-cart-skeleton__image" />

        <div className="mk-mobile-cart-skeleton__content">
          <div className="mk-mobile-cart-skeleton__line mk-mobile-cart-skeleton__line--title" />
          <div className="mk-mobile-cart-skeleton__line mk-mobile-cart-skeleton__line--sub" />
          <div className="mk-mobile-cart-skeleton__line mk-mobile-cart-skeleton__line--price" />
        </div>
      </div>

      <div className="mk-mobile-cart-skeleton__footer">
        <div className="mk-mobile-cart-skeleton__small" />
        <div className="mk-mobile-cart-skeleton__wide" />
      </div>
    </div>
  );
}

export default function MobileCartItemsList({
  items,
  loading,
  busy,
  onInc,
  onRemove,
  onEdit,
  onContinueShopping,
}: Props) {
  if (loading) {
    return (
      <div className="mk-mobile-cart-list mk-mobile-cart-list--loading">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mk-mobile-cart-empty">
        <div className="mk-mobile-cart-empty__card">
          <div className="mk-mobile-cart-empty__icon">🛒</div>

          <div className="mk-mobile-cart-empty__title">سلتك فارغة</div>

          <div className="mk-mobile-cart-empty__desc">
            أضف منتجاتك المفضلة ثم ارجع هنا لإكمال الطلب بسرعة.
          </div>

          <button
            type="button"
            onClick={onContinueShopping}
            className="mk-mobile-cart-empty__btn"
          >
            متابعة التسوق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mk-mobile-cart-list">
      {items.map((item) => (
        <MobileCartItemCard
          key={item.id}
          item={item}
          busy={busy}
          onInc={onInc}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}