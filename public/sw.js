//apps/storefront/public/sw.js
const SW_VERSION = "mk-pwa-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // المرحلة الحالية: تسجيل Service Worker فقط لتفعيل قابلية PWA.
  // الكاش الذكي/offline يأتي في المرحلة التالية بدون كاش checkout/payment.
});