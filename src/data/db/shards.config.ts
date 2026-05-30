// FILE: apps/storefront/src/data/db/shards.config.ts

export type ShardKind = "control" | "store" | "orders";

export type ShardStatus = "active" | "readonly" | "disabled";

export type ShardConfig = {
  key: string;
  kind: ShardKind;
  envPrefix: string;
  status: ShardStatus;
  isDefault?: boolean;
};

export const CONTROL_SHARD_KEY = "control_main";
export const DEFAULT_STORE_SHARD_KEY = "store_shard_01";
export const DEFAULT_ORDERS_SHARD_KEY = "orders_shard_01";

export const SHARD_CONFIGS: readonly ShardConfig[] = [
  {
    key: CONTROL_SHARD_KEY,
    kind: "control",
    envPrefix: "CONTROL_MAIN",
    status: "active",
    isDefault: true,
  },
  {
    key: DEFAULT_STORE_SHARD_KEY,
    kind: "store",
    envPrefix: "STORE_SHARD_01",
    status: "active",
    isDefault: true,
  },
  {
    key: DEFAULT_ORDERS_SHARD_KEY,
    kind: "orders",
    envPrefix: "ORDERS_SHARD_01",
    status: "active",
    isDefault: true,
  },
] as const;

export function getShardConfig(shardKey: string): ShardConfig {
  const config = SHARD_CONFIGS.find((item) => item.key === shardKey);

  if (!config) {
    throw new Error(`Unknown shard key: ${shardKey}`);
  }

  if (config.status === "disabled") {
    throw new Error(`Shard is disabled: ${shardKey}`);
  }

  return config;
}

export function getDefaultShardConfig(kind: ShardKind): ShardConfig {
  const config = SHARD_CONFIGS.find(
    (item) =>
      item.kind === kind &&
      item.isDefault === true &&
      item.status !== "disabled",
  );

  if (!config) {
    throw new Error(`Missing default shard config for kind: ${kind}`);
  }

  return config;
}