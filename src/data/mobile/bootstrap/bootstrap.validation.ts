import type {
  AppEnvironment,
  BootstrapRequest,
  MobilePlatform,
} from "./bootstrap.types";

const id = /^[A-Za-z0-9_-]{8,128}$/;

export function validateBootstrapHeaders(
  h: Headers,
  requestId: string,
): BootstrapRequest {
  const rawPublicAppId = (h.get("x-store-app-id") || "").trim();
  const publicAppId = rawPublicAppId || null;

  if (publicAppId && !id.test(publicAppId)) {
    throw Object.assign(new Error("STORE_APP_NOT_FOUND"), {
      status: 404,
      code: "STORE_APP_NOT_FOUND",
    });
  }

  const rawEnvironment = (h.get("x-app-environment") || "").trim();
  const appEnvironment = (rawEnvironment || "development") as AppEnvironment;
  if (!["development", "preview", "production"].includes(appEnvironment)) {
    throw Object.assign(new Error("INVALID_APP_ENVIRONMENT"), {
      status: 400,
      code: "INVALID_APP_ENVIRONMENT",
    });
  }

  const rawPlatform = (h.get("x-platform") || "").trim();
  const platform = (rawPlatform || "web") as MobilePlatform;
  const isNativePlatform = platform === "ios" || platform === "android";
  const isDevelopmentWeb = platform === "web" && appEnvironment === "development";
  if (!isNativePlatform && !isDevelopmentWeb) {
    throw Object.assign(new Error("INVALID_PLATFORM"), {
      status: 400,
      code: "INVALID_PLATFORM",
    });
  }


  const rawCurrencyCode = (h.get("x-currency-code") || "").trim().toUpperCase();
  const selectedCurrencyCode = /^[A-Z]{3}$/.test(rawCurrencyCode)
    ? rawCurrencyCode
    : null;

  return {
    publicAppId,
    appVersion: (h.get("x-app-version") || "0.0.0").trim(),
    appEnvironment,
    platform,
    locale: (h.get("accept-language") || "ar").split(",")[0],
    timezone: (h.get("x-timezone") || "UTC").trim(),
    requestId,
    selectedCurrencyCode,
  };
}
