// FILE: apps/storefront/src/themes/basit/screens/home/_dynamic/icons.tsx

import Icon from "@/components/icon/Icon";
import { getIconNameFromValue } from "./utils";

export default function DynamicThemeIcon({
  name,
  className,
}: {
  name: any;
  className?: string;
}) {
  const rawName = getIconNameFromValue(name);

  const iconName =
    rawName.replace(/\s+/g, "").replace(/Icon$/i, "") || "Sparkles";

  return <Icon icon={iconName as any} className={className || "text-lg"} />;
}