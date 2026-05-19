// FILE: apps/storefront/src/components/storefront/header-account.tsx
"use client";

import { useEffect, useState } from "react";
import AuthModal from "@/app/(store)/_components/auth/AuthModal";

export default function HeaderAccount() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  async function refresh() {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setIsAuthed(!!json?.authed);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
      >
        {isAuthed ? "حسابي" : "تسجيل / دخول"}
      </button>

      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        onAuthed={() => {
          setIsAuthed(true);
        }}
      />
    </>
  );
}
