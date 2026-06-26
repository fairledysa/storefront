import Link from "next/link";
import type { ReactNode } from "react";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`pl-brand ${light ? "pl-brand--light" : ""}`} aria-label="إيلايا">
      <span className="pl-brand__word"><b>إيلايا</b><small>ELYAIA</small></span>
      <span className="pl-brand__mark"><i /><i /><i /></span>
    </Link>
  );
}

export function ArrowIcon({ direction = "left" }: { direction?: "left" | "right" }) {
  return <span aria-hidden="true" className={`pl-arrow pl-arrow--${direction}`}>←</span>;
}

export function PlayIcon() {
  return <span aria-hidden="true" className="pl-play">▷</span>;
}

export function CheckIcon() {
  return <span aria-hidden="true" className="pl-check">✓</span>;
}

export function PlatformButton({
  href,
  children,
  variant = "primary",
  icon,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark" | "light";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`pl-button pl-button--${variant} ${className}`.trim()}>
      {icon ? <span className="pl-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </Link>
  );
}

export function TinyIcon({ type }: { type: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (type === "store") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 10.5V20h16v-9.5M3.5 6.2 5 3h14l1.5 3.2v2.2a2 2 0 0 1-3.7 1.1 2 2 0 0 1-3.6 0 2 2 0 0 1-3.6 0A2 2 0 0 1 3.5 8.4V6.2Z"/><path {...common} d="M9 20v-5h6v5"/></svg>;
  if (type === "bag") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M5 8.5h14l-1 11H6l-1-11Z"/><path {...common} d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
  if (type === "chart") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 20V4M4 20h16"/><path {...common} d="m7 16 4-5 3 2 5-7"/></svg>;
  if (type === "puzzle") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M8 3h4v3a2 2 0 1 0 4 0V3h2a3 3 0 0 1 3 3v3h-3a2 2 0 1 0 0 4h3v5a3 3 0 0 1-3 3h-5v-3a2 2 0 1 0-4 0v3H6a3 3 0 0 1-3-3v-5h3a2 2 0 1 0 0-4H3V6a3 3 0 0 1 3-3h2Z"/></svg>;
  if (type === "truck") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M3 6h11v10H3zM14 10h3l3 3v3h-6z"/><circle {...common} cx="7" cy="18" r="2"/><circle {...common} cx="17" cy="18" r="2"/></svg>;
  if (type === "megaphone") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m4 14 10-4v8L4 14Z"/><path {...common} d="M14 11.5 19 8v12l-5-3.5M6 15l1.5 4H10l-1-5"/></svg>;
  if (type === "heart") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M20 9.5C20 5.8 16 4 13.5 6.4L12 8l-1.5-1.6C8 4 4 5.8 4 9.5c0 5 8 10.5 8 10.5S20 14.5 20 9.5Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...common} cx="12" cy="12" r="8"/><path {...common} d="M8 12h8M12 8v8"/></svg>;
}
