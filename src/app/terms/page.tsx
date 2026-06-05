// FILE: apps/storefront/src/app/terms/page.tsx

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "شروط الاستخدام | منصة elyaia",
  description: "شروط استخدام منصة elyaia للتجارة الإلكترونية.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
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
            شروط الاستخدام
          </h1>

          <p className="mt-3 text-sm font-semibold leading-7 text-[#64748B]">
            توضح هذه الصفحة الشروط العامة لاستخدام منصة elyaia وخدماتها
            المرتبطة بإنشاء وإدارة المتاجر الإلكترونية.
          </p>
        </div>

        <div className="space-y-7 text-sm font-semibold leading-8 text-[#334155]">
          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              1. قبول الشروط
            </h2>
            <p>
              باستخدامك لمنصة elyaia، فإنك توافق على الالتزام بهذه الشروط
              والسياسات المرتبطة بها. إذا كنت لا توافق على هذه الشروط، يجب عليك
              عدم استخدام المنصة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              2. استخدام المنصة
            </h2>
            <p>
              توفر منصة elyaia أدوات لإنشاء وإدارة المتاجر الإلكترونية، بما في
              ذلك إدارة المنتجات والطلبات والعملاء وبعض أدوات التسويق والتقارير.
              يجب استخدام المنصة بطريقة نظامية ولا تخالف الأنظمة أو حقوق الآخرين.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              3. حساب المستخدم
            </h2>
            <p>
              المستخدم مسؤول عن صحة البيانات التي يقدمها وعن الحفاظ على سرية
              بيانات الدخول الخاصة به. يحق للمنصة اتخاذ الإجراءات المناسبة عند
              وجود استخدام غير مصرح أو مخالف.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              4. المتاجر والمحتوى
            </h2>
            <p>
              يتحمل صاحب المتجر المسؤولية الكاملة عن المنتجات والمحتوى والأسعار
              والسياسات التي يعرضها في متجره، بما في ذلك الالتزام بالأنظمة
              المحلية وحماية حقوق المستهلك.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              5. المدفوعات والخدمات الخارجية
            </h2>
            <p>
              قد ترتبط المنصة بخدمات خارجية مثل بوابات الدفع، الشحن، التحليلات،
              أو تسجيل الدخول عبر مزودي الهوية. يخضع استخدام هذه الخدمات لشروط
              مزوديها إضافة إلى شروط المنصة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              6. التعديلات
            </h2>
            <p>
              قد يتم تحديث شروط الاستخدام من وقت لآخر لتحسين الخدمة أو الالتزام
              بالمتطلبات النظامية. استمرارك في استخدام المنصة بعد التحديث يعني
              موافقتك على الشروط المحدثة.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black text-[#1F2933]">
              7. التواصل
            </h2>
            <p>
              لأي استفسار متعلق بشروط الاستخدام، يمكنك التواصل مع إدارة المنصة
              عبر قنوات التواصل الرسمية المتاحة في موقع elyaia.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}