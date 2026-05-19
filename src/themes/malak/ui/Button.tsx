// themes/malak/ui/Button.tsx
"use client";

import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  style,
  ...props
}: Props) {
  const cls = [
    "mk-btn",
    `mk-btn--${variant}`,
    `mk-btn--${size}`,
    fullWidth ? "mk-btn--full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <button {...props} className={cls} style={style} />;
}
