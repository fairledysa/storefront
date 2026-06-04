// FILE: apps/storefront/src/app/privacy/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | منصة elyaia",
  description:
    "سياسة الخصوصية الخاصة بمنصة elyaia وشرح طريقة التعامل مع بيانات المستخدمين والعملاء.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
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
            سياسة الخصوصية
          </h1>

          <p className="mt-3 text-sm font-semibold leading-7 text-[#64748b]">
            توضح هذه السياسة كيف تتعامل منصة elyaia مع البيانات التي يتم
            جمعها عند استخدام خدمات المنصة أو المتاجر المرتبطة بها.
          </p>
        </div>

        <div className="space-y-7 text-sm font-semibold leading-8 text-[#334155]">
          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              1. البيانات التي قد نجمعها
            </h2>
            <p>
              قد نقوم بجمع بيانات أساسية مثل الاسم، البريد الإلكتروني، رقم
              الجوال، المدينة، بيانات الطلبات، بيانات الشحن، وبيانات الاستخدام
              اللازمة لتحسين تجربة العميل وتشغيل المتجر.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              2. استخدام البيانات
            </h2>
            <p>
              تُستخدم البيانات لتسجيل الدخول، إدارة الحساب، تنفيذ الطلبات،
              متابعة الشحن، تحسين الخدمات، إرسال الإشعارات المتعلقة بالطلبات،
              وتقديم الدعم الفني عند الحاجة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              3. مشاركة البيانات
            </h2>
            <p>
              لا نقوم ببيع بيانات المستخدمين. قد تتم مشاركة بعض البيانات مع
              مزودي الخدمات الضروريين مثل بوابات الدفع أو شركات الشحن أو خدمات
              التحقق، وذلك فقط بالقدر اللازم لتقديم الخدمة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              4. حماية البيانات
            </h2>
            <p>
              نستخدم إجراءات تقنية وتنظيمية للمساعدة في حماية البيانات من
              الوصول غير المصرح به أو الاستخدام غير المشروع أو الفقدان.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              5. ملفات الارتباط
            </h2>
            <p>
              قد تستخدم المنصة ملفات ارتباط أو تقنيات مشابهة لتحسين تجربة
              التصفح، حفظ الجلسة، تشغيل السلة، وتحليل الأداء.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              6. حقوق المستخدم
            </h2>
            <p>
              يمكن للمستخدم طلب تحديث بياناته أو حذفها أو الاستفسار عن طريقة
              استخدامها من خلال وسائل التواصل المعتمدة في المنصة أو المتجر.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-black text-[#1f2933]">
              7. التواصل معنا
            </h2>
            <p>
              لأي استفسار متعلق بسياسة الخصوصية، يمكن التواصل معنا عبر البريد
              الإلكتروني المعتمد للمنصة.
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