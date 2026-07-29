import "server-only";

export async function storeCustomerExists(
  db: any,
  storeId: string,
  customerId: string,
) {
  const result = await db
    .from("store_customers")
    .select("customer_id")
    .eq("store_id", String(storeId))
    .eq("customer_id", String(customerId))
    .limit(1)
    .maybeSingle();

  if (result.error) throw result.error;
  return Boolean(result.data?.customer_id);
}
