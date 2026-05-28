// FILE: apps/storefront/src/app/checkout/_components/StepShell.tsx

"use client";

import type { ReactNode } from "react";
import { Check, LockKeyhole, Pencil } from "lucide-react";

type StepShellProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;

  isActive?: boolean;
  isDone?: boolean;
  isLocked?: boolean;

  onEdit?: () => void;

  children: ReactNode;

  rightChip?: ReactNode;
};

function StatusChip({
  isActive,
  isDone,
  isLocked,
  rightChip,
}: {
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  rightChip?: ReactNode;
}) {
  if (isDone) {
    return (
      <span className="co-chip co-chip--success">
        <Check size={13} />
        تم
      </span>
    );
  }

  if (isLocked) {
    return (
      <span className="co-chip co-chip--locked">
        <LockKeyhole size={12} />
        مغلق
      </span>
    );
  }

  if (isActive) {
    return <span className="co-chip co-chip--active">الحالية</span>;
  }

  if (rightChip) {
    return <span className="co-chip">{rightChip}</span>;
  }

  return null;
}

export default function StepShell({
  title,
  subtitle,
  icon,
  isActive = false,
  isDone = false,
  isLocked = false,
  onEdit,
  rightChip,
  children,
}: StepShellProps) {
  const activeUnlocked = isActive && !isLocked;
  const compactOnly = isLocked && !isDone && !activeUnlocked;

  return (
    <section
      className={[
        "co-step-shell",
        activeUnlocked ? "is-active" : "",
        isDone ? "is-done" : "",
        isLocked ? "is-locked" : "",
        compactOnly ? "is-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="co-step-head">
        <div className="co-step-head__main">
          <span className="co-step-icon">
            {isDone ? (
              <Check size={18} />
            ) : isLocked ? (
              <LockKeyhole size={17} />
            ) : (
              icon
            )}
          </span>

          <div className="co-step-title-wrap">
            <div className="co-step-title-row">
              <h2>{title}</h2>

              <StatusChip
                isActive={activeUnlocked}
                isDone={isDone}
                isLocked={isLocked}
                rightChip={rightChip}
              />
            </div>

            {subtitle ? <p>{subtitle}</p> : null}

            {isLocked ? (
              <p className="co-step-locked-text">
                أكمل الخطوة السابقة لفتح هذه الخطوة.
              </p>
            ) : null}
          </div>
        </div>

        {isDone && onEdit ? (
          <button type="button" className="co-edit-btn" onClick={onEdit}>
            <Pencil size={14} />
            تعديل
          </button>
        ) : null}
      </div>

      {!compactOnly ? (
        <div
          className={
            isLocked && !isDone ? "co-step-body is-disabled" : "co-step-body"
          }
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}