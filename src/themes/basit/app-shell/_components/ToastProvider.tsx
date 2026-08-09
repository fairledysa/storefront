//themes/basit/app-shell/_components/ToastProvider.tsx
"use client";

import { useEffect, useState } from "react";

export default function ToastProvider() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      setMsg(e.detail?.message || "تم");

      setTimeout(() => {
        setMsg(null);
      }, 2500);
    };

    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  if (!msg) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        background: "#111827",
        color: "#fff",
        padding: "14px 18px",
        borderRadius: 12,
        fontWeight: 800,
        zIndex: 9999,
      }}
    >
      {msg}
    </div>
  );
}