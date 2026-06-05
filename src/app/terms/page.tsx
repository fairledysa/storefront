// FILE: apps/storefront/src/app/terms/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "شروط الاستخدام | منصة elyaia",
  description:
    "شروط استخدام منصة elyaia والخدمات المرتبطة بها للمتاجر والعملاء.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#fafbfc] px-4 py-10 text-[#1f2933]"
    >
      <section className="mx-auto w-full max-w-3xl rounded-[28px] border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7 border-b border-[#e2e8f0] pb-5">
          <Link
            href="/"
            className="mb-4 inline-flex rounded-full border border-[#e2e8f0] px-4 py-2 text-sm font-bold text-[#0d3b45] hover:bg-[#ecfaf5]"
          >
            العودة للرئيسية
          </Link>



          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#0d3b45]">
            شروط الاستخدام
          </h1>

          <p className="mt-3 text-sm font-semibold leading-7 text-[#64748b]">
            باستخدامك لمنصة elyaia أو أي متجر يعمل من خلالها، فإنك توافق على
            الالتزام بهذه الشروط والأحكام.
          </p>
        </div>

        <div className="space-y-7 text-sm font-semibold leading-8 text-[#334155]">
          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              1. قبول الشروط
            </h2>
            <p>
              عند استخدام المنصة أو إنشاء حساب أو تنفيذ طلب، فإنك تقر بأنك
              قرأت هذه الشروط وتوافق على الالتزام بها.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              2. استخدام الخدمة
            </h2>
            <p>
              يجب استخدام المنصة بطريقة نظامية ومشروعة، وعدم إساءة استخدام
              الخدمات أو محاولة تعطيلها أو الوصول غير المصرح به لأي جزء منها.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              3. الحسابات والبيانات
            </h2>
            <p>
              يتحمل المستخدم مسؤولية صحة البيانات المدخلة، مثل الاسم، البريد
              الإلكتروني، رقم الجوال، عنوان الشحن، وأي بيانات لازمة لإتمام
              الطلبات.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              4. الطلبات والمدفوعات
            </h2>
            <p>
              تخضع الطلبات والأسعار وطرق الدفع وسياسات الشحن والاسترجاع
              للسياسات المعروضة داخل كل متجر، وقد تختلف من متجر إلى آخر.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              5. الملكية الفكرية
            </h2>
            <p>
              جميع الحقوق المتعلقة بالمنصة وتصميمها وبرمجياتها محفوظة، ولا
              يجوز نسخها أو إعادة استخدامها دون إذن مسبق.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              6. حدود المسؤولية
            </h2>
            <p>
              تسعى المنصة لتقديم خدمة مستقرة وآمنة، لكنها لا تضمن خلو الخدمة من
              الانقطاعات أو الأخطاء التقنية الخارجة عن السيطرة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              7. تعديل الشروط
            </h2>
            <p>
              قد يتم تحديث هذه الشروط من وقت لآخر، ويصبح التحديث ساريًا عند
              نشره على هذه الصفحة.
            </p>
          </section>

          <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#64748b]">
            آخر تحديث: 2026/06/05
          </p>
        </div>
      </section>
    </main>
  );
}