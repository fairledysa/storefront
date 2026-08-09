// themes/malak/components/ErrorView.tsx
"use client";

import React from "react";
import Button from "../ui/Button";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export default function ErrorView({
  title = "صار خطأ",
  message = "حاول مرة ثانية.",
  onRetry,
}: Props) {
  return (
    <div className="mk-empty">
      <div className="mk-empty__title">{title}</div>
      <div className="mk-empty__desc">{message}</div>
      {onRetry ? (
        <div className="mk-empty__actions">
          <Button variant="secondary" onClick={onRetry}>
            إعادة المحاولة
          </Button>
        </div>
      ) : null}
    </div>
  );
}
