"use client";

import { forwardRef, HTMLAttributes } from "react";
import * as SvgIcons from "./svg-icons";
import * as HugeIcons from "./huge";

export type IconName = keyof typeof SvgIcons | keyof typeof HugeIcons;

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  icon: IconName;
  size?: number;
  className?: string;
}

const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ icon, size = 20, className = "", ...props }, ref) => {
    const Comp =
      (SvgIcons as Record<string, any>)[icon] ??
      (HugeIcons as Record<string, any>)[icon];

    if (!Comp) return null;

    return (
      <span
        ref={ref}
        className={`inline-flex items-center ${className}`}
        {...props}
      >
        <Comp width={size} height={size} />
      </span>
    );
  },
);

Icon.displayName = "Icon";
export default Icon;
