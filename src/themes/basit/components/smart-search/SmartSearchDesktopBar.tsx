// FILE: apps/storefront/src/themes/basit/components/smart-search/SmartSearchDesktopBar.tsx

"use client";

import type { MalakBootstrap } from "@/themes/basit/bootstrap/types";
import SmartSearchFromData from "./SmartSearchFromData";

type Props = {
  data?: any;
  bootstrap?: MalakBootstrap | null;
};

export default function SmartSearchDesktopBar({ data, bootstrap }: Props) {
  return (
    <div className="mk-smart-search-desktop-bar">
      <SmartSearchFromData data={data} bootstrap={bootstrap} variant="bar" />
    </div>
  );
}
