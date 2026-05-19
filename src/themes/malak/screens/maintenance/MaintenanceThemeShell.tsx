// FILE: apps/storefront/src/themes/malak/screens/maintenance/MaintenanceThemeShell.tsx
"use client";

import type { ReactNode } from "react";
import "../../styles/index.css";

type Props = {
  children: ReactNode;
};

export default function MaintenanceThemeShell({ children }: Props) {
  return <>{children}</>;
}