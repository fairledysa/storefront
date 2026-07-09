// FILE: apps/storefront/src/themes/malak/components/smart-search/SmartSearchMobileLauncher.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal } from "lucide-react";

import type { MalakBootstrap } from "@/themes/malak/bootstrap/types";
import { getSmartSearchDefinitionFromData } from "@/themes/malak/smart-search/config";
import { parseSmartSearchKeywordIds, parseSmartSearchPath, SMART_SEARCH_QUERY } from "@/themes/malak/smart-search/query";
import SmartSearchFromData from "./SmartSearchFromData";

type Props = {
  data?: any;
  bootstrap?: MalakBootstrap | null;
};

export default function SmartSearchMobileLauncher({ data, bootstrap }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const definition = useMemo(() => getSmartSearchDefinitionFromData(data), [data]);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!definition) return null;

  const isCatalogPage = pathname === "/categories" || Boolean(pathname?.startsWith("/category/"));
  const title = isCatalogPage ? "فلترة ذكية" : definition.config.heading || "ابحث عن المنتج المناسب";
  const isCurrentSearch = searchParams.get(SMART_SEARCH_QUERY.instance) === definition.instanceId;
  const selectedCount = isCurrentSearch
    ? Object.keys(parseSmartSearchPath(searchParams.get(SMART_SEARCH_QUERY.path))).length +
      parseSmartSearchKeywordIds(searchParams.get(SMART_SEARCH_QUERY.keywords)).length
    : 0;
  const launcherText = selectedCount > 0
    ? `تعديل الفلترة · ${selectedCount} اختيارات`
    : isCatalogPage
      ? "فلترة ذكية للمنتجات"
      : title;

  return (
    <>
      <button
        type="button"
        className={`mk-smart-search-mobile-launcher${isCatalogPage ? " mk-smart-search-mobile-launcher--filter" : ""}${selectedCount > 0 ? " is-active" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={title}
      >
        {isCatalogPage ? <SlidersHorizontal size={17} /> : <Search size={17} />}
        <span>{launcherText}</span>
        {isCatalogPage ? <small>{selectedCount > 0 ? "نشط" : "فتح"}</small> : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="mk-smart-search-mobile-sheet" role="dialog" aria-modal="true" aria-label={title}>
              <SmartSearchFromData
                data={data}
                bootstrap={bootstrap}
                variant="mobile"
                onMobileClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
