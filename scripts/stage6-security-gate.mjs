import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(relativePath, expected, label) {
  const source = read(relativePath);
  if (!source.includes(expected)) {
    failures.push(`${label}: ${relativePath} is missing ${JSON.stringify(expected)}`);
  }
}

function forbidText(relativePath, forbidden, label) {
  const source = read(relativePath);
  if (source.includes(forbidden)) {
    failures.push(`${label}: ${relativePath} still contains ${JSON.stringify(forbidden)}`);
  }
}

const submitRoute = "src/app/(store)/api/checkout/submit/route.ts";
const confirmRoute = "src/app/(store)/api/checkout/confirm/route.ts";
const paymentOptionsRoute =
  "src/app/(store)/api/checkout/payment/options/route.ts";
const uploadRoute = "src/app/(store)/api/uploads/r2/put/route.ts";
const uploadProof = "src/lib/uploads/upload-proof.server.ts";
const webhookRoute = "src/app/(store)/api/webhooks/moyasar/route.ts";
const topupVerifier = "src/lib/wallet/moyasar-topup.server.ts";
const topupRoute = "src/app/(store)/api/account/wallet/topup/route.ts";
const withdrawalRoute =
  "src/app/(store)/api/account/wallet/withdrawals/route.ts";
const mobileCors = "src/app/(store)/api/mobile/v1/_shared/cors.ts";
const mobileProxy =
  "src/app/(store)/api/mobile/v1/_shared/store-route-proxy.ts";
const couponSql = "database/20260723_stage6_coupon_reservation.sql";

forbidText(
  "src/lib/auth/session.ts",
  "dev-secret",
  "Authentication secrets must not use a shared development fallback",
);
requireText(
  "src/lib/auth/session.ts",
  'requireRuntimeSecret("AUTH_SESSION_SECRET")',
  "Session signing must fail closed in production",
);
requireText(
  "src/lib/auth/session.ts",
  'requireRuntimeSecret("AUTH_OAUTH_TRANSFER_SECRET")',
  "OAuth transfers must use a separate secret",
);

requireText(
  paymentOptionsRoute,
  'disabled_reason: "PAYMENT_PROVIDER_CHECKOUT_NOT_IMPLEMENTED"',
  "Unimplemented online providers must be disabled",
);
requireText(
  confirmRoute,
  '"PAYMENT_PROVIDER_CHECKOUT_NOT_IMPLEMENTED"',
  "Checkout confirmation must reject unimplemented online providers",
);
requireText(
  submitRoute,
  '"PAYMENT_PROVIDER_CHECKOUT_NOT_IMPLEMENTED"',
  "Order submission must reject unimplemented online providers",
);

requireText(
  uploadRoute,
  "detectImageMime",
  "Receipt uploads must validate file signatures",
);
requireText(
  uploadRoute,
  '"bank-transfer-receipt"',
  "Receipt uploads need a dedicated upload kind",
);
requireText(
  uploadProof,
  'createHmac("sha256"',
  "Receipt upload proofs must be signed",
);
requireText(
  submitRoute,
  "verifyUploadProof(uploadProofToken",
  "Checkout must verify the signed receipt upload proof",
);

requireText(
  couponSql,
  "pg_advisory_xact_lock",
  "Coupon limits must be serialized in the database",
);
requireText(
  couponSql,
  "checkout_reserve_coupon_redemption",
  "Coupon reservation RPC must exist",
);
requireText(
  submitRoute,
  'rpc("checkout_reserve_coupon_redemption"',
  "Checkout must reserve coupon usage atomically",
);
requireText(
  submitRoute,
  'rpc("checkout_release_coupon_redemption"',
  "Failed checkout must release coupon reservations",
);

requireText(
  webhookRoute,
  'requireRuntimeSecret("MOYASAR_WEBHOOK_SECRET"',
  "Moyasar webhook authentication must fail closed",
);
requireText(
  webhookRoute,
  "timingSafeTextEqual",
  "Webhook secret comparison must be timing safe",
);
requireText(
  webhookRoute,
  'type === "payment_paid"',
  "Only a paid event may trigger wallet credit",
);
for (const field of ["store_id", "topup_session_id", "customer_id", "purpose"]) {
  requireText(
    topupVerifier,
    `metadata.${field}`,
    `Moyasar verification must bind ${field}`,
  );
}
requireText(
  topupVerifier,
  'String(payment.status) !== "paid"',
  "Moyasar payment status must be verified server-side",
);
requireText(
  topupVerifier,
  "paymentAmount !== expectedMinor",
  "Moyasar amount must match the server-created session",
);

for (const walletRoute of [topupRoute, withdrawalRoute]) {
  requireText(
    walletRoute,
    "storeCustomerExists",
    "Wallet operations must verify store membership",
  );
  requireText(
    walletRoute,
    "currency:",
    "Wallet currency must be derived from server context",
  );
  forbidText(
    walletRoute,
    "body.currency",
    "Wallet routes must not trust client currency",
  );
}
forbidText(
  topupRoute,
  "req.nextUrl.origin",
  "Top-up callbacks must not trust the request Host/Origin",
);

requireText(
  mobileCors,
  "MOBILE_CORS_ALLOWED_ORIGINS",
  "Browser origins for the mobile API must be allowlisted",
);
forbidText(
  mobileProxy,
  'request.headers.get("cookie")',
  "The mobile proxy must not forward caller-supplied cookies",
);
requireText(
  mobileProxy,
  'appendCookie(cookie, "elyaia_session"',
  "The mobile proxy must reconstruct identity from the verified bearer token",
);

if (failures.length) {
  console.error("Stage 6 security gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Stage 6 security gate passed (23 controls).");
