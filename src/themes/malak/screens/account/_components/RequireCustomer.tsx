//apps/storefront/src/themes/malak/screens/account/_components/RequireCustomer.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = { children: ReactNode };

export default function RequireCustomer({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        const ok =
          res.ok &&
          (json?.authed === true || json?.ok === true) &&
          (json?.customer || json?.user);

        if (!alive) return;

        setAuthed(!!ok);
      } finally {
        if (alive) setLoading(false);
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-xl border bg-white p-6">
          جاري التحقق من الحساب...
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="rounded-xl border bg-white p-6 space-y-3">
          <div className="text-lg font-semibold">لازم تسجل دخول</div>
          <div className="text-sm text-gray-600">
            عشان تشوف طلباتك لازم يكون عندك جلسة فعّالة.
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg bg-black px-4 py-2 text-white"
              onClick={() =>
                router.push(
                  `/auth?next=${encodeURIComponent(pathname || "/account")}`,
                )
              }
            >
              تسجيل الدخول
            </button>
            <button
              className="rounded-lg border px-4 py-2"
              onClick={() => router.push("/")}
            >
              رجوع
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
