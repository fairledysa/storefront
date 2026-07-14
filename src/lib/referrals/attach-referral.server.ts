import { cookies } from "next/headers";
import { getStoreDb } from "@/data/db/store-db.server";

const REFERRAL_COOKIE = "elyaia_referral";
const REFERRAL_SESSION_COOKIE = "elyaia_referral_session";

export async function attachPendingReferral(storeId: string, customerId: string) {
  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value?.trim();
  const sessionKey = jar.get(REFERRAL_SESSION_COOKIE)?.value?.trim();
  if (!code || !sessionKey || !storeId || !customerId) return null;

  try {
    const db: any = await getStoreDb(storeId);
    const result = await db.rpc("referral_attach_customer", {
      p_store_id: storeId,
      p_code: code,
      p_invited_customer_id: customerId,
      p_session_key: sessionKey,
    });

    const payload = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!result.error && (payload?.ok || payload?.error)) {
      jar.delete(REFERRAL_COOKIE);
      jar.delete(REFERRAL_SESSION_COOKIE);
    }

    if (result.error) {
      console.warn("[referrals] attach failed", result.error.message);
      return null;
    }
    return payload ?? null;
  } catch (error) {
    console.warn("[referrals] attach failed", error);
    return null;
  }
}
