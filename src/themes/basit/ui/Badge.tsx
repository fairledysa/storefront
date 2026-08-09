// themes/malak/ui/Badge.tsx
"use client";

import React from "react";

type Tone = "neutral" | "success" | "danger";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export default function Badge({
  tone = "neutral",
  className,
  ...props
}: Props) {
  const cls = ["mk-badge", `mk-badge--${tone}`, className || ""]
    .filter(Boolean)
    .join(" ");
  return <span {...props} className={cls} />;
}
