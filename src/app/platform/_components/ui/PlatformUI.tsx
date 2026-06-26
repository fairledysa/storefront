import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type ButtonProps = {
  href: string;
  children: ReactNode;
  tone?: "dark" | "light" | "gold" | "ghost";
  icon?: IconName;
  className?: string;
};

export function PlatformButton({
  children,
  tone = "dark",
  icon,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <a className={`elyaiaButton elyaiaButton--${tone} ${className}`} {...props}>
      <span>{children}</span>
      {icon ? <Icon name={icon} size={17} /> : null}
    </a>
  );
}

export function BrandMark() {
  return (
    <span className="elyaiaBrand" aria-label="إيلايا">
      <span className="elyaiaBrand__glyph"><i /><i /><i /></span>
      <span className="elyaiaBrand__word"><b>إيلايا</b><small>ELYAIA</small></span>
    </span>
  );
}
