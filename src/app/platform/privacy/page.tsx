import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة خصوصية Elyaia",
  description: "سياسة الخصوصية العامة لمنصة إيلايا للتجارة الإلكترونية.",
  robots: {
    index: true,
    follow: true,
  },
};

const updatedAt = "27 يونيو 2026";

const contents = [
  ["intro", "مقدمة"],
  ["data", "البيانات التي نجمعها"],
  ["use", "كيف نستخدم البيانات"],
  ["store-data", "بيانات المتاجر والعملاء والطلبات"],
  ["sharing", "مشاركة البيانات اللازمة لتشغيل الخدمة"],
  ["files", "الصور والملفات"],
  ["notifications", "الإشعارات"],
  ["security", "حماية البيانات"],
  ["retention", "مدة الاحتفاظ بالبيانات"],
  ["rights", "حقوقك وطلبات الحذف"],
  ["updates", "تحديثات السياسة"],
  ["contact", "التواصل معنا"],
] as const;

function SectionNumber({ value }: { value: string }) {
  return <span className="ely-privacy__section-number">{value}</span>;
}

export default function PlatformPrivacyPage() {
  return (
    <section className="ely-privacy" aria-labelledby="privacy-title">
      <div className="ely-shell">
        <header className="ely-privacy__hero">
          <div className="ely-privacy__hero-copy">
            <span className="ely-privacy__eyebrow">الوثائق القانونية</span>
            <h1 id="privacy-title">سياسة خصوصية Elyaia</h1>
            <p>
              توضح هذه السياسة كيف تتعامل منصة إيلايا مع البيانات اللازمة لتقديم
              خدمات التجارة الإلكترونية وتشغيل الموقع والتطبيقات المرتبطة بها.
            </p>
          </div>

          <div className="ely-privacy__updated" aria-label={`آخر تحديث ${updatedAt}`}>
            <span>آخر تحديث</span>
            <strong>{updatedAt}</strong>
          </div>
        </header>

        <div className="ely-privacy__notice">
          <span aria-hidden="true">◈</span>
          <p>
            تنطبق هذه السياسة على استخدام منصة إيلايا. وقد تكون للمتاجر المستقلة
            سياسات خصوصية خاصة بها عند البيع لعملائها.
          </p>
        </div>

        <div className="ely-privacy__layout">
          <article className="ely-privacy__document">
            <section id="intro" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="01" />
                <div>
                  <h2>مقدمة</h2>
                  <p>
                    إيلايا منصة تساعد التجار على إنشاء المتاجر الإلكترونية وإدارتها
                    وتشغيل عمليات المنتجات والطلبات والمدفوعات والشحن والتسويق من
                    مكان واحد. تحترم إيلايا خصوصية مستخدميها، وتعالج البيانات بالقدر
                    اللازم لتقديم الخدمة وتحسينها وحمايتها.
                  </p>
                </div>
              </div>
            </section>

            <section id="data" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="02" />
                <div>
                  <h2>البيانات التي نجمعها</h2>
                  <p>قد تشمل البيانات التي تتعامل معها المنصة، بحسب استخدامك للخدمة:</p>
                </div>
              </div>
              <ul className="ely-privacy__list">
                <li>
                  <strong>بيانات الحساب والتاجر:</strong> بيانات تسجيل الدخول وبيانات
                  الاتصال التي يقدمها المستخدم، وبيانات المتجر وإعداداته.
                </li>
                <li>
                  <strong>بيانات المنتجات والمحتوى:</strong> أسماء المنتجات ووصفها
                  وأسعارها وخياراتها وصورها وملفاتها والمحتوى الذي يضيفه التاجر.
                </li>
                <li>
                  <strong>بيانات العملاء والطلبات:</strong> بيانات الطلبات والعملاء
                  والعناوين ومعلومات التنفيذ التي تدخل في إدارة الطلب وتوصيله.
                </li>
                <li>
                  <strong>بيانات التعامل مع الخدمة:</strong> البيانات اللازمة لتشغيل
                  الجلسات، حماية الحسابات، معالجة الطلبات، وإتاحة الوظائف التي يطلبها
                  المستخدم.
                </li>
              </ul>
            </section>

            <section id="use" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="03" />
                <div>
                  <h2>كيف نستخدم البيانات</h2>
                  <p>نستخدم البيانات بالقدر اللازم من أجل:</p>
                </div>
              </div>
              <ul className="ely-privacy__list ely-privacy__list--two-columns">
                <li>إنشاء الحسابات والمتاجر وإدارة الوصول إليها.</li>
                <li>عرض المنتجات وتشغيل السلة والطلبات وخطوات إتمام الشراء.</li>
                <li>إدارة الطلبات والعملاء والعناوين وحالات التنفيذ.</li>
                <li>توفير التقارير والوظائف التشغيلية التي يستخدمها التاجر.</li>
                <li>إرسال الإشعارات المرتبطة بالخدمة عند تفعيلها أو السماح بها.</li>
                <li>حماية المنصة ومنع الاستخدام غير المصرح به ومعالجة الأعطال.</li>
              </ul>
            </section>

            <section id="store-data" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="04" />
                <div>
                  <h2>بيانات المتاجر والعملاء والطلبات</h2>
                  <p>
                    يدخل التاجر بيانات متجره ومنتجاته وعملائه وطلباته لإدارة نشاطه.
                    تستخدم إيلايا هذه البيانات لتشغيل المتجر والوظائف المرتبطة به، مثل
                    عرض المنتجات، تنفيذ الطلبات، وإتاحة أدوات الإدارة والتقارير.
                  </p>
                  <p>
                    لا ينبغي للتاجر إدخال بيانات لا يحتاجها لتشغيل متجره أو تنفيذ
                    طلباته، كما يظل مسؤولًا عن المحتوى والبيانات التي يضيفها إلى متجره
                    وعن تواصله مع عملائه.
                  </p>
                </div>
              </div>
            </section>

            <section id="sharing" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="05" />
                <div>
                  <h2>مشاركة البيانات اللازمة لتشغيل الخدمة</h2>
                  <p>
                    قد تُنقل البيانات اللازمة لتنفيذ عملية محددة إلى جهات خارجية
                    مرتبطة بتشغيل الخدمة، بقدر ما يلزم لهذه العملية، ومنها:
                  </p>
                </div>
              </div>
              <ul className="ely-privacy__list">
                <li>
                  <strong>بوابات الدفع:</strong> لمعالجة المدفوعات أو عرض حالة العملية
                  المالية عند استخدام وسيلة دفع متاحة في المتجر.
                </li>
                <li>
                  <strong>شركات الشحن والتوصيل:</strong> لإصدار الشحنات ومتابعتها
                  وتنفيذ توصيل الطلب عندما يختار التاجر أو العميل خدمة الشحن.
                </li>
                <li>
                  <strong>خدمات التخزين والملفات:</strong> لحفظ الصور والملفات التي
                  يرفعها المستخدمون إلى المنصة.
                </li>
                <li>
                  <strong>خدمات الإشعارات والتحليلات عند تفعيلها:</strong> لدعم
                  الإشعارات أو قياس استخدام المتجر وتحسينه وفق الإعدادات المفعّلة.
                </li>
              </ul>
              <p className="ely-privacy__note">
                لا تعرض هذه الصفحة قائمة ثابتة بأسماء جميع المزوّدين؛ لأن المزوّد
                المستخدم قد يختلف بحسب إعدادات المتجر والخدمات المفعّلة.
              </p>
            </section>

            <section id="files" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="06" />
                <div>
                  <h2>الصور والملفات</h2>
                  <p>
                    توفر المنصة رفع الصور والملفات لاستخدامها في المنتجات والمحتوى
                    المرتبط بالمتجر. تحفظ هذه الملفات ضمن خدمات التخزين المخصصة
                    لتقديم الخدمة، وتُعرض أو تُستخدم وفق إعدادات المتجر والصفحات التي
                    يربطها بها التاجر.
                  </p>
                </div>
              </div>
            </section>

            <section id="notifications" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="07" />
                <div>
                  <h2>الإشعارات</h2>
                  <p>
                    عند تفعيل الإشعارات أو منح الإذن لها، قد تستخدم المنصة البيانات
                    اللازمة لإرسال إشعارات مرتبطة بالحساب أو الطلبات أو تشغيل المتجر.
                    يمكنك التحكم في أذونات الإشعارات من إعدادات جهازك أو التطبيق متى
                    كانت هذه الإعدادات متاحة.
                  </p>
                </div>
              </div>
            </section>

            <section id="security" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="08" />
                <div>
                  <h2>حماية البيانات</h2>
                  <p>
                    نستخدم تدابير تقنية وتنظيمية معقولة للمساعدة في حماية البيانات
                    والوصول إلى الحسابات. ومع ذلك، لا توجد وسيلة نقل أو تخزين عبر
                    الإنترنت يمكن ضمان خلوها من المخاطر بصورة مطلقة.
                  </p>
                </div>
              </div>
            </section>

            <section id="retention" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="09" />
                <div>
                  <h2>مدة الاحتفاظ بالبيانات</h2>
                  <p>
                    نحتفظ بالبيانات بالقدر اللازم لتشغيل الحسابات والمتاجر والطلبات
                    والخدمات المرتبطة بها، أو للوفاء بالالتزامات النظامية، أو معالجة
                    النزاعات والمطالبات عند الحاجة. لا تعلن هذه السياسة مدة احتفاظ
                    رقمية ثابتة لأن ذلك يعتمد على نوع البيانات والخدمة المستخدمة.
                  </p>
                </div>
              </div>
            </section>

            <section id="rights" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="10" />
                <div>
                  <h2>حقوقك وطلبات الحذف</h2>
                  <p>
                    يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو طلب حذف الحساب أو
                    البيانات المرتبطة به، في الحدود التي تسمح بها طبيعة الخدمة
                    والالتزامات النظامية. لبدء طلب حذف حساب التاجر، استخدم صفحة
                    <Link href="/platform/account-deletion"> حذف الحساب</Link>
                    واتبع خطوات التحقق من الحساب.
                  </p>
                  <p>
                    لا يتم تنفيذ حذف حساب يملك متجرًا فورًا إذا كانت هناك طلبات أو
                    شحنات أو عمليات مالية مفتوحة تخص العملاء. تُعالج الالتزامات أولًا،
                    ثم يمكن جدولة الحذف مع مهلة تسمح بإلغاء الطلب.
                  </p>
                </div>
              </div>
            </section>

            <section id="updates" className="ely-privacy__section">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="11" />
                <div>
                  <h2>تحديثات السياسة</h2>
                  <p>
                    قد نحدّث هذه السياسة عند تغيير طريقة تشغيل الخدمة أو إضافة
                    وظائف جديدة أو عند الحاجة إلى توضيح الممارسات المتعلقة بالبيانات.
                    سننشر النسخة المحدّثة في هذه الصفحة مع تاريخ آخر تحديث.
                  </p>
                </div>
              </div>
            </section>

            <section id="contact" className="ely-privacy__section ely-privacy__section--contact">
              <div className="ely-privacy__section-heading">
                <SectionNumber value="12" />
                <div>
                  <h2>التواصل معنا</h2>
                  <p>
                    للاستفسارات المتعلقة بالخصوصية أو لطلبات الوصول أو التصحيح أو
                    الحذف، تواصل مع فريق إيلايا من خلال صفحة التواصل الرسمية.
                  </p>
                  <Link href="/platform/contact" className="ely-privacy__contact-link">
                    الانتقال إلى صفحة التواصل <span aria-hidden="true">←</span>
                  </Link>
                </div>
              </div>
            </section>
          </article>

          <aside className="ely-privacy__toc" aria-label="محتويات سياسة الخصوصية">
            <div className="ely-privacy__toc-inner">
              <strong>محتويات الصفحة</strong>
              <nav>
                {contents.map(([id, label], index) => (
                  <a href={`#${id}`} key={id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
