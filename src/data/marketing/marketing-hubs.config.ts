export type MarketingHubType =
  | "trend"
  | "seasonal"
  | "best_seller"
  | "new_arrival"
  | "clearance"
  | "flash_sale";

export type MarketingHubConfig = {
  type: MarketingHubType;
  path: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  emptyTitle: string;
  emptyDescription: string;
  tone: "trend" | "seasonal" | "best-seller" | "new-arrival" | "clearance" | "flash-sale";
};

export const MARKETING_HUBS: Record<MarketingHubType, MarketingHubConfig> = {
  trend: {
    type: "trend",
    path: "/trends",
    title: "الترندات",
    eyebrow: "الرائج الآن",
    description: "اكتشف الترندات النشطة والمنتجات المرتبطة بها.",
    icon: "🔥",
    emptyTitle: "لا توجد ترندات نشطة الآن",
    emptyDescription: "عند تفعيل مجموعة من نوع ترند ستظهر هنا تلقائيًا.",
    tone: "trend",
  },
  seasonal: {
    type: "seasonal",
    path: "/seasons",
    title: "المواسم والمناسبات",
    eyebrow: "اختيارات لكل موسم",
    description: "تسوّق مجموعات المواسم والمناسبات الحالية في مكان واحد.",
    icon: "🌙",
    emptyTitle: "لا توجد مواسم نشطة الآن",
    emptyDescription: "عند تفعيل مجموعة موسمية ستظهر هنا تلقائيًا.",
    tone: "seasonal",
  },
  best_seller: {
    type: "best_seller",
    path: "/best-sellers",
    title: "الأفضل مبيعًا",
    eyebrow: "الأكثر طلبًا",
    description: "المنتجات والمجموعات التي يفضّلها العملاء أكثر.",
    icon: "🏆",
    emptyTitle: "لا توجد مجموعات للأفضل مبيعًا الآن",
    emptyDescription: "عند تفعيل مجموعة من نوع الأفضل مبيعًا ستظهر هنا.",
    tone: "best-seller",
  },
  new_arrival: {
    type: "new_arrival",
    path: "/new-arrivals",
    title: "وصل حديثًا",
    eyebrow: "الجديد أولًا",
    description: "تعرّف على أحدث المنتجات والمجموعات التي وصلت إلى المتجر.",
    icon: "🆕",
    emptyTitle: "لا توجد مجموعات جديدة الآن",
    emptyDescription: "عند تفعيل مجموعة من نوع وصل حديثًا ستظهر هنا.",
    tone: "new-arrival",
  },
  clearance: {
    type: "clearance",
    path: "/clearance",
    title: "التصفية",
    eyebrow: "فرص قبل النفاد",
    description: "مجموعات التصفية والعروض النهائية المتاحة حاليًا.",
    icon: "🏷️",
    emptyTitle: "لا توجد تصفيات نشطة الآن",
    emptyDescription: "عند تفعيل مجموعة تصفية ستظهر هنا تلقائيًا.",
    tone: "clearance",
  },
  flash_sale: {
    type: "flash_sale",
    path: "/flash-deals",
    title: "العروض السريعة",
    eyebrow: "لفترة محدودة",
    description: "عروض ومجموعات محدودة الوقت قبل انتهاء المدة.",
    icon: "⚡",
    emptyTitle: "لا توجد عروض سريعة الآن",
    emptyDescription: "عند تفعيل عرض سريع سيظهر هنا تلقائيًا.",
    tone: "flash-sale",
  },
};
