// themes/malak/ui/Card.tsx
"use client";

import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export default function Card({ padded = true, className, ...props }: Props) {
  const cls = ["mk-card", padded ? "mk-card--padded" : "", className || ""]
    .filter(Boolean)
    .join(" ");
  return <div {...props} className={cls} />;
}
