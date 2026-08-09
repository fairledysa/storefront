export type PopupDevice = "desktop" | "mobile";
export type PopupPageType = "home" | "product" | "category" | "page" | "cart" | "search" | "thankyou" | "account" | "other";

export type PopupContext = { pageType: PopupPageType; referenceId: string | null; pathname: string };
export type PopupProduct = { id: string; name: string; href: string; imageUrl: string; price: number; comparePrice: number | null; priceLabel: string; comparePriceLabel: string; rating: number | null; stock: number | null; hasOptions: boolean };
export type PopupCartItem = { id: string; productId: string; name: string; qty: number; imageUrl: string; priceLabel: string };
export type PopupCart = { items: PopupCartItem[]; subtotal: number; total: number; subtotalLabel: string; totalLabel: string };
export type MarketingPopup = {
  id: string; name: string; popupType: string; priority: number; triggerType: string;
  pageScope: Record<string, any>; content: Record<string, any>; design: Record<string, any>; deviceScope: string;
  startsAt?: string | null; endsAt?: string | null; products?: PopupProduct[];
  socialProof?: { message: string } | null;
  loyalty?: { points: number; rewards: Array<{id:string;name:string;pointsCost:number}> } | null;
};
