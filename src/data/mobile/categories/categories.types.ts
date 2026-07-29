import type { MobileProductCard } from "../home/home.types";

export type MobileCategoryNode = {
  id: string;
  name: string;
  slug: string;
  public_no: number;
  parent_id: string | null;
  depth: number;
  image_url: string | null;
  children: MobileCategoryNode[];
};

export type MobileCategoriesPayload = {
  config_version: number;
  branding: Record<string, unknown>;
  navigation: Record<string, unknown>;
  design: Record<string, unknown>;
  tree: MobileCategoryNode[];
  selected: MobileCategoryNode | null;
  ancestors: MobileCategoryNode[];
  products: MobileProductCard[];
  pagination: {
    offset: number;
    limit: number;
    next_offset: number | null;
    has_more: boolean;
  };
};
