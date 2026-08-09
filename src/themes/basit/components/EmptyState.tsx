// themes/malak/components/EmptyState.tsx
"use client";

import React from "react";
import Button from "../ui/Button";

type Props = {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
};

export default function EmptyState({
  title,
  description,
  actionText,
  onAction,
}: Props) {
  return (
    <div className="mk-empty">
      <div className="mk-empty__title">{title}</div>
      {description ? <div className="mk-empty__desc">{description}</div> : null}
      {actionText && onAction ? (
        <div className="mk-empty__actions">
          <Button variant="primary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
