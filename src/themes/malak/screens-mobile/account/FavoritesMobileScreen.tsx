// FILE: apps/storefront/src/themes/malak/screens-mobile/account/FavoritesMobileScreen.tsx
"use client";

import { useEffect, useState } from "react";
import AccountMobileLayout from "./AccountMobileLayout";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "ready"; items: any[] }
  | { kind: "error" };

function SimpleCard({ text }: { text: string }) {
  return <div className="mk-maccount-simpleCard">{text}</div>;
}

export default function FavoritesMobileScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setState({ kind: "loading" });

        const res = await fetch("/api/account/favorites", {
          cache: "no-store",
          credentials: "include",
        });

        if (!alive) return;

        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }

        const json = await res.json().catch(() => ({}));
        const items = Array.isArray(json?.items) ? json.items : [];

        if (!items.length) {
          setState({ kind: "empty" });
          return;
        }

        setState({ kind: "ready", items });
      } catch {
        if (!alive) return;
        setState({ kind: "error" });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AccountMobileLayout active="favorites" title="المفضلات">
      {state.kind === "loading" ? (
        <SimpleCard text="جاري تحميل المفضلات..." />
      ) : null}

      {state.kind === "empty" ? (
        <SimpleCard text="لا توجد منتجات مفضلة بعد" />
      ) : null}

      {state.kind === "error" ? (
        <SimpleCard text="حدث خطأ أثناء تحميل المفضلات" />
      ) : null}

      {state.kind === "ready" ? (
        <div className="mk-maccount-countCard">
          <div className="mk-maccount-countCard__label">عدد المنتجات</div>
          <div className="mk-maccount-countCard__value">
            {state.items.length}
          </div>
        </div>
      ) : null}
    </AccountMobileLayout>
  );
}