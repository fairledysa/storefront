export type MegaSection = {
  title: string;
  items: Array<{ label: string; href: string }>;
};

export type MegaCategory = {
  key: string;
  label: string;
  href: string;
  sections: MegaSection[];
};

export const MEGA_CATEGORIES: MegaCategory[] = [
  {
    key: "makeup",
    label: "المكياج",
    href: "/c/makeup",
    sections: [
      {
        title: "الوجه",
        items: [
          { label: "فاونديشن", href: "/c/makeup/foundation" },
          { label: "كونسيلر", href: "/c/makeup/concealer" },
          { label: "بودرة", href: "/c/makeup/powder" },
        ],
      },
      {
        title: "العيون",
        items: [
          { label: "ماسكارا", href: "/c/makeup/mascara" },
          { label: "آيلاينر", href: "/c/makeup/eyeliner" },
          { label: "ظلال", href: "/c/makeup/eyeshadow" },
        ],
      },
      {
        title: "الشفاه",
        items: [
          { label: "روج", href: "/c/makeup/lipstick" },
          { label: "قلوس", href: "/c/makeup/gloss" },
        ],
      },
      {
        title: "إكسسوارات",
        items: [
          { label: "فرش", href: "/c/makeup/brushes" },
          { label: "إسفنج", href: "/c/makeup/sponges" },
        ],
      },
    ],
  },
  {
    key: "perfume",
    label: "العطور",
    href: "/c/perfume",
    sections: [
      {
        title: "حسب النوع",
        items: [
          { label: "نسائي", href: "/c/perfume/women" },
          { label: "رجالي", href: "/c/perfume/men" },
          { label: "للجنسين", href: "/c/perfume/unisex" },
        ],
      },
      {
        title: "حسب التركيز",
        items: [
          { label: "EDP", href: "/c/perfume/edp" },
          { label: "EDT", href: "/c/perfume/edt" },
        ],
      },
      {
        title: "الأكثر طلباً",
        items: [{ label: "الأكثر مبيعاً", href: "/best-sellers" }],
      },
      { title: "مجموعات", items: [{ label: "هدايا", href: "/gifts" }] },
    ],
  },
];
