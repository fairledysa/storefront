// FILE: apps/storefront/src/themes/basit/components/smart-search/SmartSearchFromData.tsx

"use client";

import type { MalakBootstrap, MalakBootstrapCategory } from "@/themes/basit/bootstrap/types";
import {
  getSmartSearchDefinitionFromData,
  getSmartSearchDefinitionFromSection,
} from "@/themes/basit/smart-search/config";
import SmartSearchWidget from "./SmartSearchWidget";

type Variant = "hero" | "bar" | "mobile";

type Props = {
  data?: any;
  bootstrap?: MalakBootstrap | null;
  variant: Variant;
  section?: any;
  sectionIndex?: number;
  onMobileClose?: () => void;
};

function pickCategories(data: any, bootstrap?: MalakBootstrap | null) {
  const candidates = [
    bootstrap?.navigation?.categories,
    data?.bootstrap?.navigation?.categories,
    data?.navigation?.categories,
    data?.theme?.bootstrap?.navigation?.categories,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value as MalakBootstrapCategory[];
  }

  return [] as MalakBootstrapCategory[];
}

export default function SmartSearchFromData({
  data,
  bootstrap,
  variant,
  section,
  sectionIndex = 0,
  onMobileClose,
}: Props) {
  const definition = section
    ? getSmartSearchDefinitionFromSection(section, sectionIndex)
    : getSmartSearchDefinitionFromData(data);

  if (!definition) return null;

  return (
    <SmartSearchWidget
      definition={definition}
      categories={pickCategories(data, bootstrap)}
      variant={variant}
      onMobileClose={onMobileClose}
    />
  );
}
