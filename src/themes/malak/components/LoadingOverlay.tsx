// themes/malak/components/LoadingOverlay.tsx
"use client";

import React from "react";

type LoadingOverlayMode = "page" | "content";

type Props = {
  show: boolean;
  mode?: LoadingOverlayMode;
  label?: string;
};

export default function LoadingOverlay({
  show,
  mode = "page",
  label = "جاري التحميل",
}: Props) {
  if (!show) return null;

  return (
    <div
      className="mk-overlay"
      data-mode={mode}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="mk-spinner" aria-hidden="true" />
    </div>
  );
}