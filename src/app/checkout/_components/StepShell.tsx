// FILE: apps/storefront/src/app/checkout/_components/StepShell.tsx

"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "success" | "locked" | "active";
}) {
  return (
    <span
      className={[
        "inline-flex h-6 items-center rounded-full border",
        "px-2 text-[11px] font-black leading-none",
        "sm:h-7 sm:px-2.5 sm:text-[12px]",
        tone === "success"
          ? "border-amber-900/15 bg-[#f7f1e8] text-stone-700"
          : tone === "locked"
            ? "border-zinc-200 bg-zinc-100 text-zinc-400"
            : tone === "active"
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-zinc-200 bg-zinc-50 text-zinc-500",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function IconBadge({
  children,
  done = false,
  active = false,
  locked = false,
}: {
  children: ReactNode;
  done?: boolean;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <div
      className={[
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[18px] border shadow-sm",
        "h-9 w-9 sm:h-10 sm:w-10 sm:rounded-2xl",
        done
          ? "border-amber-900/15 bg-[#f7f1e8] text-stone-800"
          : active
            ? "border-zinc-950 bg-zinc-950 text-white"
            : locked
              ? "border-zinc-200 bg-zinc-100 text-zinc-400"
              : "border-zinc-200 bg-zinc-50 text-zinc-700",
      ].join(" ")}
    >
      {children}
    </div>
  );
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
  const disabled = isLocked || !isActive;
  const activeUnlocked = isActive && !isLocked;

  return (
    <Card
      className={[
        "relative overflow-hidden border bg-white text-zinc-950",
        "rounded-[22px] sm:rounded-[26px]",
        activeUnlocked
          ? "border-zinc-300 shadow-[0_10px_28px_rgba(15,23,42,0.055)] sm:shadow-[0_18px_48px_rgba(15,23,42,0.075)]"
          : "border-zinc-200 shadow-[0_4px_14px_rgba(15,23,42,0.025)] sm:shadow-[0_12px_32px_rgba(15,23,42,0.04)]",
        isDone ? "border-amber-900/15 bg-[#fffefd]" : "",
        disabled && !isDone ? "opacity-70" : "",
      ].join(" ")}
    >
      {activeUnlocked ? (
        <div
          className="absolute inset-x-0 top-0 h-[3px] bg-zinc-950"
          aria-hidden
        />
      ) : isDone ? (
        <div
          className="absolute inset-x-0 top-0 h-[3px] bg-[#c9a76a]"
          aria-hidden
        />
      ) : null}

      <CardContent className="px-3.5 py-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <IconBadge done={isDone} active={activeUnlocked} locked={isLocked}>
              {isLocked ? <LockKeyhole className="h-4 w-4" /> : icon}
            </IconBadge>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="text-[15px] font-black tracking-tight text-zinc-950 sm:text-[16px]">
                  {title}
                </div>

                {isDone ? (
                  <Chip tone="success">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      تم
                    </span>
                  </Chip>
                ) : isLocked ? (
                  <Chip tone="locked">مغلق</Chip>
                ) : activeUnlocked ? (
                  <Chip tone="active">الحالية</Chip>
                ) : rightChip ? (
                  <Chip>{rightChip}</Chip>
                ) : null}
              </div>

              {subtitle ? (
                <div className="mt-0.5 max-w-[52rem] text-[12px] leading-5 text-zinc-500 sm:mt-1 sm:text-[13px]">
                  {subtitle}
                </div>
              ) : null}

              {isLocked ? (
                <div className="mt-1.5 text-[12px] leading-5 text-zinc-400 sm:mt-2">
                  أكمل الخطوة السابقة لفتح هذه الخطوة.
                </div>
              ) : null}
            </div>
          </div>

          {isDone && onEdit ? (
            <Button
              variant="ghost"
              className={[
                "h-8 shrink-0 rounded-2xl border border-zinc-200 bg-white",
                "px-2.5 text-xs font-black text-zinc-800 shadow-sm",
                "transition hover:bg-zinc-50 active:scale-[0.99]",
                "sm:h-9 sm:px-3 sm:text-sm",
              ].join(" ")}
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 sm:me-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">تعديل</span>
            </Button>
          ) : null}
        </div>

        <div className="my-2.5 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent sm:my-4" />

        <div className={disabled && !isDone ? "pointer-events-none" : ""}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}