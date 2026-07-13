type LoyaltyRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export async function awardPaidOrderLoyaltyPoints(args: {
  db: LoyaltyRpcClient;
  storeId: string;
  orderId: string;
  source: string;
}) {
  const idempotencyKey = `loyalty:order-paid:${args.storeId}:${args.orderId}`;
  const result = await args.db.rpc("loyalty_award_paid_order", {
    p_store_id: args.storeId,
    p_order_id: args.orderId,
    p_idempotency_key: idempotencyKey,
    p_source: args.source,
  });

  if (result.error) throw result.error;
  return result.data;
}
