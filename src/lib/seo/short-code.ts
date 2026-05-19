// apps/storefront/src/lib/seo/short-code.ts
import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
// بدون 0,O,I,l عشان ما تلخبط

function randomString(len: number) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** كود 4-6 أحرف حسب رغبتك */
export function generateShortCode(len = 4) {
  return randomString(len);
}
