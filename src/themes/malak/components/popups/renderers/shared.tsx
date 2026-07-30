"use client";

import { Copy, ExternalLink, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import type { MarketingPopup, PopupProduct } from "../types";

export function t(value: unknown, fallback = "") { const out = String(value ?? "").trim(); return out || fallback; }
export function n(value: unknown, fallback = 0) { const out = Number(value); return Number.isFinite(out) ? out : fallback; }
export function o(value: unknown): Record<string, any> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}; }
export function arr(value: unknown): any[] { return Array.isArray(value) ? value : []; }

export function PopupHeading({ popup, eyebrow }: { popup: MarketingPopup; eyebrow?: string }) {
  return <div className="mk-popup-heading">{eyebrow ? <span>{eyebrow}</span> : null}<h2>{t(popup.content?.title, popup.name)}</h2>{t(popup.content?.description) ? <p>{t(popup.content?.description)}</p> : null}</div>;
}

export function PrimaryButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button className="mk-popup-primary" onClick={onClick} disabled={disabled}>{children}</button>;
}
export function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button className="mk-popup-secondary" onClick={onClick}>{children}</button>;
}

export function CouponBox({ code, onCopy }: { code: string; onCopy: () => void }) {
  if (!code) return null;
  return <button className="mk-popup-coupon" onClick={onCopy}><span>{code}</span><Copy size={17}/></button>;
}

export function ProductCard({ product, onOpen, onAdd }: { product: PopupProduct; onOpen: () => void; onAdd?: () => void }) {
  return <article className="mk-popup-product-card">
    <button className="mk-popup-product-card__media" onClick={onOpen}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name}/> : <span><ShoppingBag size={22}/></span>}</button>
    <div className="mk-popup-product-card__body">
      <button className="mk-popup-product-card__name" onClick={onOpen}>{product.name}</button>
      {product.rating ? <span className="mk-popup-product-card__rating"><Star size={13} fill="currentColor"/> {product.rating}</span> : null}
      <div className="mk-popup-product-card__price"><strong>{product.priceLabel}</strong>{product.comparePriceLabel ? <del>{product.comparePriceLabel}</del> : null}</div>
      {onAdd ? <button className="mk-popup-product-card__add" onClick={onAdd}><Plus size={15}/> إضافة</button> : null}
    </div>
  </article>;
}

export function ProductGrid({ products, onOpen, onAdd }: { products: PopupProduct[]; onOpen: (p: PopupProduct) => void; onAdd?: (p: PopupProduct) => void }) {
  return <div className="mk-popup-product-grid">{products.map((p) => <ProductCard key={p.id} product={p} onOpen={() => onOpen(p)} onAdd={onAdd ? () => onAdd(p) : undefined}/>)}</div>;
}

export function InlineStat({ label, value }: { label: string; value: React.ReactNode }) { return <div className="mk-popup-stat"><span>{label}</span><strong>{value}</strong></div>; }
export function Progress({ value }: { value: number }) { return <div className="mk-popup-progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>; }
export function LinkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button className="mk-popup-link" onClick={onClick}>{children}<ExternalLink size={14}/></button>; }
