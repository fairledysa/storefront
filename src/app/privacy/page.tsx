// FILE: apps/storefront/src/app/privacy/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | منصة elyaia",
  description: "سياسة الخصوصية وحماية البيانات في منصة elyaia.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#FAFBFC] px-5 py-10 text-[#1F2933]"
    >
      <section className="mx-auto max-w-3xl rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 border-b border-[#E2E8F0] pb-6">
          <Link
            href="/"
            className="mb-4 inline-flex text-sm font-bold text-[#0D3B45]"
          >
            ← العودة للرئيسية
          </Link>

          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#0D3B45]">
            سياسة الخصوصية
          </h1>

          <p className="mt-3 text-sm font-semibold leading-7 text-[#64748B]">
            توضح هذه السياسة كيفية تعامل منصة elyaia مع البيانات والمعلومات عند
            استخدام المنصة أو تسجيل الدخول أو إدارة المتاجر الإلكترونية.
          </p>
        </div>

        <div className="space-y-7 text-sm font-semibold leading-8 text-[#334155]">
          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              1. المعلومات التي نجمعها
            </h2>
            <p>
              قد نجمع معلومات أساسية مثل الاسم، البريد الإلكتروني، رقم الجوال،
              بيانات المتجر، بيانات الطلبات، وبيانات الاستخدام اللازمة لتشغيل
              المنصة وتحسين خدماتها.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              2. استخدام المعلومات
            </h2>
            <p>
              تُستخدم المعلومات لتقديم خدمات المنصة، تسجيل الدخول، إدارة
              الحسابات والمتاجر، معالجة الطلبات، تحسين الأداء، دعم المستخدمين،
              وتوفير تجربة أكثر أمانًا وموثوقية.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              3. تسجيل الدخول عبر مزودي الخدمة
            </h2>
            <p>
              عند استخدام تسجيل الدخول عبر Google أو Facebook أو أي مزود خارجي،
              قد نستقبل بيانات محدودة مثل معرف الحساب، البريد الإلكتروني، والاسم
              حسب الصلاحيات التي يتيحها المزود، وذلك لغرض تسجيل الدخول وربط
              الحساب فقط.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              4. مشاركة البيانات
            </h2>
            <p>
              لا نقوم ببيع بيانات المستخدمين. قد تتم مشاركة بعض البيانات فقط مع
              مزودي الخدمات الضروريين لتشغيل المنصة مثل الاستضافة، المصادقة،
              التحليلات، الدفع، أو الشحن، وبالقدر اللازم لتقديم الخدمة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              5. حماية البيانات
            </h2>
            <p>
              نستخدم إجراءات تقنية وتنظيمية للمساعدة في حماية البيانات من
              الوصول غير المصرح به أو الفقد أو سوء الاستخدام، مع التأكيد أن أي
              نظام تقني لا يمكن ضمان حمايته بنسبة مطلقة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              6. ملفات تعريف الارتباط
            </h2>
            <p>
              قد تستخدم المنصة ملفات تعريف الارتباط والجلسات لحفظ حالة تسجيل
              الدخول، تحسين تجربة الاستخدام، وتأمين العمليات داخل المتجر أو لوحة
              الإدارة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              7. تحديث السياسة
            </h2>
            <p>
              قد يتم تحديث سياسة الخصوصية من وقت لآخر. استمرار استخدامك للمنصة
              بعد نشر التحديثات يعني موافقتك على السياسة المحدثة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              8. التواصل
            </h2>
            <p>
              لأي استفسار بخصوص الخصوصية أو البيانات، يمكنك التواصل مع إدارة
              منصة elyaia عبر قنوات التواصل الرسمية المتاحة في الموقع.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}