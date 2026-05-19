// themes/malak/ui/Skeleton.tsx
"use client";

import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  h?: number;
  w?: number | string;
  r?: number;
};

export default function Skeleton({
  h = 12,
  w = "100%",
  r = 10,
  style,
  ...props
}: Props) {
  return (
    <div
      {...props}
      className="mk-skeleton"
      style={{
        height: h,
        width: w,
        borderRadius: r,
        ...style,
      }}
    />
  );
}
