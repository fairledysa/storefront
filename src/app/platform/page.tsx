import Image from "next/image";
import Link from "next/link";

import phoneSummerBanner from "./_assets/phone-summer-banner.png";

type IconName = "store" | "bag" | "chart" | "puzzle" | "spark" | "palette" | "card" | "truck" | "megaphone" | "apps" | "heart" | "dress" | "beauty" | "tech" | "home" | "food" | "baby";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const path: Record<IconName, React.ReactNode> = {
    store: <><path d="M4 10h16v10H4z"/><path d="M3 10l2-6h14l2 6"/><path d="M8 20v-5h8v5"/></>,
    bag: <><path d="M5 8h14l-1 12H6z"/><path d="M8 8V6a4 4 0 018 0v2"/></>,
    chart: <><path d="M4 20V4"/><path d="M4 20h16"/><path d="M7 15l4-4 3 2 5-7"/></>,
    puzzle: <><path d="M8 4h4a2 2 0 014 0v2a2 2 0 004 0v4h-2a2 2 0 000 4h2v4h-5a2 2 0 00-4 0H8v-4a2 2 0 00-4 0H2v-4h2a2 2 0 000-4H2V4h2a2 2 0 004 0z"/></>,
    spark: <><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17z"/></>,
    palette: <><path d="M12 3a9 9 0 100 18h1.5a2 2 0 001.9-2.6l-.5-1.6a2 2 0 012.4-2.5A9 9 0 0012 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="8" r="1"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>,
    truck: <><path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    megaphone: <><path d="M3 13h4l9 4V5L7 9H3z"/><path d="M7 13l1.5 6H11l-1-6"/><path d="M19 9a4 4 0 010 4"/></>,
    apps: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    heart: <path d="M12 20s-8-4.6-8-10a4.5 4.5 0 018-2.7A4.5 4.5 0 0120 10c0 5.4-8 10-8 10z"/>,
    dress: <><path d="M9 3h6l1 4 3 3-2 3-3-1v8H10v-8l-3 1-2-3 3-3z"/></>,
    beauty: <><path d="M8 3h8l1 5-3 2v10H10V10L7 8z"/><path d="M10 14h4"/></>,
    tech: <><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M9 20h6M12 16v4"/></>,
    home: <><path d="M3 11l9-8 9 8v9H3z"/><path d="M9 20v-6h6v6"/></>,
    food: <><path d="M7 3v8M4 3v5a3 3 0 006 0V3M7 11v10"/><path d="M16 3v18M16 3c3 1 4 4 4 7h-4"/></>,
    baby: <><circle cx="12" cy="8" r="3"/><path d="M6 21c0-4 2.5-7 6-7s6 3 6 7"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path[name]}</svg>;
}

function Check() { return <span className="ely-check">✓</span>; }

function Dashboard() {
  const orderRows = [["#5419","الجديد","2,680 ر.س","عالية"],["#5418","بانتظار الدفع","3,594 ر.س","حمد"],["#5417","تم الشحن","2,955 ر.س","معتصم"]];
  const products = [["حقيبة جلدية","199"],["حذاء يومي","129"],["جاكيت شتوي","250"]];
  return (
    <div className="ely-dashboard-wrap">
      <div className="ely-dots" />
      <div className="ely-dashboard">
        <aside className="ely-dashboard__rail"><b>E</b><span className="active">⌂</span><span>◫</span><span>♧</span><span>⌁</span><span>◌</span><span>⌘</span></aside>
        <div className="ely-dashboard__inner">
          <header className="ely-dash-header"><div><b>مرحبًا، أحمد</b><small>هذا ملخص متجرك اليوم</small></div><button>اليوم⌄</button></header>
          <div className="ely-kpis"><article><small>إجمالي المبيعات</small><b>248,339 <em>ر.س</em></b><span>↗ +12.5% عن أمس</span></article><article><small>الطلبات</small><b>692</b><span>↗ +8.3% عن أمس</span></article><article><small>الزيارات</small><b>16,543</b><span>↗ +15.6% عن أمس</span></article><article><small>معدل التحويل</small><b>2.8%</b><span>↗ +0.6% عن أمس</span></article></div>
          <div className="ely-dashboard__mid"><article className="ely-sales-card"><div className="ely-card-head"><b>المبيعات</b><small>الشهور</small></div><svg viewBox="0 0 440 175" preserveAspectRatio="none"><defs><linearGradient id="elyArea" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#63cdb4" stopOpacity=".45"/><stop offset="1" stopColor="#63cdb4" stopOpacity="0"/></linearGradient></defs><path className="grid" d="M0 20H440M0 60H440M0 100H440M0 140H440"/><path className="area" d="M0 137C23 123 36 116 56 121C84 129 94 87 120 96C145 105 154 73 180 83C208 93 219 50 246 60C274 70 290 36 320 45C350 54 365 18 440 12V175H0Z"/><path className="line" d="M0 137C23 123 36 116 56 121C84 129 94 87 120 96C145 105 154 73 180 83C208 93 219 50 246 60C274 70 290 36 320 45C350 54 365 18 440 12"/><circle cx="320" cy="45" r="4"/><g transform="translate(274 20)"><rect width="78" height="26" rx="7"/><text x="39" y="18" textAnchor="middle">24,830 ر.س</text></g></svg></article>
            <article className="ely-channel-card"><b>قنوات المبيعات</b><div className="ely-donut"><span>72%</span></div><small><i/> المتجر الإلكتروني <strong>72%</strong></small><small><i/> التسويق المباشر <strong>18%</strong></small><small><i/> محركات البحث <strong>10%</strong></small></article></div>
          <div className="ely-dashboard__bottom"><article className="ely-order-card"><div className="ely-card-head"><b>الطلبات الأخيرة</b><small>عرض الكل</small></div>{orderRows.map(([id,status,amount,name])=><div className="ely-order" key={id}><span>{id}</span><strong>{amount}</strong><em className={status === "الجديد" ? "is-new" : ""}>{status}</em><b>{name}</b></div>)}</article><article className="ely-product-card"><div className="ely-card-head"><b>منتجاتك الأكثر مبيعًا</b><small>عرض الكل</small></div>{products.map(([name,price], index)=><div className="ely-product" key={name}><i className={`ely-product-swatch swatch-${index}`}/><b>{name}</b><span>{price} ر.س</span></div>)}</article></div>
        </div>
      </div>
      <div className="ely-phone">
        <div className="ely-phone__notch"/><header><span>☰</span><b>متجرك</b><span>◉</span></header><section className="ely-phone__banner" aria-label="تشكيلة صيف 2024"><Image src={phoneSummerBanner} alt="تشكيلة صيف 2024" priority sizes="172px" /></section><h4>الأقسام</h4><div className="ely-phone__cats"><span>نساء</span><span>رجال</span><span>أطفال</span><span>إكسسوارات</span></div><h4>الأكثر مبيعًا</h4><div className="ely-phone__products"><article><i className="p-a"/><b>فستان ناعم</b><small>239 ر.س</small></article><article><i className="p-b"/><b>حقيبة كتف</b><small>199 ر.س</small></article></div><footer><span>⌂</span><span>▦</span><span>♧</span><span>⌁</span></footer>
      </div>
      <div className="ely-ready-note"><span>✓</span><div><b>متجرك جاهز للعمل</b><small>تم ربط المدفوعات والشحن</small></div></div>
    </div>
  );
}

const statItems: {number:string; label:string; icon:IconName}[] = [
  {number:"+70,000",label:"متجر نشط",icon:"store"},{number:"50 مليون",label:"طلب تم تنفيذه",icon:"bag"},{number:"+50 مليار ر.س",label:"إجمالي المبيعات",icon:"chart"},{number:"+500",label:"خدمة وتكامل",icon:"puzzle"}
];

const sectors: {title:string; icon:IconName; active?:boolean}[] = [
  {title:"الأزياء والموضة",icon:"dress",active:true},{title:"الأطفال والألعاب",icon:"baby"},{title:"الأطعمة والمشروبات",icon:"food"},{title:"المنزل والمطبخ",icon:"home"},{title:"الإلكترونيات",icon:"tech"},{title:"الجمال والعناية",icon:"beauty"},{title:"المزيد من القطاعات",icon:"apps"}
];

const steps = [
  {num:"01",eyebrow:"تصميم المتجر",title:"متجر يلفت النظر من أول لمحة",copy:"ابنِ تجربة شراء تشبه علامتك، من الصفحة الرئيسية وحتى تفاصيل المنتج والدفع.",items:["قوالب مرنة سهلة التخصيص","صفحات جاهزة لبناء الثقة","تجربة جوال محسّنة"], visual:"design"},
  {num:"02",eyebrow:"المدفوعات",title:"مدفوعات آمنة لتجارة أكثر ثقة",copy:"امنح عملاءك خيارات دفع مرنة وتابع عملياتك المالية وفواتيرك بوضوح.",items:["بوابات دفع متعددة","تقارير مالية دقيقة","فواتير واستردادات منظمة"], visual:"payment"},
  {num:"03",eyebrow:"الشحن والتوصيل",title:"كل شحنة تحت عينك",copy:"من إصدار البوليصة إلى التتبع والتسليم، اجعل تنفيذ طلباتك أسرع وأكثر وضوحًا.",items:["مزوّدون متعددون للشحن","تتبع تلقائي للعملاء","إدارة حالات التنفيذ"], visual:"shipping"},
  {num:"04",eyebrow:"أدوات التسويق",title:"سوّق بذكاء، واعرف ما الذي ينجح",copy:"حوّل الزيارات إلى فرص مبيعات باستخدام العروض والكوبونات والحملات المتكاملة.",items:["كوبونات وعروض خاصة","تقارير مبنية على أرقام","سلات متروكة وحملات"], visual:"marketing"},
  {num:"05",eyebrow:"التطبيقات والتكاملات",title:"أضف ما تحتاجه عندما تتوسع",copy:"طوّر قدرات متجرك عبر تطبيقات وخدمات متصلة تدعم المرحلة التالية من نمو أعمالك.",items:["تطبيقات جاهزة للتشغيل","حلول لكل نشاط","تكاملات مرنة"], visual:"apps"},
  {num:"06",eyebrow:"تجربة العميل",title:"تجربة شراء تجعل العميل يعود",copy:"اجعل رحلة العميل من اكتشاف المنتج حتى استلامه سلسة، واضحة وسريعة.",items:["إشعارات واضحة","دعم بعد الشراء","تتبع مباشر للطلب"], visual:"customer"}
];

function Visual({ type }: { type:string }) {
  if (type === "design") {
    return (
      <div className="ely-step-visual is-design" aria-label="معاينة أداة تصميم متجر إيلايا">
        <div className="ely-builder-studio">
          <header className="ely-builder-studio__topbar">
            <div className="ely-builder-studio__brand">
              <span className="ely-builder-studio__dot" />
              <b>مجموعة ناعمة</b>
              <small>تم الحفظ الآن</small>
            </div>
            <button type="button">نشر المتجر</button>
          </header>

          <div className="ely-builder-studio__body">
            <div className="ely-builder-studio__preview">
              <div className="ely-builder-studio__nav">
                <b>مجموعة ناعمة</b>
                <span>الرئيسية</span>
                <span>المتجر</span>
                <span>قصتنا</span>
                <i>♡</i>
              </div>

              <div className="ely-builder-studio__hero">
                <div>
                  <small>مجموعة الموسم</small>
                  <b>هويتك كما<br />تحب أن تظهر</b>
                  <em>اكتشف المزيد <span>←</span></em>
                </div>
                <span className="ely-builder-studio__shape ely-builder-studio__shape--one" />
                <span className="ely-builder-studio__shape ely-builder-studio__shape--two" />
              </div>

              <div className="ely-builder-studio__products">
                {['عباية ديم', 'فستان ناعم', 'حقيبة جلد'].map((product, index) => (
                  <article key={product}>
                    <i className={`ely-builder-studio__product-art ely-builder-studio__product-art--${index + 1}`} />
                    <b>{product}</b>
                    <small>{[404, 369, 289][index]} ر.س</small>
                  </article>
                ))}
              </div>
            </div>

            <aside className="ely-builder-studio__panel">
              <div className="ely-builder-studio__panel-head">
                <b>ترتيب الصفحة</b>
                <span>⋮</span>
              </div>
              <div className="ely-builder-studio__layer is-active"><i>▣</i><span>صورة رئيسية</span><em>⋮⋮</em></div>
              <div className="ely-builder-studio__layer"><i>▦</i><span>منتجات مميزة</span><em>⋮⋮</em></div>
              <div className="ely-builder-studio__layer"><i>◫</i><span>قصة العلامة</span><em>⋮⋮</em></div>
              <div className="ely-builder-studio__add">＋ إضافة قسم</div>
            </aside>
          </div>
        </div>

        <div className="ely-builder-studio__palette" aria-hidden="true">
          <small>ألوان الهوية</small>
          <span><i /><i /><i /><i /></span>
        </div>
      </div>
    );
  }

  if (type === "payment") {
    return (
      <div className="ely-step-visual is-payment" aria-label="معاينة إدارة المدفوعات في إيلايا">
        <div className="ely-pay-stage">
          <header className="ely-pay-stage__header">
            <div><b>إدارة المدفوعات</b><small>ملخص اليوم</small></div>
            <span><i /> مباشر</span>
          </header>

          <div className="ely-pay-stage__main">
            <article className="ely-pay-stage__card">
              <div className="ely-pay-stage__card-head"><span>ELYAIA PAY</span><i>◒</i></div>
              <small>الرصيد المتاح</small>
              <b>24,840 <em>ر.س</em></b>
              <footer><span>•••• 1204</span><span>12/28</span></footer>
            </article>

            <article className="ely-pay-stage__receipt">
              <span className="ely-pay-stage__receipt-check">✓</span>
              <div><small>دفعة جديدة</small><b>2,480 ر.س</b><em>تمت بنجاح الآن</em></div>
            </article>
          </div>

          <footer className="ely-pay-stage__methods">
            <b>وسائل الدفع</b>
            <span className="is-mada">mada</span>
            <span className="is-visa">VISA</span>
            <span className="is-master">mastercard</span>
            <span className="is-apple">◐ Pay</span>
          </footer>
        </div>
      </div>
    );
  }

  if (type === "shipping") return <div className="ely-step-visual is-shipping"><div className="ely-map"><i/><i/><i/><em>الرياض</em><em>جدة</em><em>الدمام</em></div><div className="ely-ship-track"><b>الشحنة في الطريق</b><small>EL-41028</small><span>✓ تم استلام الطلب</span><span>✓ في مركز الفرز</span><span>◌ جاري التوصيل</span></div></div>;
  if (type === "marketing") return <div className="ely-step-visual is-marketing"><div className="ely-conversion"><small>معدل التحويل</small><b>2.8%</b><em>↗ 24%</em><div>{[1,2,3,4,5].map(i=><i key={i} style={{height:`${12+i*11}px`}}/>)}</div></div><div className="ely-coupon"><b>خصم 15%</b><span>لعُملائك المميزين</span><small>عرض نشط</small></div><div className="ely-social"><i>in</i><i>●</i><i>𝕏</i><i>◌</i></div></div>;
  if (type === "apps") return <div className="ely-step-visual is-apps"><div className="ely-orbit"><b>+</b><i>س</i><i>م</i><i>د</i><i>ت</i><i>ر</i></div><div className="ely-app-label"><Icon name="apps" size={23}/><span><b>تطبيقات متجرك</b><small>كل ما تحتاجه للنمو</small></span></div></div>;
  if (type === "customer") return <div className="ely-step-visual is-customer"><div className="ely-mini-phone"><header>تتبع طلبك</header><b>#EL-5419</b><span>✓ تم استلام الطلب</span><span>✓ تم الشحن</span><span className="current">● قيد التوصيل</span></div><div className="ely-chat"><b>مرحبًا يا سارة 👋</b><span>طلبك في الطريق، وسنخبرك فور وصوله.</span><small>منذ دقيقة</small></div></div>;
  return null;
}

function FashionShowcase() {
  const fashionProducts = [
    { name: "عباية ديم", price: "404", tone: "abaya" },
    { name: "فستان ناعم", price: "369", tone: "dress" },
    { name: "حقيبة جلد", price: "289", tone: "bag" },
    { name: "حذاء كلاسيكي", price: "239", tone: "shoe" },
  ] as const;

  return (
    <section className="ely-fashion-v3" aria-labelledby="fashion-title">
      <div className="ely-fashion-v3__heading">
        <div>
          <span className="ely-fashion-v3__eyebrow">قطاعات تناسب كل فكرة</span>
          <h2>حلول تجارة مصممة لطبيعة نشاطك</h2>
        </div>
        <p>ابدأ بواجهة تناسب علامتك اليوم، ثم وسّع التجربة مع نمو متجرك.</p>
      </div>

      <div className="ely-fashion-v3__tabs" role="tablist" aria-label="قطاعات إيلايا">
        {sectors.map((sector) => (
          <button
            type="button"
            role="tab"
            aria-selected={Boolean(sector.active)}
            className={sector.active ? "is-active" : ""}
            key={sector.title}
          >
            <span className="ely-fashion-v3__tab-icon"><Icon name={sector.icon} size={18} /></span>
            <span>{sector.title}</span>
          </button>
        ))}
      </div>

      <div className="ely-fashion-v3__body">
        <div className="ely-fashion-v3__copy">
          <span className="ely-fashion-v3__label">
            <Icon name="dress" size={16} /> حلول الأزياء والموضة
          </span>
          <h3 id="fashion-title">حل متكامل لمتاجر<br />الأزياء والموضة</h3>
          <p>
            صمّم متجرًا يعكس هوية علامتك، واعرض منتجاتك وتفاصيلها في تجربة تسوق
            سهلة وواضحة تجعل العميل أقرب إلى قرار الشراء.
          </p>
          <ul>
            <li><Check />معارض صور وفيديوهات احترافية</li>
            <li><Check />خيارات ومقاسات سهلة وواضحة</li>
            <li><Check />عروض وخصومات تنمّي مبيعاتك</li>
            <li><Check />تنبيهات ذكية لإدارة المخزون</li>
          </ul>
          <Link href="/platform/industries/fashion" className="ely-fashion-v3__cta">
            استكشف حلول الأزياء <span>←</span>
          </Link>
          <div className="ely-fashion-v3__note">
            <span><Icon name="heart" size={16} /></span>
            <p><b>كل تفصيلة محسوبة</b> من أول عرض المنتج حتى إتمام الطلب.</p>
          </div>
        </div>

        <div className="ely-fashion-v3__visual" aria-label="معاينة متجر أزياء من إيلايا">
          <div className="ely-fashion-v3__glow ely-fashion-v3__glow--one" />
          <div className="ely-fashion-v3__glow ely-fashion-v3__glow--two" />
          <div className="ely-fashion-v3__browser">
            <header className="ely-fashion-v3__browser-head">
              <div className="ely-fashion-v3__browser-brand"><span>EL</span> مجموعة إيلايا</div>
              <nav><span>الرئيسية</span><span>المتجر</span><span>قصتنا</span></nav>
              <div className="ely-fashion-v3__browser-tools"><i /><i /><i /></div>
            </header>

            <div className="ely-fashion-v3__store-hero">
              <div className="ely-fashion-v3__store-copy">
                <small>مجموعة صيفية</small>
                <b>إطلالة تشبه<br />حضورك</b>
                <span>اكتشف المجموعة <em>←</em></span>
              </div>
              <div className="ely-fashion-v3__model" aria-hidden="true">
                <i className="ely-fashion-v3__model-head" />
                <i className="ely-fashion-v3__model-body" />
                <i className="ely-fashion-v3__model-shadow" />
              </div>
              <div className="ely-fashion-v3__hero-badge">New<br /><strong>2026</strong></div>
            </div>

            <div className="ely-fashion-v3__product-grid">
              {fashionProducts.map((product) => (
                <article key={product.name}>
                  <div className={`ely-fashion-v3__product-art ely-fashion-v3__product-art--${product.tone}`}>
                    <i />
                  </div>
                  <b>{product.name}</b>
                  <small>{product.price} ر.س</small>
                </article>
              ))}
            </div>
          </div>

          <div className="ely-fashion-v3__phone" aria-hidden="true">
            <div className="ely-fashion-v3__phone-notch" />
            <header><span>☰</span><b>متجرك</b><span>♡</span></header>
            <div className="ely-fashion-v3__phone-poster"><small>مجموعة إيلايا</small><b>قطعك<br />الأقرب لك</b><i /></div>
            <div className="ely-fashion-v3__phone-product"><div className="ely-fashion-v3__phone-art" /><b>عباية ناعمة</b><small>399 ر.س</small></div>
            <button type="button">أضف للسلة</button>
            <footer><span>⌂</span><span>▦</span><span>♡</span><span>⌁</span></footer>
          </div>

          <div className="ely-fashion-v3__floating-tag">
            <span><Icon name="spark" size={16} /></span>
            <div><b>تجربة تناسب علامتك</b><small>ثيم مرن وتفاصيل جاهزة</small></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats(){return <section className="ely-stats-section"><div className="ely-shell ely-stats">{statItems.map(stat=><article key={stat.label}><span><Icon name={stat.icon}/></span><div><b>{stat.number}</b><small>{stat.label}</small></div></article>)}</div></section>}
function Partners(){const names=["THE BODY SHOP","العربية للعود","MANUEL","بن زقر binzagr","LAVERNE","GOLDEN SCENT","kingsmen","درعة DERAAH","النخبة للعود","FLOWARD"]; return <section className="ely-partners"><h2>شركاء النجاح</h2><div className="ely-partners__row">{names.map(n=><span key={n}>{n}</span>)}</div></section>}
function Stories() {
  return (
    <section className="ely-success-v4" id="success-stories">
      <div className="ely-shell">
        <header className="ely-success-v4__head">
          <span className="ely-kicker">قصص نجاح حقيقية</span>
          <h2>كن صاحب قصة النجاح القادمة</h2>
          <p>من أول طلب إلى علامة يثق بها العملاء، كل رحلة كبيرة تبدأ بخطوة واضحة وأدوات تعمل معك.</p>
        </header>

        <div className="ely-success-v4__grid">
          <article className="ely-success-v4__feature">
            <div className="ely-success-v4__feature-art" aria-hidden="true">
              <span className="ely-success-v4__ring ely-success-v4__ring--one" />
              <span className="ely-success-v4__ring ely-success-v4__ring--two" />
              <div className="ely-success-v4__monogram">خ</div>
              <div className="ely-success-v4__growth"><b>+184%</b><span>نمو المبيعات</span></div>
              <div className="ely-success-v4__mark">عِطر<small>ARTR</small></div>
            </div>

            <div className="ely-success-v4__feature-copy">
              <span className="ely-success-v4__tag">متجر عِطر للعطور</span>
              <span className="ely-success-v4__quote">“</span>
              <p>مع إيلايا صارت إدارة المتجر أبسط، وصار عندنا وقت أكبر نهتم بالمنتج والعميل ونكبر بثقة.</p>
              <footer>
                <span className="ely-success-v4__avatar">خ</span>
                <span><b>خالد الشهري</b><small>مؤسس متجر عِطر</small></span>
                <strong>4.9/5<em>رضا العملاء</em></strong>
              </footer>
            </div>
          </article>

          <article className="ely-success-v4__card">
            <div className="ely-success-v4__card-top">
              <span className="ely-success-v4__index">01</span>
              <span className="ely-success-v4__quote">“</span>
            </div>
            <p>اختصرنا وقت التشغيل وفتحنا لنا مساحة أكبر لبناء تجربة أجمل لعملائنا.</p>
            <div className="ely-success-v4__mini-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <footer>
              <span className="ely-success-v4__avatar is-mint">ف</span>
              <span><b>فهد المطيري</b><small>مؤسس علامة أزياء</small></span>
              <strong>+92%<em>زيادة الطلبات</em></strong>
            </footer>
          </article>

          <article className="ely-success-v4__card ely-success-v4__card--sand">
            <div className="ely-success-v4__card-top">
              <span className="ely-success-v4__index">02</span>
              <span className="ely-success-v4__quote">“</span>
            </div>
            <p>من إدارة المنتجات إلى متابعة الطلبات، صار كل شيء أوضح وأسهل بعد الشراء.</p>
            <div className="ely-success-v4__score" aria-hidden="true"><b>4.9</b><span>★★★★★</span><small>تقييم العملاء</small></div>
            <footer>
              <span className="ely-success-v4__avatar is-gold">س</span>
              <span><b>سارة العتيبي</b><small>مؤسسة متجر إلكتروني</small></span>
              <strong>4.9/5<em>رضا العملاء</em></strong>
            </footer>
          </article>
        </div>

        <div className="ely-success-v4__actions">
          <Link href="/platform/success-stories" className="ely-success-v4__link">استكشف قصص النجاح <span>←</span></Link>
          <div className="ely-success-v4__dots" aria-hidden="true"><i className="is-active" /><i /><i /></div>
        </div>
      </div>
    </section>
  );
}


function GrowthShowcase() {
  return (
    <section className="ely-growth-v2" aria-labelledby="growth-title">
      <div className="ely-shell">
        <header className="ely-growth-v2__head">
          <span className="ely-growth-v2__eyebrow">
            <Icon name="spark" size={16} />
            نمو على مقاس طموحك
          </span>
          <h2 id="growth-title">
            خدمات وتطبيقات إضافية
            <em> لنمو متجرك</em>
          </h2>
          <p>
            وسّع قدرات متجرك في الوقت الذي تحتاجه، من تطبيقات جاهزة إلى خبرات
            متخصصة وحلول أعمال متقدمة.
          </p>
        </header>

        <div className="ely-growth-v2__duo">
          <article className="ely-growth-v2__card ely-growth-v2__card--apps">
            <div className="ely-growth-v2__copy">
              <span className="ely-growth-v2__label">
                <span className="ely-growth-v2__label-icon">
                  <Icon name="apps" size={18} />
                </span>
                متجر التطبيقات
              </span>

              <h3>أدوات تزيد قدرتك على البيع</h3>
              <p>
                تطبيقات جاهزة تساعدك على التسويق والشحن وخدمة العملاء وتمنح متجرك
                مساحة أكبر للنمو.
              </p>

              <div className="ely-growth-v2__micro-points">
                <span><i /> تشغيل سريع</span>
                <span><i /> تكاملات موثوقة</span>
              </div>

              <Link href="/platform/apps" className="ely-growth-v2__link">
                استعرض التطبيقات <span>←</span>
              </Link>
            </div>

            <div className="ely-growth-v2__apps-visual" aria-hidden="true">
              <div className="ely-growth-v2__apps-orbit">
                <span className="ely-growth-v2__apps-core">متجرك</span>
                <span className="ely-growth-v2__apps-ring" />
                <span className="ely-growth-v2__app-tile ely-growth-v2__app-tile--one">
                  <Icon name="megaphone" size={18} />
                </span>
                <span className="ely-growth-v2__app-tile ely-growth-v2__app-tile--two">
                  <Icon name="truck" size={18} />
                </span>
                <span className="ely-growth-v2__app-tile ely-growth-v2__app-tile--three">
                  <Icon name="chart" size={18} />
                </span>
                <span className="ely-growth-v2__app-tile ely-growth-v2__app-tile--four">
                  <Icon name="heart" size={18} />
                </span>
              </div>
              <div className="ely-growth-v2__apps-note">
                <b>+50 تطبيق</b>
                <small>أضف ما تحتاجه للنمو</small>
              </div>
              <div className="ely-growth-v2__apps-strip">
                <span>تسويق</span>
                <span>شحن</span>
                <span>خدمة العملاء</span>
              </div>
            </div>
          </article>

          <article className="ely-growth-v2__card ely-growth-v2__card--services">
            <div className="ely-growth-v2__copy">
              <span className="ely-growth-v2__label">
                <span className="ely-growth-v2__label-icon">
                  <Icon name="spark" size={18} />
                </span>
                خدمات التاجر
              </span>

              <h3>خبرات تدعم أعمالك</h3>
              <p>
                خدمات مختارة للتصميم والتسويق والتشغيل حين تحتاجها، من مزودين
                موثوقين يفهمون احتياج متجرك.
              </p>

              <div className="ely-growth-v2__micro-points">
                <span><i /> خبرات متخصصة</span>
                <span><i /> مزودون موثوقون</span>
              </div>

              <Link href="/platform/services" className="ely-growth-v2__link">
                اكتشف الخدمات <span>←</span>
              </Link>
            </div>

            <div className="ely-growth-v2__services-visual" aria-hidden="true">
              <div className="ely-growth-v2__services-caption">
                <span>خدمات مختارة</span>
                <b>+1,000 خدمة</b>
              </div>

              <div className="ely-growth-v2__service-list">
                <span>
                  <i><Icon name="palette" size={17} /></i>
                  <b>تصميم وهوية</b>
                  <small>متاجر تليق بعلامتك</small>
                </span>
                <span>
                  <i><Icon name="megaphone" size={17} /></i>
                  <b>تسويق ونمو</b>
                  <small>حملات تصل لعملائك</small>
                </span>
                <span>
                  <i><Icon name="chart" size={17} /></i>
                  <b>تشغيل وتحسين</b>
                  <small>قرارات أذكى كل يوم</small>
                </span>
              </div>

              <div className="ely-growth-v2__services-badge">
                <span className="ely-growth-v2__services-badge-check">✓</span>
                مزودون موثوقون
              </div>
            </div>
          </article>
        </div>

        <article className="ely-growth-v2__enterprise">
          <div className="ely-growth-v2__enterprise-copy">
            <span className="ely-growth-v2__enterprise-eyebrow">
              <Icon name="store" size={17} />
              حلول كبار التجار
            </span>
            <h3>أعمال أكبر تحتاج نظامًا أذكى</h3>
            <p>
              حلول مرنة تدعم المتاجر والمنشآت الكبيرة بإدارة متقدمة وتكاملات عملية
              وفريق يواكب نمو أعمالك.
            </p>
            <Link href="/platform/enterprise" className="ely-growth-v2__enterprise-link">
              اكتشف حلول الأعمال الكبرى <span>←</span>
            </Link>
          </div>

          <div className="ely-growth-v2__enterprise-visual" aria-hidden="true">
            <div className="ely-growth-v2__enterprise-chart">
              <span className="ely-growth-v2__enterprise-chart-line" />
              <i className="ely-growth-v2__enterprise-chart-dot ely-growth-v2__enterprise-chart-dot--one" />
              <i className="ely-growth-v2__enterprise-chart-dot ely-growth-v2__enterprise-chart-dot--two" />
              <i className="ely-growth-v2__enterprise-chart-dot ely-growth-v2__enterprise-chart-dot--three" />
              <b>نمو متصل</b>
            </div>

            <div className="ely-growth-v2__enterprise-metrics">
              <span>
                <i><Icon name="apps" size={17} /></i>
                <b>تكاملات ERP</b>
                <small>مرنة وعملية</small>
              </span>
              <span>
                <i><Icon name="chart" size={17} /></i>
                <b>تقارير متقدمة</b>
                <small>رؤية أوضح</small>
              </span>
              <span>
                <i><Icon name="heart" size={17} /></i>
                <b>مدير نجاح</b>
                <small>دعم مخصص</small>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}


export default function PlatformHome(){return <>
 <section className="ely-hero"><div className="ely-hero__shape one"/><div className="ely-hero__shape two"/><div className="ely-hero__rays"/><div className="ely-shell ely-hero__inner"><div className="ely-hero__visual"><Dashboard/></div><div className="ely-hero__copy"><span className="ely-badge">◆ منصة تجارة إلكترونية متكاملة</span><div className="ely-logo-bubbles"><i>THE BODY SHOP</i><i>MANUEL</i><i>بن زقر</i><i>LAVERNE</i><i>FLOWARD</i><i>+10K متجر</i></div><h1>إيلايا..<br/> <strong>تجارتك تبدأ</strong><br/><em>أسهل وأسرع</em></h1><p>كل ما تحتاجه لإطلاق وإدارة متجرك الإلكتروني في مكان واحد.<br/>من التصميم وحتى الشحن والتسويق والدفع.</p><div className="ely-hero__actions"><Link href="/platform/pricing" className="ely-button ely-button--primary">ابدأ متجرك مجانًا <span>←</span></Link><a href="#platform" className="ely-button ely-button--outline">اكتشف المنصة <span>▷</span></a></div><div className="ely-hero__checks"><span><Check/>بطاقة ائتمان</span><span><Check/>إلغاء في أي وقت</span><span><Check/>14 يوم تجربة مجانية</span></div><div className="ely-hero__proof"><div><i>أ</i><i>ف</i><i>س</i><i>م</i></div><span><b>+70,000 تاجر يثقون بإيلايا</b><small>4.9/5 <em>★★★★★</em> تقييم التجربة</small></span></div></div></div></section>
 <Stats/><Partners/>
 <section className="ely-industries" id="platform"><div className="ely-shell"><FashionShowcase/></div></section>
 <section className="ely-solutions"><div className="ely-shell"><header className="ely-section-head"><span className="ely-kicker">حلول متكاملة</span><h2>حلول تدعمك في كل خطوة</h2><p>ابدأ من الفكرة واستمر بالنمو مع أدوات متصلة تضع إدارة متجرك في مكان واحد.</p></header>{steps.map((step,index)=><article className={`ely-step ely-step--${step.visual} ${index%2 ? "reverse" : ""}`} data-step={step.num} key={step.num}><div className="ely-step__copy"><span className="ely-step__num">{step.num}</span><small>{step.eyebrow}</small><h3>{step.title}</h3><p>{step.copy}</p><ul>{step.items.map(x=><li key={x}><Check/>{x}</li>)}</ul><Link href={`/platform/solutions/${["store-builder","payments","shipping","marketing","apps-integrations","customer-experience"][index]}`} className="ely-text-link">اكتشف المزيد <span>←</span></Link></div><Visual type={step.visual}/></article>)}</div></section>
 <GrowthShowcase/>
 <Stories/>
 <section className="ely-final"><div className="ely-shell"><div><span className="ely-kicker">ابدأ اليوم</span><h2>ابدأ رحلتك الآن، وأنشئ متجرك مجانًا</h2><p>كل الأدوات التي تحتاجها للبيع والنمو في مكان واحد.</p></div><Link href="/platform/pricing" className="ely-button ely-button--primary">ابدأ متجرك مجانًا <span>←</span></Link></div></section>
 </>}
