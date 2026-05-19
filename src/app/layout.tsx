// FILE: apps/storefront/src/app/layout.tsx

import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Storefront",
};

const storeRootStyle = {
  "--font-store": "Tajawal, Arial, sans-serif",
  "--primary": "#00a98f",
  "--primary-foreground": "#ffffff",
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body style={storeRootStyle}>{children}</body>
    </html>
  );
}