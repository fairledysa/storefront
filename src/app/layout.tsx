// FILE: apps/storefront/src/app/layout.tsx

import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storefront",
  manifest: "/manifest.webmanifest",
  applicationName: "Storefront",
  appleWebApp: {
    capable: true,
    title: "Storefront",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Storefront",
    "apple-mobile-web-app-status-bar-style": "default",
  },
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