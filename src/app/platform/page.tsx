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
  const orderRows = [["طلب جديد","قيد المعالجة","—",""],["طلب قيد المتابعة","بانتظار الدفع","—",""],["طلب مكتمل","تم الشحن","—",""]];
  const products = [["منتج مميز",""],["منتج مميز",""],["منتج مميز",""]];
  return (
    <div className="ely-dashboard-wrap">
      <div className="ely-dots" />
      <div className="ely-dashboard">
        <aside className="ely-dashboard__rail"><b>E</b><span className="active">⌂</span><span>◫</span><span>♧</span><span>⌁</span><span>◌</span><span>⌘</span></aside>
        <div className="ely-dashboard__inner">
          <header className="ely-dash-header"><div><b>مرحبًا، أحمد</b><small>هذا ملخص متجرك اليوم</small></div><button>اليوم⌄</button></header>
          <div className="ely-kpis"><article><small>إجمالي المبيعات</small><b>عرض مباشر</b><span>تابع أداء متجرك</span></article><article><small>الطلبات</small><b>إدارة واضحة</b><span>من الطلب إلى الشحن</span></article><article><small>الزيارات</small><b>رؤية أوسع</b><span>افهم نشاط متجرك</span></article><article><small>التقارير</small><b>قرارات أوضح</b><span>بيانات تساعدك على النمو</span></article></div>
          <div className="ely-dashboard__mid"><article className="ely-sales-card"><div className="ely-card-head"><b>المبيعات</b><small>الشهور</small></div><svg viewBox="0 0 440 175" preserveAspectRatio="none"><defs><linearGradient id="elyArea" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#63cdb4" stopOpacity=".45"/><stop offset="1" stopColor="#63cdb4" stopOpacity="0"/></linearGradient></defs><path className="grid" d="M0 20H440M0 60H440M0 100H440M0 140H440"/><path className="area" d="M0 137C23 123 36 116 56 121C84 129 94 87 120 96C145 105 154 73 180 83C208 93 219 50 246 60C274 70 290 36 320 45C350 54 365 18 440 12V175H0Z"/><path className="line" d="M0 137C23 123 36 116 56 121C84 129 94 87 120 96C145 105 154 73 180 83C208 93 219 50 246 60C274 70 290 36 320 45C350 54 365 18 440 12"/><circle cx="320" cy="45" r="4"/><g transform="translate(274 20)"><rect width="78" height="26" rx="7"/><text x="39" y="18" textAnchor="middle">متابعة الأداء</text></g></svg></article>
            <article className="ely-channel-card"><b>قنوات المبيعات</b><div className="ely-donut"><span>عرض</span></div><small><i/> المتجر الإلكتروني <strong>متابعة</strong></small><small><i/> التسويق المباشر <strong>إدارة</strong></small><small><i/> مصادر الزيارة <strong>رؤية</strong></small></article></div>
          <div className="ely-dashboard__bottom"><article className="ely-order-card"><div className="ely-card-head"><b>الطلبات الأخيرة</b><small>عرض الكل</small></div>{orderRows.map(([id,status,amount,name])=><div className="ely-order" key={id}><span>{id}</span><strong>{amount}</strong><em className={status === "الجديد" ? "is-new" : ""}>{status}</em><b>{name}</b></div>)}</article><article className="ely-product-card"><div className="ely-card-head"><b>منتجاتك الأكثر مبيعًا</b><small>عرض الكل</small></div>{products.map(([name,price], index)=><div className="ely-product" key={`product-${index}`}><i className={`ely-product-swatch swatch-${index}`}/><b>{name}</b><span>{price} ر.س</span></div>)}</article></div>
        </div>
      </div>
      <div className="ely-phone">
        <div className="ely-phone__notch"/><header><span>☰</span><b>متجرك</b><span>◉</span></header><section className="ely-phone__banner" aria-label="عرض توضيحي للمتجر"><Image src={phoneSummerBanner} alt="عرض توضيحي للمتجر" priority sizes="172px" /></section><h4>الأقسام</h4><div className="ely-phone__cats"><span>نساء</span><span>رجال</span><span>أطفال</span><span>إكسسوارات</span></div><h4>الأكثر مبيعًا</h4><div className="ely-phone__products"><article><i className="p-a"/><b>فستان ناعم</b><small>تفاصيل المنتج</small></article><article><i className="p-b"/><b>حقيبة كتف</b><small>تفاصيل المنتج</small></article></div><footer><span>⌂</span><span>▦</span><span>♧</span><span>⌁</span></footer>
      </div>
      <div className="ely-ready-note"><span>✓</span><div><b>متجرك جاهز للعمل</b><small>تم ربط المدفوعات والشحن</small></div></div>
    </div>
  );
}

const statItems: {number:string; label:string; icon:IconName}[] = [
  {number:"متجر متكامل",label:"لبدء البيع وإدارة التشغيل",icon:"store"},{number:"طلبات منظّمة",label:"لمتابعة كل مرحلة",icon:"bag"},{number:"تقارير واضحة",label:"لفهم أداء المتجر",icon:"chart"},{number:"تكاملات عملية",label:"لتوسيع قدرات متجرك",icon:"puzzle"}
];

const sectors: {title:string; icon:IconName; active?:boolean}[] = [
  {title:"الأزياء والموضة",icon:"dress",active:true},{title:"الأطفال والألعاب",icon:"baby"},{title:"الأطعمة والمشروبات",icon:"food"},{title:"المنزل والمطبخ",icon:"home"},{title:"الإلكترونيات",icon:"tech"},{title:"الجمال والعناية",icon:"beauty"},{title:"المزيد من القطاعات",icon:"apps"}
];

const commerceCapabilities: { icon: IconName; number: string; title: string; copy: string; href: string; label: string }[] = [
  {
    icon: "palette",
    number: "01",
    label: "واجهة المتجر",
    title: "متجر يعكس علامتك بوضوح",
    copy: "أنشئ صفحات ومنتجات وتجربة شراء متسقة تساعد العميل على الوصول لما يريد بسهولة.",
    href: "/platform/solutions/store-builder",
  },
  {
    icon: "bag",
    number: "02",
    label: "التشغيل اليومي",
    title: "إدارة أبسط للطلبات والمنتجات",
    copy: "تابع الطلبات والمنتجات والعملاء من مكان واحد، بخطوات واضحة لفريق متجرك.",
    href: "/platform/solutions/customer-experience",
  },
  {
    icon: "card",
    number: "03",
    label: "الدفع والتنفيذ",
    title: "دفع وشحن ضمن سير عمل واحد",
    copy: "نظّم الدفع والفواتير والتنفيذ والمتابعة حتى تعرف حالة كل طلب دون تشتيت.",
    href: "/platform/solutions/payments",
  },
  {
    icon: "chart",
    number: "04",
    label: "النمو",
    title: "قرارات أدق مع رؤية أوضح",
    copy: "استخدم العروض والتقارير والتكاملات العملية لتطوير متجرك وفق ما يحتاجه عملك.",
    href: "/platform/solutions/marketing",
  },
];

function CommerceCapabilities() {
  return (
    <section className="ely-capabilities" aria-labelledby="capabilities-title">
      <div className="ely-shell">
        <div className="ely-capabilities__intro">
          <div>
            <span className="ely-kicker">قدرات مترابطة</span>
            <h2 id="capabilities-title">تجارة منظمة من أول خطوة إلى ما بعد الطلب</h2>
          </div>
          <p>
            إيلايا تجمع الأدوات الأساسية التي يحتاجها التاجر في تجربة واحدة واضحة،
            لتبقى إدارة المتجر أسهل مع كل مرحلة من مراحل العمل.
          </p>
        </div>

        <div className="ely-capabilities__grid">
          {commerceCapabilities.map((capability) => (
            <article className="ely-capability" key={capability.number}>
              <div className="ely-capability__top">
                <span className="ely-capability__icon"><Icon name={capability.icon} size={22} /></span>
                <span className="ely-capability__number">{capability.number}</span>
              </div>
              <small>{capability.label}</small>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
              <Link href={capability.href} className="ely-capability__link">
                اكتشف المزيد <span>←</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FashionShowcase() {
  const fashionProducts = [
    { name: "عباية ديم", price: "", tone: "abaya" },
    { name: "فستان ناعم", price: "", tone: "dress" },
    { name: "حقيبة جلد", price: "", tone: "bag" },
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
                  <small>تفاصيل المنتج</small>
                </article>
              ))}
            </div>
          </div>

          <div className="ely-fashion-v3__phone" aria-hidden="true">
            <div className="ely-fashion-v3__phone-notch" />
            <header><span>☰</span><b>متجرك</b><span>♡</span></header>
            <div className="ely-fashion-v3__phone-poster"><small>مجموعة إيلايا</small><b>قطعك<br />الأقرب لك</b><i /></div>
            <div className="ely-fashion-v3__phone-product"><div className="ely-fashion-v3__phone-art" /><b>عباية ناعمة</b><small>تفاصيل المنتج</small></div>
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
function Partners(){const capabilities=["تصميم المتجر","إدارة المنتجات","المدفوعات","الشحن والتوصيل","التسويق","التقارير","التطبيقات والتكاملات"]; return <section className="ely-partners"><h2>أدوات متصلة لإدارة تجارتك</h2><div className="ely-partners__row">{capabilities.map(capability=><span key={capability}>{capability}</span>)}</div></section>}
function Stories() {
  return (
    <section className="ely-success-v4" id="success-stories">
      <div className="ely-shell">
        <header className="ely-success-v4__head">
          <span className="ely-kicker">معك في رحلة النمو</span>
          <h2>ابدأ خطوتك القادمة بثقة</h2>
          <p>من أول منتج إلى متابعة الطلبات، تساعدك إيلايا على تنظيم تفاصيل تجارتك في مكان واحد.</p>
        </header>

        <div className="ely-success-v4__grid">
          <article className="ely-success-v4__feature">
            <div className="ely-success-v4__feature-art" aria-hidden="true">
              <span className="ely-success-v4__ring ely-success-v4__ring--one" />
              <span className="ely-success-v4__ring ely-success-v4__ring--two" />
              <div className="ely-success-v4__monogram">خ</div>
              <div className="ely-success-v4__growth"><b>نمو أوضح</b><span>أدوات متصلة</span></div>
              <div className="ely-success-v4__mark">إيلايا<small>COMMERCE</small></div>
            </div>

            <div className="ely-success-v4__feature-copy">
              <span className="ely-success-v4__tag">تجربة إدارة متكاملة</span>
              <span className="ely-success-v4__quote">“</span>
              <p>واجهة واحدة تساعدك على متابعة المنتجات والطلبات والمدفوعات والشحن بصورة أوضح.</p>
              <footer>
                <span className="ely-success-v4__avatar">إ</span>
                <span><b>إيلايا للتجارة الإلكترونية</b><small>أدوات لإدارة المتجر</small></span>
                <strong>متابعة<em>أوضح للتشغيل</em></strong>
              </footer>
            </div>
          </article>

          <article className="ely-success-v4__card">
            <div className="ely-success-v4__card-top">
              <span className="ely-success-v4__index">01</span>
              <span className="ely-success-v4__quote">“</span>
            </div>
            <p>رتّب مهام متجرك اليومية من مكان واحد، وامنح فريقك صورة أوضح لكل طلب.</p>
            <div className="ely-success-v4__mini-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <footer>
              <span className="ely-success-v4__avatar is-mint">إ</span>
              <span><b>إدارة التشغيل</b><small>متابعة يومية مرنة</small></span>
              <strong>تنظيم<em>للخطوات الأساسية</em></strong>
            </footer>
          </article>

          <article className="ely-success-v4__card ely-success-v4__card--sand">
            <div className="ely-success-v4__card-top">
              <span className="ely-success-v4__index">02</span>
              <span className="ely-success-v4__quote">“</span>
            </div>
            <p>خصّص طريقة عرض منتجاتك، وتابع حالة الطلبات، وقرّب تفاصيل المتجر لفريقك.</p>
            <div className="ely-success-v4__score" aria-hidden="true"><b>✓</b><span>أدوات متصلة</span><small>لتجربة أوضح</small></div>
            <footer>
              <span className="ely-success-v4__avatar is-gold">إ</span>
              <span><b>تجربة العميل</b><small>رحلة شراء منظمة</small></span>
              <strong>وضوح<em>في كل مرحلة</em></strong>
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
                <b>تطبيقات وتكاملات</b>
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
                <b>خدمات متكاملة</b>
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
 <section className="ely-hero"><div className="ely-hero__shape one"/><div className="ely-hero__shape two"/><div className="ely-hero__rays"/><div className="ely-shell ely-hero__inner"><div className="ely-hero__visual"><Dashboard/></div><div className="ely-hero__copy"><span className="ely-badge">◆ منصة تجارة إلكترونية متكاملة</span><div className="ely-logo-bubbles"><i>تصميم المتجر</i><i>إدارة المنتجات</i><i>المدفوعات</i><i>الشحن</i><i>التسويق</i><i>تكاملات عملية</i></div><h1>إيلايا..<br/> <strong>تجارتك تبدأ</strong><br/><em>أسهل وأسرع</em></h1><p>كل ما تحتاجه لإطلاق وإدارة متجرك الإلكتروني في مكان واحد.<br/>من التصميم وحتى الشحن والتسويق والدفع.</p><div className="ely-hero__actions"><Link href="https://e.elyaia.com/register" className="ely-button ely-button--primary">ابدأ متجرك مجانًا <span>←</span></Link><a href="#platform" className="ely-button ely-button--outline">اكتشف المنصة <span>▷</span></a></div><div className="ely-hero__checks"><span><Check/>إدارة من مكان واحد</span><span><Check/>حلول مترابطة</span><span><Check/>تجربة مصممة للتاجر</span></div><div className="ely-hero__proof"><div><i>إ</i><i>د</i><i>ا</i><i>ر</i></div><span><b>أدوات تساعدك على إدارة تجارتك</b><small>من أول منتج إلى آخر طلب</small></span></div></div></div></section>
 <Stats/><Partners/>
 <section className="ely-industries" id="platform"><div className="ely-shell"><FashionShowcase/></div></section>
 <CommerceCapabilities/>
 <GrowthShowcase/>
 <Stories/>
 <section className="ely-final"><div className="ely-shell"><div><span className="ely-kicker">ابدأ اليوم</span><h2>ابدأ رحلتك الآن، وأنشئ متجرك مجانًا</h2><p>كل الأدوات التي تحتاجها للبيع والنمو في مكان واحد.</p></div><Link href="https://e.elyaia.com/register" className="ely-button ely-button--primary">ابدأ متجرك مجانًا <span>←</span></Link></div></section>
 </>}
