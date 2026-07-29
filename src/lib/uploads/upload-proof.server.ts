import "server-only";

import crypto from "crypto";

import {
  requireRuntimeSecret,
  timingSafeTextEqual,
} from "@/lib/security/runtime-secrets.server";

type UploadProofPayload = {
  v: 1;
  store_id: string;
  customer_id: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  exp: number;
};

type UploadProofExpected = Omit<UploadProofPayload, "v" | "exp">;

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function secret() {
  return requireRuntimeSecret("UPLOAD_PROOF_SIGNING_SECRET");
}

function sign(encodedPayload: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(encodedPayload)
    .digest("base64url");
}

function normalizeExpected(
  value: UploadProofExpected,
): UploadProofExpected {
  return {
    store_id: String(value.store_id ?? "").trim(),
    customer_id: String(value.customer_id ?? "").trim(),
    public_url: String(value.public_url ?? "").trim(),
    mime_type: String(value.mime_type ?? "").trim().toLowerCase(),
    size_bytes: Math.max(0, Math.floor(Number(value.size_bytes ?? 0))),
  };
}

export function createUploadProof(
  value: UploadProofExpected,
  ttlSeconds = 60 * 60,
) {
  const normalized = normalizeExpected(value);
  const payload: UploadProofPayload = {
    v: 1,
    ...normalized,
    exp: Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds),
  };

  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyUploadProof(
  token: unknown,
  expectedValue: UploadProofExpected,
) {
  const [encodedPayload, signature, ...extra] = String(token ?? "").split(".");
  if (!encodedPayload || !signature || extra.length > 0) return false;

  const expectedSignature = sign(encodedPayload);
  if (!timingSafeTextEqual(signature, expectedSignature)) return false;

  let payload: UploadProofPayload;

  try {
    payload = JSON.parse(decode(encodedPayload)) as UploadProofPayload;
  } catch {
    return false;
  }

  if (payload?.v !== 1) return false;
  if (!Number.isFinite(payload.exp) || payload.exp < Date.now() / 1000) {
    return false;
  }

  const expected = normalizeExpected(expectedValue);
  const actual = normalizeExpected(payload);

  return (
    actual.store_id === expected.store_id &&
    actual.customer_id === expected.customer_id &&
    actual.public_url === expected.public_url &&
    actual.mime_type === expected.mime_type &&
    actual.size_bytes === expected.size_bytes
  );
}
