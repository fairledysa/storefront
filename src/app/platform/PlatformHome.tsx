import type { CSSProperties } from "react";

import { Icon, type IconName } from "./_components/ui/Icon";
import { PlatformButton } from "./_components/ui/PlatformUI";
import styles from "./PlatformHome.module.css";

const signals = [
  ["طلب جديد", "#5419", "store"],
  ["دفع مكتمل", "1,280 ر.س", "credit"],
  ["الشحنة في الطريق", "الرياض", "truck"],
] as const;

const moves = [
  { no: "01", title: "ابنِ واجهة تُشبه علامتك", text: "لا تبدأ من قالب بارد. اصنع متجرًا يحمل طابعك ويجعل قرار الشراء أسهل.", icon: "store" as IconName, tone: "mint" },
  { no: "02", title: "اجعل المال يتحرك بوضوح", text: "مدفوعات وتسويات وفواتير في مسار واحد، بدون أن تتحول الإدارة إلى متاهة.", icon: "credit" as IconName, tone: "sand" },
  { no: "03", title: "نفّذ الطلب قبل أن يفقد حماسه", text: "من إصدار البوليصة إلى تحديث العميل، الشحن متصل بالطلب في اللحظة الصحيحة.", icon: "truck" as IconName, tone: "blue" },
  { no: "04", title: "حوّل البيانات إلى قرار يومي", text: "راقب ما يعمل، أطلق حملات أذكى، وخذ قرارك التالي وأنت تعرف أثره.", icon: "chart" as IconName, tone: "ink" },
];

const industries = ["أزياء", "جمال", "إلكترونيات", "مأكولات", "منتجات رقمية", "منزل", "خدمات"];

const successStories = [
  {
    quote: "ما تغيّر عندنا ليس عدد الأدوات فقط؛ بل صار كل قرار في المتجر أوضح من أول طلب إلى لحظة التسليم.",
    name: "خالد الشهري",
    role: "مؤسس متجر أُفق",
    sector: "الأزياء والموضة",
    initial: "خ",
    accent: "teal",
    outcome: "تشغيل يومي أوضح",
    detail: "الطلبات، المدفوعات، والشحن في مسار واحد.",
  },
  {
    quote: "كل ما نحتاجه لإدارة متجرنا صار في واجهة واحدة سهلة وواضحة، بدون أن نفقد تفاصيل التشغيل.",
    name: "فهد المطيري",
    role: "مدير نمو تجاري",
    sector: "منتجات منزلية",
    initial: "ف",
    accent: "sand",
    outcome: "فريق أسرع في التنفيذ",
    detail: "متابعة أدق للطلبات والتحديثات اليومية.",
  },
  {
    quote: "صرنا نعرف ما الذي يحدث في المتجر لحظة بلحظة، وهذا غيّر طريقة خدمة العملاء واتخاذ القرار.",
    name: "سارة العتيبي",
    role: "مؤسسة علامة نُور",
    sector: "الجمال والعناية",
    initial: "س",
    accent: "mint",
    outcome: "تجربة عميل أكثر سلاسة",
    detail: "رسائل أوضح وتفاصيل طلب لا تضيع.",
  },
];

function SignalRail() {
  return (
    <div className={styles.signalRail}>
      <div className={styles.signalRail__line}><i /><i /><i /></div>
      {signals.map(([title, value, icon], index) => (
        <div className={styles.signalCard} key={title} style={{ "--signal-order": index } as CSSProperties}>
          <span className={styles.signalCard__icon}><Icon name={icon} size={18} /></span>
          <span><small>{title}</small><b>{value}</b></span>
          <i className={styles.signalCard__state} />
        </div>
      ))}
    </div>
  );
}

function HeroField() {
  return (
    <div className={styles.heroField} aria-label="عرض بصري لمنصة إيلايا">
      <div className={styles.heroField__grid} />
      <div className={styles.heroField__halo} />
      <div className={styles.heroField__caption}>ELYAIA<br /><span>COMMERCE<br />MOTION</span></div>
      <div className={styles.heroField__core}>
        <div className={styles.coreHeader}><span>مركز الحركة</span><i>● الآن</i></div>
        <div className={styles.coreTrack}><span>المنتج</span><i /><span>الطلب</span><i /><span>الدفع</span><i /><span>التسليم</span></div>
        <div className={styles.coreWave}><svg viewBox="0 0 410 95" role="img" aria-label="مسار نمو"><path d="M0 80 C42 76 52 49 86 60 S140 27 173 45 S229 70 250 37 S315 30 340 17 S382 21 410 4" /><path d="M0 95V80 C42 76 52 49 86 60 S140 27 173 45 S229 70 250 37 S315 30 340 17 S382 21 410 4V95Z" /></svg><b>+24.8%</b></div>
        <div className={styles.coreMetrics}><div><small>طلبات اليوم</small><b>1,248</b></div><div><small>قيمة المبيعات</small><b>86,300</b></div><div><small>عملاء عائدون</small><b>42%</b></div></div>
      </div>
      <div className={styles.heroField__cardA}><span>إطلاق منتج</span><strong>مجموعة الصيف</strong><small>36 منتجًا جاهزًا للنشر</small><i><Icon name="arrow" size={17} /></i></div>
      <div className={styles.heroField__cardB}><Icon name="cube" size={25} /><span>المخزون متصل<br /><b>3 تنبيهات ذكية</b></span></div>
      <div className={styles.heroField__cardC}><i>م</i><span><small>عميل جديد</small><b>مرحبًا، مريم</b></span><em>✓</em></div>
    </div>
  );
}

function StoreCanvas() {
  return (
    <div className={styles.storeCanvas}>
      <div className={styles.storeCanvas__top}><span>شروق</span><div>الرئيسية &nbsp; المتجر &nbsp; قصتنا</div><i>⌕</i></div>
      <div className={styles.storeCanvas__hero}><div><small>مجموعة موسمية</small><b>حكاية تُلبس<br />كل يوم</b><span>اكتشف الآن</span></div><aside><i /><i /><i /></aside></div>
      <div className={styles.storeCanvas__products}>{["عباية ساتان", "حقيبة ناعمة", "قطعة أساسية", "عطر يومي"].map((p, i) => <div key={p}><i className={`${styles[`productTone${i}`]}`} /><b>{p}</b><small>من {199 + i * 80} ر.س</small></div>)}</div>
      <div className={styles.storeCanvas__phone}><span>شروق</span><i /><i /><i /><b>أضف إلى السلة</b></div>
    </div>
  );
}

function ConnectorMap() {
  return (
    <div className={styles.connectorMap}>
      <div className={styles.connectorMap__lines}><i /><i /><i /><i /></div>
      <div className={`${styles.connectorNode} ${styles["connectorNode--center"]}`}><b>إيلايا</b><small>مركز المتجر</small></div>
      <div className={`${styles.connectorNode} ${styles["connectorNode--top"]}`}><Icon name="credit" size={21} /><span>المدفوعات</span></div>
      <div className={`${styles.connectorNode} ${styles["connectorNode--right"]}`}><Icon name="truck" size={21} /><span>الشحن</span></div>
      <div className={`${styles.connectorNode} ${styles["connectorNode--bottom"]}`}><Icon name="megaphone" size={21} /><span>التسويق</span></div>
      <div className={`${styles.connectorNode} ${styles["connectorNode--left"]}`}><Icon name="boxes" size={21} /><span>المخزون</span></div>
    </div>
  );
}

function FeatureVisual({ type }: { type: "payments" | "shipping" | "growth" | "customers" }) {
  if (type === "payments") return <div className={styles.paymentVisual}><span className={styles.paymentVisual__brand}>إيلايا Pay</span><div className={styles.paymentVisual__card}><small>رصيد متاح</small><b>128,580 <em>ر.س</em></b><span>•••• &nbsp; 3491</span></div><div className={styles.paymentVisual__chips}><i>mada</i><i>VISA</i><i> Pay</i></div><div className={styles.paymentVisual__line}><span>تسوية مكتملة</span><b>+ 24,700 ر.س</b></div></div>;
  if (type === "shipping") return <div className={styles.shippingVisual}><div className={styles.shippingVisual__map}><i /><i /><i /><svg viewBox="0 0 420 150"><path d="M38 116C91 28 137 130 190 67S307 50 382 34" /></svg></div><div className={styles.shippingVisual__parcel}><Icon name="cube" size={26} /><span>EL-20491<br /><b>خرجت للتسليم</b></span></div><div className={styles.shippingVisual__pin}>الرياض</div></div>;
  if (type === "growth") return <div className={styles.growthVisual}><div className={styles.growthVisual__chart}><svg viewBox="0 0 430 160"><path d="M0 135C45 128 63 117 94 120S149 80 183 91s60 35 95 9S342 54 374 60s31-24 56-43" /><path d="M0 160V135C45 128 63 117 94 120S149 80 183 91s60 35 95 9S342 54 374 60s31-24 56-43v143Z" /></svg><i>+38%</i></div><div className={styles.growthVisual__media}><span>◎</span><span>◉</span><span>◐</span><span>✦</span></div><div className={styles.growthVisual__offer}>خصم 15%<small>لعملاءك الجدد</small></div></div>;
  return <div className={styles.customerVisual}><div className={styles.customerVisual__chat}><span>مرحبًا، نحتاج مساعدة في المقاس</span><i>أكيد، دليل المقاسات موجود هنا.</i><span>تم الطلب، شكرًا ✨</span></div><div className={styles.customerVisual__score}><small>معدل الرضا</small><b>94%</b><i /><span>تجربة شراء واضحة من أول زيارة</span></div></div>;
}

export default function PlatformHome() {
  return (
    <div className={styles.home} id="start">
      <section className={styles.hero}>
        <div className={styles.heroNoise} />
        <div className="platformContainer">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}><Icon name="spark" size={15} /> التجارة، حين تصبح حركة واحدة</span>
              <h1>لا تدِر متجرًا.<br /><em>حرّك تجارة كاملة.</em></h1>
              <p>إيلايا تجمع المنتج والطلب والدفع والشحن والنمو في نظام واحد يضع كل لحظة مهمة أمامك، في وقتها الصحيح.</p>
              <div className={styles.heroActions}><PlatformButton href="#how-it-works" icon="arrow">ابدأ رحلتك</PlatformButton><PlatformButton href="#system" tone="ghost" icon="play">شاهد كيف تتحرك</PlatformButton></div>
              <div className={styles.heroProof}><div className={styles.heroProof__faces}><i>ن</i><i>س</i><i>ر</i><i>م</i></div><span><b>70,000+ تاجر يختارون مسارًا أوضح</b><small>من أول منتج حتى آخر عميل</small></span></div>
            </div>
            <HeroField />
          </div>
          <SignalRail />
        </div>
      </section>

      <section className={styles.manifesto} id="how-it-works">
        <div className="platformContainer">
          <div className={styles.manifesto__top}><span>من الفكرة إلى باب العميل</span><p>التجارة لا تحتاج عشرات الشاشات. تحتاج نظامًا يعرف أين تبدأ، وأين تنتقل بعد ذلك.</p></div>
          <div className={styles.moveGrid}>{moves.map((move) => <article className={`${styles.moveCard} ${styles[`moveCard--${move.tone}`]}`} key={move.no}><span>{move.no}</span><Icon name={move.icon} size={28} /><h2>{move.title}</h2><p>{move.text}</p><a href="#solutions">استكشف المرحلة <Icon name="arrow" size={16} /></a></article>)}</div>
        </div>
      </section>

      <section className={styles.systemSection} id="system">
        <div className="platformContainer">
          <div className={styles.systemGrid}>
            <div className={styles.systemCopy}><span className={styles.sectionLabel}>نظام واحد. أثر أوضح.</span><h2>كل أداة تعرف<br />ما الذي حدث قبلها.</h2><p>لأن المدفوعات لا يجب أن تنفصل عن الطلبات، ولأن الشحن لا يجب أن يبدأ من الصفر. إيلايا تجعل أجزاء تجارتك تتحرك معًا.</p><div className={styles.systemPoints}><span><Icon name="check" size={18} /> بيانات متصلة لحظيًا</span><span><Icon name="check" size={18} /> تشغيل أسرع للفريق</span><span><Icon name="check" size={18} /> قرارات مبنية على الواقع</span></div><PlatformButton href="#solutions" tone="light" icon="arrow">اكتشف النظام</PlatformButton></div>
            <ConnectorMap />
          </div>
        </div>
      </section>

      <section className={styles.storeSection} id="industries">
        <div className="platformContainer">
          <div className={styles.sectionHeader}><div><span className={styles.sectionLabel}>لأي فكرة تبيع</span><h2>علامتك لا يجب أن تبدو<br />كأي متجر آخر.</h2></div><p>ابنِ تجربة تعرّف الناس عليك قبل أن يقرأوا أي كلمة عنك.</p></div>
          <div className={styles.industryRail}>{industries.map((industry, index) => <a className={index === 0 ? styles.industryRail__active : ""} href="#storefront" key={industry}><i>{index + 1}</i>{industry}</a>)}</div>
          <div className={styles.storeFeature} id="storefront"><StoreCanvas /><div className={styles.storeFeature__copy}><span className={styles.sectionLabel}>حلول الأزياء والموضة</span><h3>مساحة تتعامل مع المنتج<br />وكأنه بطل القصة.</h3><p>معرض بصري نظيف، تفاصيل مرنة، وخطوات شراء تجعل العميل يرى قيمة القطعة قبل أن يضيفها للسلة.</p><ul><li><Icon name="check" size={17} /> ثيمات تعكس شخصية علامتك</li><li><Icon name="check" size={17} /> صور ومقاسات وخيارات بلا تعقيد</li><li><Icon name="check" size={17} /> تجربة جوال مصممة للشراء</li></ul><PlatformButton href="#solutions" tone="dark" icon="arrow">استكشف متاجر الأزياء</PlatformButton></div></div>
        </div>
      </section>

      <section className={styles.solutionsSection} id="solutions">
        <div className="platformContainer">
          <div className={styles.solutionsHeader}><span className={styles.sectionLabel}>تجارة تتحرك بسلاسة</span><h2>كل نقطة في مسارك<br />لها دور واضح.</h2><p>بدل أن تجمع الأدوات من أماكن مختلفة، تحصل على رحلة متصلة من البداية حتى ما بعد الطلب.</p></div>
          <div className={styles.solutionStack}>
            <article className={`${styles.solutionScene} ${styles["solutionScene--sand"]}`}><div className={styles.solutionScene__copy}><span>02 / المدفوعات</span><h3>الدفع لا ينبغي أن يوقف الحماس.</h3><p>امنح عميلك وسيلة الدفع التي يفضلها، وشاهد تسوياتك وفواتيرك تتحرك بوضوح.</p><ul><li>بوابات دفع متعددة</li><li>تسويات وفواتير منظمة</li><li>متابعة مالية من مكان واحد</li></ul><a href="#footer">تفاصيل المدفوعات <Icon name="arrow" size={17} /></a></div><FeatureVisual type="payments" /></article>
            <article className={`${styles.solutionScene} ${styles["solutionScene--mint"]}`}><FeatureVisual type="shipping" /><div className={styles.solutionScene__copy}><span>03 / الشحن والتوصيل</span><h3>كل شحنة لها نبض واضح.</h3><p>الطلب لا ينتهي عند الدفع. حوّل التنفيذ إلى تجربة دقيقة لك ولعميلك.</p><ul><li>إصدار بوليصات بسرعة</li><li>تحديثات تلقائية للعميل</li><li>حالات تنفيذ مفهومة</li></ul><a href="#footer">تفاصيل الشحن <Icon name="arrow" size={17} /></a></div></article>
            <article className={`${styles.solutionScene} ${styles["solutionScene--ink"]}`}><div className={styles.solutionScene__copy}><span>04 / التسويق والنمو</span><h3>دع الأرقام تقود الرسالة.</h3><p>اعرف من أين يأتي الطلب، وما الذي يستحق أن تعيد الاستثمار فيه.</p><ul><li>عروض وكوبونات مرنة</li><li>قراءة أوضح للأداء</li><li>حملات تبقى قريبة من العميل</li></ul><a href="#footer">تفاصيل النمو <Icon name="arrow" size={17} /></a></div><FeatureVisual type="growth" /></article>
            <article className={`${styles.solutionScene} ${styles["solutionScene--paper"]}`}><FeatureVisual type="customers" /><div className={styles.solutionScene__copy}><span>05 / تجربة العميل</span><h3>العميل يتذكر السهولة.</h3><p>من أول زيارة إلى متابعة الطلب، اجعل كل لحظة مطمئنة وسريعة ومفهومة.</p><ul><li>رحلة شراء واضحة</li><li>تواصل أكثر قربًا</li><li>عودة أعلى للمتجر</li></ul><a href="#footer">تفاصيل تجربة العميل <Icon name="arrow" size={17} /></a></div></article>
          </div>
        </div>
      </section>

      <section className={styles.toolboxSection}>
        <div className="platformContainer"><div className={styles.toolboxGrid}><article><span><Icon name="plus" size={24} /></span><h3>أضف قدرات جديدة حين تحتاجها.</h3><p>تطبيقات وتكاملات تغطي ما يكمل رحلة متجرك، بلا بناء من الصفر.</p><a href="#footer">استكشف متجر التطبيقات <Icon name="arrow" size={16} /></a></article><article><span><Icon name="people" size={24} /></span><h3>خدمات تُشغل الفكرة معك.</h3><p>خبراء في التصميم والتسويق والتشغيل يساعدونك عندما تريد التقدم أسرع.</p><a href="#footer">اكتشف خدمات التاجر <Icon name="arrow" size={16} /></a></article></div></div>
      </section>

      <section className={styles.enterpriseSection} id="enterprise"><div className="platformContainer"><div className={styles.enterpriseFrame}><div className={styles.enterpriseFrame__orbit} /><div className={styles.enterpriseFrame__copy}><span className={styles.sectionLabel}>إيلايا للأعمال</span><h2>حين يكبر حجم التجارة،<br />يكبر معها النظام.</h2><p>حلول مرنة للتشغيل المتقدم، فرق العمل، الفروع، والتكاملات التي لا تقبل أنصاف الحلول.</p><PlatformButton href="#footer" tone="gold" icon="arrow">اكتشف حلول الأعمال</PlatformButton></div><div className={styles.enterpriseFrame__metrics}><div><Icon name="layers" size={25} /><b>تشغيل متصل</b><span>للفروع والفرق</span></div><div><Icon name="shield" size={25} /><b>تحكم أعمق</b><span>في الصلاحيات</span></div><div><Icon name="bolt" size={25} /><b>قرارات أسرع</b><span>من واقع أعمالك</span></div></div></div></div></section>

      <section className={styles.storiesSection} id="stories">
        <div className="platformContainer">
          <div className={styles.storiesIntro}>
            <div className={styles.storiesIntro__title}>
              <span className={styles.sectionLabel}>قصص واقعية</span>
              <h2>كن صاحب قصة<br /><em>النجاح القادمة.</em></h2>
            </div>
            <p>كل متجر يبدأ بفكرة، لكن القصة تصبح أقوى عندما تكون تفاصيل التشغيل والنمو تحت السيطرة.</p>
            <a className={styles.storiesIntro__link} href="/success-stories">
              جميع قصص النجاح <Icon name="arrow" size={17} />
            </a>
          </div>

          <div className={styles.storiesLayout}>
            <article className={styles.storyFeature}>
              <div className={styles.storyFeature__copy}>
                <div className={styles.storyFeature__meta}>
                  <span><i /> قصة من {successStories[0].sector}</span>
                  <small>01 / 03</small>
                </div>
                <Icon className={styles.storyFeature__quoteIcon} name="quote" size={40} />
                <p>“{successStories[0].quote}”</p>
                <div className={styles.storyFeature__author}>
                  <span className={`${styles.storyAvatar} ${styles["storyAvatar--teal"]}`}>{successStories[0].initial}</span>
                  <div><b>{successStories[0].name}</b><small>{successStories[0].role}</small></div>
                </div>
              </div>

              <div className={styles.storyFeature__visual} aria-hidden="true">
                <div className={styles.storyFeature__rings} />
                <div className={styles.storyFeature__profile}>
                  <span>{successStories[0].initial}</span>
                  <i />
                  <small>متجر أُفق</small>
                </div>
                <div className={styles.storyFeature__result}>
                  <Icon name="chart" size={19} />
                  <span><small>النتيجة</small><b>{successStories[0].outcome}</b></span>
                </div>
                <div className={styles.storyFeature__note}>
                  <Icon name="check" size={16} />
                  <span>{successStories[0].detail}</span>
                </div>
                <div className={styles.storyFeature__timeline}><i /><i /><i /><i /></div>
              </div>
            </article>

            <div className={styles.storyStack}>
              {successStories.slice(1).map((story, index) => (
                <article className={`${styles.storyMini} ${styles[`storyMini--${story.accent}`]}`} key={story.name}>
                  <div className={styles.storyMini__top}>
                    <span className={styles.storyMini__sector}>{story.sector}</span>
                    <Icon name="quote" size={27} />
                  </div>
                  <p>“{story.quote}”</p>
                  <div className={styles.storyMini__bottom}>
                    <div className={styles.storyMini__author}>
                      <span className={`${styles.storyAvatar} ${styles[`storyAvatar--${story.accent}`]}`}>{story.initial}</span>
                      <span><b>{story.name}</b><small>{story.role}</small></span>
                    </div>
                    <em>0{index + 2}</em>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.storiesFoot}>
            <span><Icon name="people" size={19} /> تجارب من تجار في قطاعات مختلفة</span>
            <div><i /> أزياء وموضة <i /> منتجات منزلية <i /> جمال وعناية</div>
          </div>
        </div>
      </section>

      <section className={styles.finalSection}><div className="platformContainer"><div className={styles.finalFrame}><span>الخطوة التالية لا تحتاج تعقيدًا</span><h2>ابدأ تجارتك من المكان الصحيح.</h2><p>متجر واحد، مسار واحد، وقرارات أوضح في كل يوم.</p><div><PlatformButton href="#start" icon="arrow">أنشئ متجرك الآن</PlatformButton><PlatformButton href="#system" tone="ghost">استكشف إيلايا</PlatformButton></div><i className={styles.finalFrame__shapeA} /><i className={styles.finalFrame__shapeB} /></div></div></section>
    </div>
  );
}
