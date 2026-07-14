type ReferralRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export async function processPaidOrderReferral(args: {
  db: ReferralRpcClient;
  storeId: string;
  orderId: string;
  source: string;
}) {
  const result = await args.db.rpc("referral_qualify_and_process_paid_order", {
    p_store_id: args.storeId,
    p_order_id: args.orderId,
    p_idempotency_key: `referral:order-paid:${args.storeId}:${args.orderId}`,
    p_source: args.source,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function reverseOrderReferralRewards(args: {
  db: ReferralRpcClient;
  storeId: string;
  orderId: string;
  source: string;
  operationId: string;
}) {
  const result = await args.db.rpc("referral_reverse_order_rewards", {
    p_store_id: args.storeId,
    p_order_id: args.orderId,
    p_idempotency_key: `referral:reverse:${args.storeId}:${args.orderId}:${args.operationId}`,
    p_source: args.source,
  });
  if (result.error) throw result.error;
  return result.data;
}
