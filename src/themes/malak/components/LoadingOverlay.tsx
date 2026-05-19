// themes/malak/components/LoadingOverlay.tsx
"use client";

import React from "react";

export default function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="mk-overlay">
      <div className="mk-spinner" />
    </div>
  );
}
