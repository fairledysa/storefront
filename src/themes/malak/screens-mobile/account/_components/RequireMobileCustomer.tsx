// FILE: apps/storefront/src/themes/malak/screens-mobile/account/_components/RequireMobileCustomer.tsx

"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  children: ReactNode;
};

function cleanPath(value: unknown) {
  const raw = String(value ?? "/").trim() || "/";
  const path = raw.split("?")[0]?.split("#")[0] || "/";
  return path.replace(/\/+$/, "") || "/";
}

function buildCurrentPath(pathname: string | null, searchParams: URLSearchParams) {
  const path = cleanPath(pathname || "/account");
  const qs = searchParams.toString();

  if (!qs) return path;

  return `${path}?${qs}`;
}

export default function RequireMobileCustomer({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => ({}));

        const ok =
          res.ok &&
          (json?.authed === true || json?.ok === true) &&
          Boolean(json?.customer || json?.user);

        if (!alive) return;

        if (ok) {
          setAuthed(true);
          setReady(true);
          return;
        }

        if (!redirectedRef.current) {
          redirectedRef.current = true;

          const next = buildCurrentPath(pathname, searchParams);
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
      } catch {
        if (!alive) return;

        if (!redirectedRef.current) {
          redirectedRef.current = true;

          const next = buildCurrentPath(pathname, searchParams);
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
      }
    }

    void check();

    return () => {
      alive = false;
    };
  }, [pathname, router, searchParams]);

  if (!ready || !authed) return null;

  return <>{children}</>;
}