// FILE: apps/storefront/src/themes/basit/screens/home/_dynamic/types.ts

export type HomeDynamicItem = {
  title: string;
  description?: string;
  src: string;
  href: string;
};

export type HomeDynamicSection = {
  id: string;
  key: string;
  slug: string;
  renderKey: string;
  title: string;
  items: HomeDynamicItem[];
  raw: any;
};

export type CountdownContent = {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: any;
  image: string;
  target: string;
  labels: {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
};

export type ProductTabSource =
  | "manual"
  | "category"
  | "latest"
  | "best_selling";

export type ProductSliderItem = {
  id: string;
  href: string;
  brand: string;
  title: string;
  imageUrl: string;
  rating?: number;
  reviewsCount?: number;
  price: number;
  compareAtPrice?: number | null;
  badge?: { text: string; bg: string; color: string } | null;
};

export type ProductsTabItem = {
  id: string;
  title: string;
  source: ProductTabSource;
  productIds: string[];
  categoryId: string;
  limit: number;
  products: ProductSliderItem[];
};

export type ShowcaseFeatureSide = "right" | "left";

export type ShowcaseFeatureItem = {
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  side: ShowcaseFeatureSide;
};

export type FeaturesProductShowcaseContent = {
  eyebrow: string;
  title: string;
  productTitle: string;
  productImage: string;
  productHref: string;
  price: string;
  currency: string;
  buttonText: string;
  features: ShowcaseFeatureItem[];
};

export type FeaturedMosaicSideImage = {
  image: string;
  alt: string;
  href: string;
};

export type FeaturedMosaicOfferContent = {
  productHref: string;
  mainImage: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonText: string;
  textColor: string;
  buttonBg: string;
  textPosition: string;
  widthMode: "container" | "full_width";
  sideImages: FeaturedMosaicSideImage[];
};

export type StatsHeroSplitStatItem = {
  value: string;
  label: string;
  icon: string;
  iconBg: string;
  iconBorder: string;
};

export type StatsHeroSplitContent = {
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  contentSide: "right" | "left";
  stats: StatsHeroSplitStatItem[];
};

export type StatsGridItem = {
  value: string;
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
};

export type StatsGridContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  backgroundText: string;
  items: StatsGridItem[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqContent = {
  title: string;
  description: string;
  columns: "1" | "2";
  items: FaqItem[];
};

export type TestimonialNameMode = "full" | "masked";

export type TestimonialItem = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  text: string;
  rating: number;
  createdAt: string;
};

export type TestimonialsContent = {
  title: string;
  description: string;
  nameMode: TestimonialNameMode;
  showDate: boolean;
  bestOnly: boolean;
  limit: number;
  showAllButton: boolean;
  buttonText: string;
  loadMoreLimit: number;
  items: TestimonialItem[];
};