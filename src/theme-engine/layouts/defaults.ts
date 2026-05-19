// FILE: apps/storefront/src/theme-engine/layouts/defaults.ts
export function defaultHomeLayout() {
  return [
    {
      id: "hero_1",
      type: "hero",
      enabled: true,
      sort: 1,
      props: {
        title: "حياك الله 👋",
        subtitle: "متجرك جاهز — رتب البلوكات وخلك كلاس.",
        cta_label: "ابدأ التسوق",
        cta_href: "/c/all",
        align: "right",
        variant: "default",
      },
    },
    {
      id: "cats_1",
      type: "categories_grid",
      enabled: true,
      sort: 2,
      props: { title: "الأقسام", limit: 12, show_images: true, source: "top_level" },
    },
    {
      id: "prod_1",
      type: "products_grid",
      enabled: true,
      sort: 3,
      props: {
        title: "منتجات مميزة",
        limit: 12,
        source: "featured",
        sort: "newest",
        show_price: true,
        show_add_to_cart: true,
      },
    },
    {
      id: "banner_1",
      type: "banner",
      enabled: true,
      sort: 4,
      props: {
        text: "شحن سريع + دفع آمن + تجربة نظيفة.",
        cta_label: "اعرف أكثر",
        cta_href: "/",
      },
    },
    {
      id: "footer_1",
      type: "footer",
      enabled: true,
      sort: 5,
      props: {
        show_social: true,
        links: [
          { label: "سياسة الخصوصية", href: "/privacy" },
          { label: "الشروط", href: "/terms" },
          { label: "تواصل معنا", href: "/contact" },
        ],
      },
    },
  ];
}
