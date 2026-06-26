import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "حذف حساب Elyaia",
  description: "خطوات طلب حذف حساب التاجر وبياناته من منصة إيلايا.",
  robots: {
    index: true,
    follow: true,
  },
};

const steps = [
  ["01", "سجّل الدخول", "سجّل الدخول إلى لوحة التاجر بالحساب الذي تريد حذفه."],
  ["02", "افتح الملف الشخصي", "انتقل إلى الملف الشخصي ثم تبويب الأمان، وفي آخر الصفحة ستجد منطقة الخطر."],
  ["03", "اطلب حذف الحساب", "اكتب عبارة التأكيد المطلوبة. يفحص النظام تلقائيًا أي التزامات مفتوحة قبل قبول الجدولة."],
  ["04", "ألغِ الطلب عند الحاجة", "بعد قبول الطلب توجد مهلة 30 يومًا يمكنك خلالها إلغاء طلب الحذف من نفس المكان."],
] as const;

export default function AccountDeletionPage() {
  return (
    <section className="ely-privacy" aria-labelledby="account-deletion-title">
      <div className="ely-shell">
        <header className="ely-privacy__hero">
          <div className="ely-privacy__hero-copy">
            <span className="ely-privacy__eyebrow">إدارة الحساب</span>
            <h1 id="account-deletion-title">حذف حساب Elyaia</h1>
            <p>
              يوفر Elyaia مسارًا واضحًا لطلب حذف حساب التاجر. لا ينفذ الحذف فورًا
              عندما تكون هناك حقوق أو عمليات مفتوحة مرتبطة بالعملاء.
            </p>
          </div>

          <div className="ely-privacy__updated" aria-label="تنفيذ آمن للحذف">
            <span>فترة الإلغاء</span>
            <strong>30 يومًا</strong>
          </div>
        </header>

        <div className="ely-privacy__notice">
          <span aria-hidden="true">◈</span>
          <p>
            لا يحتاج هذا الرابط إلى تسجيل دخول. لبدء الطلب فعليًا، سجّل الدخول إلى
            لوحة التاجر واتبع الخطوات أدناه.
          </p>
        </div>

        <div className="ely-privacy__layout">
          <article className="ely-privacy__document">
            <section className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="01" />
                <div>
                  <h2>طريقة طلب حذف الحساب</h2>
                  <p>نفّذ الخطوات التالية من حساب التاجر نفسه:</p>
                </div>
              </div>

              <ol className="ely-privacy__list">
                {steps.map(([number, title, description]) => (
                  <li key={number}>
                    <strong>{title}:</strong> {description}
                  </li>
                ))}
              </ol>

              <p className="ely-privacy__note">
                <a href="https://e.elyaia.com/profile?tab=security">
                  فتح لوحة التاجر وطلب حذف الحساب
                </a>
              </p>
            </section>

            <section className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="02" />
                <div>
                  <h2>متى لا يمكن تنفيذ الحذف مباشرة؟</h2>
                  <p>
                    يوقف النظام طلب الحذف مؤقتًا إذا كان المتجر المملوك للحساب لديه
                    التزامات مفتوحة، مثل طلبات غير مكتملة أو شحنات قائمة أو إثباتات
                    تحويل قيد المراجعة أو روابط دفع أو حركات محفظة معلقة.
                  </p>
                  <p>
                    يجب معالجة هذه الالتزامات أولًا لحماية العملاء ومنع إغلاق متجر
                    عليه حقوق أو طلبات لم تنته بعد. بعد المعالجة يمكن إعادة فحص الطلب
                    من صفحة الأمان نفسها.
                  </p>
                </div>
              </div>
            </section>

            <section className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="03" />
                <div>
                  <h2>ما الذي يحدث بعد قبول الطلب؟</h2>
                  <p>
                    عند قبول طلب حساب يملك متجرًا وحده، يتوقف المتجر عن استقبال طلبات
                    جديدة طوال فترة الإلغاء. عند انتهاء المهلة دون إلغاء، يُؤرشف
                    الحساب والمتجر وتُزال صلاحية الدخول وتُحذف بيانات الحساب التي لا
                    يلزم الاحتفاظ بها.
                  </p>
                  <p>
                    تحتفظ المنصة فقط بالسجلات التي يلزم الاحتفاظ بها لحماية حقوق
                    العملاء أو للالتزامات المالية أو النظامية، مثل بيانات الطلبات
                    والفواتير والشحنات ذات الصلة، وتبقى غير متاحة للعامة.
                  </p>
                </div>
              </div>
            </section>

            <section className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="04" />
                <div>
                  <h2>إذا كان للمتجر مالك آخر</h2>
                  <p>
                    إذا كان للمتجر مالك نشط آخر، لا يغلق المتجر بسبب طلبك. تُزال
                    صلاحيتك وحسابك فقط عند تنفيذ الطلب، ويبقى المتجر تحت إدارة المالك
                    الآخر.
                  </p>
                </div>
              </div>
            </section>

            <section className="ely-privacy__section ely-privacy__section--contact">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="05" />
                <div>
                  <h2>المساعدة في طلبات الحذف</h2>
                  <p>
                    عند تعذر الوصول إلى الحساب أو وجود مشكلة تمنع تنفيذ الطلب، استخدم
                    صفحة التواصل مع تزويدنا بالبريد المرتبط بحساب التاجر للتحقق من
                    الهوية ومتابعة الطلب.
                  </p>
                  <Link className="ely-privacy__contact-link" href="/platform/contact">
                    تواصل مع فريق إيلايا
                  </Link>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>
    </section>
  );
}

function SectionNumber({ value }: { value: string }) {
  return <span className="ely-privacy__section-number">{value}</span>;
}
