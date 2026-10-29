// Build-time SEO pages: one static, crawlable HTML page per UI language
// (/, /ru/, /he/, /ar/), generated from dist/index.html by the plugin in
// vite.config.ts. Each page carries its own <html lang/dir>, title, description,
// canonical, hreflang set, Open Graph/Twitter tags and JSON-LD, plus a short
// intro and pronunciation guides for Ы and Ain inside #app — main.ts replaces
// that markup with the live app on boot, so crawlers and no-JS readers get
// real text while users get the trainer.
//
// Not imported by the app bundle; only by vite.config.ts (and tests).

import { LANGS, dirOf, translate, type Lang } from "./i18n";

export const SITE = "https://yaplikacija.lipu.dev";
export const OG_IMAGE = `${SITE}/og-image.png`;
const REPO = "https://github.com/komapc/yaplikacija";

/** Public path of a language page. */
export const pathOf = (l: Lang): string => (l === "en" ? "/" : `/${l}/`);

const LANG_NAME: Record<Lang, string> = { en: "English", ru: "Русский", he: "עברית", ar: "العربية" };
const OG_LOCALE: Record<Lang, string> = { en: "en_US", ru: "ru_RU", he: "he_IL", ar: "ar_AR" };

interface Guide {
  h2: string;
  lead: string;
  howH3: string;
  how: string[];
  wordsH3: string;
  words: string;
  mistakesH3: string;
  mistakes: string[];
}

interface PageText {
  title: string;
  description: string;
  h1: string;
  intro: string[];
  yery: Omit<Guide, "how"> & { how: string[] };
  ain: Guide;
  langsLabel: string;
  privacy: string;
  source: string;
  noscript: string;
}

// The first tip of each guide is the app's own hint (yery.hint / ain.hint),
// prepended in render() so the page and the trainer say the same thing.
const TEXT: Record<Lang, PageText> = {
  en: {
    title: "Yaplikacija — Russian Ы & Arabic/Hebrew Ain trainer",
    description:
      "Learn to pronounce Russian Ы [ɨ] and Arabic/Hebrew Ain [ʕ]: record your voice, see your vowel on a formant chart and practise with games. Free, no account.",
    h1: "Аппликация Ы — pronunciation trainer for the Russian Ы and the Arabic/Hebrew Ain",
    intro: [
      `<b>Аппликация Ы</b> (Yaplikacija) is a free pronunciation trainer for two sounds that learners find hard:
      the Russian vowel <b>Ы</b> <span class="ipa">[ɨ]</span> and the Arabic/Hebrew consonant
      <b>Ain</b> ع / ע <span class="ipa">[ʕ]</span>. Hold the button, say the sound, and the app measures the
      first two formants of your voice (F1 and F2) and shows on a vowel chart how close you are to the target zone.`,
      `Everything runs on your device: no recording is sent to a server and there is no account. Besides the
      sound drill there is a word mode with native-speaker references (мы, ты, сыр…) and three short games —
      Target, Duel and Word rain. The Ы trainer is live; the Ain trainer is still being tuned, so for now Ain is
      covered by the guide below.`,
    ],
    yery: {
      h2: "Pronouncing the Russian Ы [ɨ]",
      lead: `Ы is a close central unrounded vowel: the tongue is as high as for «и» <span class="ipa">[i]</span>
      but pulled back toward the middle of the mouth, and the lips stay spread, not rounded. In Russian it
      follows only hard (non-palatalized) consonants, which is why it almost never starts a word.`,
      howH3: "Tongue and lips",
      how: [
        `Start from a long «и» <span class="ipa">[i]</span> and slowly slide the tongue back without moving the
        lips: the sound turns into Ы before it reaches «у» <span class="ipa">[u]</span>.`,
        `Or start from «у» <span class="ipa">[u]</span> and spread the lips into a slight smile, keeping the tongue where it is.`,
        "Keep the tip of the tongue low, behind the lower teeth; the body of the tongue does the work.",
        `Keep the consonant before Ы hard: in <i>был</i> the б is plain, in <i>бил</i> it is soft <span class="ipa">[bʲ]</span>.`,
      ],
      wordsH3: "Example words",
      words: `<i>мы</i> (we), <i>ты</i> (you), <i>сын</i> (son), <i>сыр</i> (cheese), <i>дым</i> (smoke),
      <i>рыба</i> (fish), <i>мыло</i> (soap). Minimal pairs with «и»: <i>был – бил</i> (was – beat),
      <i>мыл – мил</i> (washed – sweet), <i>выл – вил</i> (howled – twisted).`,
      mistakesH3: "Common mistakes",
      mistakes: [
        `Saying «и» <span class="ipa">[i]</span>: the tongue is too far forward, and <i>был</i> turns into <i>бил</i>.`,
        `Rounding the lips, which pushes the vowel toward «у» <span class="ipa">[u]</span>.`,
        `Using the English vowel of <i>bit</i> <span class="ipa">[ɪ]</span>: too open and too far forward.`,
        "Softening the consonant before Ы, so that <i>сыр</i> starts to sound like <i>сир</i>.",
      ],
    },
    ain: {
      h2: "Pronouncing Ain ع / ע [ʕ]",
      lead: `Ain is a voiced pharyngeal consonant: the root of the tongue is pulled back toward the back wall of the
      throat, narrowing the pharynx, while the vocal folds keep vibrating. It is the voiced partner of Arabic ح
      <span class="ipa">[ħ]</span> (also Hebrew ח in Mizrahi pronunciation). In Arabic it is a full consonant;
      in Modern Hebrew most speakers pronounce ע as a glottal stop <span class="ipa">[ʔ]</span> or drop it,
      while many Mizrahi speakers keep the pharyngeal <span class="ipa">[ʕ]</span>.`,
      howH3: "Throat and voice",
      how: [
        `Start with a breathy ح <span class="ipa">[ħ]</span> from deep in the throat, as if fogging up glasses,
        then add voice without changing anything else — that is <span class="ipa">[ʕ]</span>.`,
        `Say a long <span class="ipa">[a]</span> and squeeze the throat in the middle of it: the tension is felt
        low in the neck, just above the Adam's apple, not at the soft palate.`,
        "Keep the tip of the tongue low and the mouth open; vowels next to Ain sound darker and more open.",
      ],
      wordsH3: "Example words",
      words: `Arabic: <span lang="ar">عين</span> <i>ʿayn</i> (eye), <span lang="ar">عربي</span> <i>ʿarabī</i>
      (Arabic), <span lang="ar">سعيد</span> <i>saʿīd</i> (happy), <span lang="ar">سمع</span> <i>samiʿa</i>
      (he heard). Hebrew: <span lang="he">עין</span> <i>ʿáyin</i> (eye), <span lang="he">עשר</span>
      <i>ʿéser</i> (ten), <span lang="he">שמע</span> <i>shmaʿ</i> (hear!), <span lang="he">יעקב</span>
      <i>Yaʿakov</i> (Jacob).`,
      mistakesH3: "Common mistakes",
      mistakes: [
        `A glottal stop <span class="ipa">[ʔ]</span> (like أ / א): the closure is at the vocal folds rather than a
        narrowing of the throat, and the voice breaks off.`,
        `A voiceless <span class="ipa">[ħ]</span> (ح): the place in the throat is right, but the voice is missing.`,
        `A uvular or velar sound <span class="ipa">[ʁ, ɣ]</span> (غ, Hebrew ר): the narrowing is too high, made
        with the back of the tongue at the soft palate or uvula instead of with the tongue root.`,
        "Squeezing so hard that the sound turns creaky or stops completely: Ain is usually a narrowing, not a full closure.",
      ],
    },
    langsLabel: "Languages",
    privacy: "Privacy policy",
    source: "Source code",
    noscript: "The interactive trainer needs JavaScript and a microphone.",
  },

  ru: {
    title: "Аппликация Ы — тренажёр звуков Ы и Айн (ع / ע)",
    description:
      "Тренажёр произношения русского Ы [ɨ] и арабского/ивритского Айна [ʕ]: запиши голос, увидь гласный на диаграмме формант, играй. Бесплатно, без регистрации.",
    h1: "Аппликация Ы — тренажёр произношения русского Ы и арабского/ивритского Айна",
    intro: [
      `<b>Аппликация Ы</b> (Yaplikacija) — бесплатный тренажёр произношения двух звуков, которые трудно даются
      ученикам: русского гласного <b>Ы</b> <span class="ipa">[ɨ]</span> и арабского/ивритского согласного
      <b>Айн</b> ع / ע <span class="ipa">[ʕ]</span>. Зажми кнопку, произнеси звук — приложение измерит первые две
      форманты твоего голоса (F1 и F2) и покажет на диаграмме гласных, насколько ты близко к целевой зоне.`,
      `Всё работает на твоём устройстве: запись никуда не отправляется, аккаунт не нужен. Кроме упражнения со
      звуком есть режим слов с эталонным произношением носителя (мы, ты, сыр…) и три короткие игры — «Мишень»,
      «Дуэль» и «Дождь слов». Тренажёр Ы уже работает; тренажёр Айна ещё настраивается, поэтому пока для Айна
      есть руководство ниже.`,
    ],
    yery: {
      h2: "Произношение русского Ы [ɨ]",
      lead: `Ы — верхний (закрытый) гласный среднего ряда, без округления губ: язык поднят так же высоко, как для
      «и» <span class="ipa">[i]</span>, но сдвинут назад, к середине рта, а губы растянуты. В русском Ы стоит
      только после твёрдых согласных, поэтому почти никогда не начинает слово.`,
      howH3: "Язык и губы",
      how: [
        `Начни с долгого «и» <span class="ipa">[i]</span> и медленно сдвигай язык назад, не двигая губами: звук
        превратится в Ы раньше, чем дойдёт до «у» <span class="ipa">[u]</span>.`,
        `Или начни с «у» <span class="ipa">[u]</span> и растяни губы в лёгкую улыбку, оставив язык на месте.`,
        "Кончик языка держи внизу, за нижними зубами; работает спинка языка.",
        `Согласный перед Ы должен быть твёрдым: в слове <i>был</i> звук б твёрдый, в <i>бил</i> — мягкий <span class="ipa">[bʲ]</span>.`,
      ],
      wordsH3: "Примеры слов",
      words: `<i>мы</i>, <i>ты</i>, <i>сын</i>, <i>сыр</i>, <i>дым</i>, <i>рыба</i>, <i>мыло</i>. Минимальные пары
      с «и»: <i>был – бил</i>, <i>мыл – мил</i>, <i>выл – вил</i>.`,
      mistakesH3: "Типичные ошибки",
      mistakes: [
        `Вместо Ы получается «и» <span class="ipa">[i]</span>: язык слишком впереди, и <i>был</i> превращается в <i>бил</i>.`,
        `Губы округляются, и гласный уходит к «у» <span class="ipa">[u]</span>.`,
        `Подмена английским гласным из <i>bit</i> <span class="ipa">[ɪ]</span>: он слишком открытый и слишком передний.`,
        "Смягчение согласного перед Ы: <i>сыр</i> начинает звучать как <i>сир</i>.",
      ],
    },
    ain: {
      h2: "Произношение Айна ع / ע [ʕ]",
      lead: `Айн — звонкий глоточный (фарингальный) согласный: корень языка оттягивается к задней стенке глотки и
      сужает её, а голосовые связки продолжают колебаться. Это звонкая пара к арабскому ح
      <span class="ipa">[ħ]</span> (и к ивритскому ח в восточном произношении). В арабском это полноценный
      согласный; в современном иврите большинство говорящих произносит ע как гортанную смычку
      <span class="ipa">[ʔ]</span> или опускает его, но многие выходцы из восточных общин сохраняют глоточный
      <span class="ipa">[ʕ]</span>.`,
      howH3: "Горло и голос",
      how: [
        `Начни с придыхательного ح <span class="ipa">[ħ]</span> глубоко в горле, как будто дышишь на очки, затем
        добавь голос, ничего больше не меняя, — это и есть <span class="ipa">[ʕ]</span>.`,
        `Протяни долгое <span class="ipa">[a]</span> и сожми горло посередине звука: напряжение ощущается низко в
        шее, прямо над кадыком, а не у мягкого нёба.`,
        "Кончик языка внизу, рот открыт; гласные рядом с Айном звучат темнее и открытее.",
      ],
      wordsH3: "Примеры слов",
      words: `Арабский: <span lang="ar">عين</span> <i>ʿayn</i> (глаз), <span lang="ar">عربي</span> <i>ʿarabī</i>
      (арабский), <span lang="ar">سعيد</span> <i>saʿīd</i> (счастливый), <span lang="ar">سمع</span> <i>samiʿa</i>
      (он услышал). Иврит: <span lang="he">עין</span> <i>ʿáyin</i> (глаз), <span lang="he">עשר</span>
      <i>ʿéser</i> (десять), <span lang="he">שמע</span> <i>shmaʿ</i> (слушай!), <span lang="he">יעקב</span>
      <i>Yaʿakov</i> (Яков).`,
      mistakesH3: "Типичные ошибки",
      mistakes: [
        `Гортанная смычка <span class="ipa">[ʔ]</span> (как أ / א): смыкаются голосовые связки, а не сужается
        глотка, и голос прерывается.`,
        `Глухой <span class="ipa">[ħ]</span> (ح): место в горле правильное, но нет голоса.`,
        `Увулярный или велярный звук <span class="ipa">[ʁ, ɣ]</span> (غ, ивритская ר): сужение слишком высоко —
        задней частью языка у мягкого нёба или язычка, а не корнем языка.`,
        "Слишком сильное сжатие: звук становится скрипучим или полностью обрывается. Айн — обычно сужение, а не полная смычка.",
      ],
    },
    langsLabel: "Языки",
    privacy: "Политика конфиденциальности",
    source: "Исходный код",
    noscript: "Для интерактивного тренажёра нужны JavaScript и микрофон.",
  },

  he: {
    title: "עפליקציה ע — אימון הגייה של ע [ʕ] ושל Ы הרוסית",
    description:
      "אימון הגייה של ע גרונית [ʕ] ושל התנועה הרוסית Ы [ɨ]: מקליטים את הקול, רואים את התנועה על תרשים פורמנטים ומתאמנים במשחקים קצרים. חינם, בלי הרשמה.",
    h1: "עפליקציה ע — אימון הגייה של Ы הרוסית ושל ע / ع [ʕ]",
    intro: [
      `<b>עפליקציה ע</b> (Yaplikacija) היא מאמן הגייה חינמי לשני צלילים שקשים ללומדים: התנועה הרוסית
      <b>Ы</b> <span class="ipa">[ɨ]</span> והעיצור <b>ע / ع</b> <span class="ipa">[ʕ]</span> של העברית והערבית.
      לוחצים על הכפתור ומחזיקים, הוגים את הצליל, והאפליקציה מודדת את שני הפורמנטים הראשונים של הקול
      (F1 ו־F2) ומראה על תרשים התנועות כמה קרוב הצליל לאזור היעד.`,
      `הכול רץ על המכשיר שלכם: שום הקלטה לא נשלחת לשרת ואין צורך בחשבון. מלבד תרגול הצליל יש מצב מילים עם
      הגייה של דובר ילידי (мы, ты, сыр…) ושלושה משחקים קצרים — מטרה, דו־קרב וגשם מילים. מאמן ה־Ы כבר פעיל;
      מאמן העי״ן עדיין בכיוונון, ולכן בינתיים העי״ן מוסברת במדריך שלמטה.`,
    ],
    yery: {
      h2: "הגיית Ы הרוסית [ɨ]",
      lead: `Ы היא תנועה סגורה, מרכזית ולא מעוגלת: הלשון גבוהה כמו ב־«и» <span class="ipa">[i]</span>
      (כמו ב״אִי״), אבל נסוגה לאחור אל מרכז הפה, והשפתיים נשארות מתוחות ולא מעוגלות. ברוסית היא באה רק אחרי
      עיצורים קשים (לא מרוככים), ולכן כמעט אף פעם לא פותחת מילה.`,
      howH3: "לשון ושפתיים",
      how: [
        `התחילו מ־«и» <span class="ipa">[i]</span> ארוכה והזיזו לאט את הלשון לאחור בלי להזיז את השפתיים: הצליל
        יהפוך ל־Ы עוד לפני שיגיע ל־«у» <span class="ipa">[u]</span>.`,
        `או התחילו מ־«у» <span class="ipa">[u]</span> ומתחו את השפתיים לחיוך קל, בלי להזיז את הלשון.`,
        "השאירו את קצה הלשון למטה, מאחורי השיניים התחתונות; גב הלשון עושה את העבודה.",
        `העיצור שלפני Ы צריך להיות קשה: ב־<i>был</i> ה־б רגילה, וב־<i>бил</i> היא מרוככת <span class="ipa">[bʲ]</span>.`,
      ],
      wordsH3: "מילים לדוגמה",
      words: `<i>мы</i> (אנחנו), <i>ты</i> (אתה/את), <i>сын</i> (בן), <i>сыр</i> (גבינה), <i>дым</i> (עשן),
      <i>рыба</i> (דג), <i>мыло</i> (סבון). זוגות מינימליים עם «и»: <i>был – бил</i> (היה – היכה),
      <i>мыл – мил</i> (רחץ – חמוד), <i>выл – вил</i> (ילל – שזר).`,
      mistakesH3: "טעויות נפוצות",
      mistakes: [
        `הגייה של «и» <span class="ipa">[i]</span>: הלשון קדמית מדי, ו־<i>был</i> הופכת ל־<i>бил</i>.`,
        `עיגול השפתיים, שדוחף את התנועה לכיוון «у» <span class="ipa">[u]</span>.`,
        `החלפה בתנועה האנגלית של <i>bit</i> <span class="ipa">[ɪ]</span>: היא פתוחה וקדמית מדי.`,
        "ריכוך העיצור שלפני Ы, כך ש־<i>сыр</i> נשמעת כמו <i>сир</i>.",
      ],
    },
    ain: {
      h2: "הגיית ע / ع [ʕ]",
      lead: `ע היא עיצור לועי קולי: שורש הלשון נמשך לאחור אל הדופן האחורית של הגרון ומצר את הלוע, ומיתרי הקול
      ממשיכים לרטוט. זהו בן הזוג הקולי של ح הערבית <span class="ipa">[ħ]</span> (ושל ח בהגייה המזרחית). בערבית
      זה עיצור מלא; בעברית המודרנית רוב הדוברים הוגים ע כסגר סדקי <span class="ipa">[ʔ]</span> (כמו א) או
      משמיטים אותה, אבל דוברים מזרחיים רבים משמרים את ההגייה הלועית <span class="ipa">[ʕ]</span>.`,
      howH3: "גרון וקול",
      how: [
        `התחילו מ־ح <span class="ipa">[ħ]</span> נשופה עמוק בגרון, כמו כשמהבילים על משקפיים, והוסיפו קול בלי
        לשנות שום דבר אחר — זו <span class="ipa">[ʕ]</span>.`,
        `הגו <span class="ipa">[a]</span> ארוכה וכווצו את הגרון באמצעה: המתח מורגש נמוך בצוואר, ממש מעל פיקת
        הגרון, ולא ליד החך הרך.`,
        "קצה הלשון למטה והפה פתוח; התנועות הסמוכות לעי״ן נשמעות כהות ופתוחות יותר.",
      ],
      wordsH3: "מילים לדוגמה",
      words: `ערבית: <span lang="ar">عين</span> <i>ʿayn</i> (עין), <span lang="ar">عربي</span> <i>ʿarabī</i>
      (ערבי), <span lang="ar">سعيد</span> <i>saʿīd</i> (מאושר), <span lang="ar">سمع</span> <i>samiʿa</i>
      (שמע). עברית: עין, עשר, שמע, יעקב.`,
      mistakesH3: "טעויות נפוצות",
      mistakes: [
        `סגר סדקי <span class="ipa">[ʔ]</span> (כמו أ / א): הסגירה היא במיתרי הקול ולא היצרות של הלוע, והקול נקטע.`,
        `<span class="ipa">[ħ]</span> אטומה (ح): המקום בגרון נכון, אבל אין קול.`,
        `צליל ענבלי או וילוני <span class="ipa">[ʁ, ɣ]</span> (غ, ר עברית): ההיצרות גבוהה מדי — בגב הלשון מול
        החך הרך או הענבל, במקום בשורש הלשון.`,
        "כיווץ חזק מדי, עד שהצליל נעשה חורק או נעצר לגמרי: ע היא בדרך כלל היצרות ולא סגירה מלאה.",
      ],
    },
    langsLabel: "שפות",
    privacy: "מדיניות פרטיות",
    source: "קוד מקור",
    noscript: "המאמן האינטראקטיבי דורש JavaScript ומיקרופון.",
  },

  ar: {
    title: "Yaplikacija — تدريب على نطق Ы الروسية والعين [ʕ]",
    description:
      "تعلّم نطق الصائت الروسي Ы [ɨ] وحرف العين [ʕ] في العربية والعبرية: سجّل صوتك، وشاهد صائتك على مخطط الفورمانتات، وتدرّب بألعاب قصيرة. مجاني وبلا حساب.",
    h1: "Yaplikacija — مدرّب نطق Ы الروسية والعين ع / ע [ʕ]",
    intro: [
      `<b>Аппликация Ы</b> (Yaplikacija) مدرّب نطق مجاني لصوتين يصعبان على المتعلمين: الصائت الروسي
      <b>Ы</b> <span class="ipa">[ɨ]</span> وحرف <b>العين</b> ع / ע <span class="ipa">[ʕ]</span> في العربية والعبرية.
      اضغط على الزر مطولًا وانطق الصوت، فيقيس التطبيق أول فورمانتين في صوتك (F1 وF2) ويبيّن على مخطط
      الصوائت مدى قربك من منطقة الهدف.`,
      `كل شيء يعمل على جهازك: لا يُرسَل أي تسجيل إلى خادم ولا حاجة إلى حساب. إلى جانب تمرين الصوت هناك وضع
      الكلمات مع نطق مرجعي لمتحدث أصلي (мы، ты، сыр…) وثلاث ألعاب قصيرة — الهدف والمبارزة ومطر الكلمات.
      مدرّب Ы يعمل الآن، أما مدرّب العين فما زال قيد الضبط، لذا يغطي الدليل أدناه العين في الوقت الحالي.`,
    ],
    yery: {
      h2: "نطق حرف Ы الروسي [ɨ]",
      lead: `Ы صائت مغلق مركزي غير مدوّر: يرتفع اللسان كما في «и» <span class="ipa">[i]</span> (كالياء في «في»)،
      لكنه يتراجع نحو وسط الفم، وتبقى الشفتان منفرجتين غير مدوّرتين. في الروسية لا يأتي إلا بعد الصوامت
      القاسية (غير الملينة)، ولذلك لا يكاد يبدأ به أي كلمة.`,
      howH3: "اللسان والشفتان",
      how: [
        `ابدأ بـ«и» <span class="ipa">[i]</span> طويلة وحرّك لسانك ببطء إلى الخلف دون تحريك الشفتين: يتحوّل الصوت
        إلى Ы قبل أن يصل إلى «у» <span class="ipa">[u]</span>.`,
        `أو ابدأ بـ«у» <span class="ipa">[u]</span> وافرد شفتيك في ابتسامة خفيفة مع إبقاء اللسان في مكانه.`,
        "أبقِ طرف اللسان منخفضًا خلف الأسنان السفلى؛ ظهر اللسان هو الذي يعمل.",
        `يجب أن يكون الصامت قبل Ы قاسيًا: في <i>был</i> يكون б عاديًا، وفي <i>бил</i> يكون ملينًا <span class="ipa">[bʲ]</span>.`,
      ],
      wordsH3: "كلمات للتدريب",
      words: `<i>мы</i> (نحن)، <i>ты</i> (أنت)، <i>сын</i> (ابن)، <i>сыр</i> (جبن)، <i>дым</i> (دخان)،
      <i>рыба</i> (سمك)، <i>мыло</i> (صابون). أزواج دنيا مع «и»: <i>был – бил</i> (كان – ضرب)،
      <i>мыл – мил</i> (غسل – لطيف)، <i>выл – вил</i> (عوى – فتل).`,
      mistakesH3: "أخطاء شائعة",
      mistakes: [
        `نطق «и» <span class="ipa">[i]</span>: اللسان متقدّم أكثر من اللازم فتتحول <i>был</i> إلى <i>бил</i>.`,
        `تدوير الشفتين، مما يدفع الصائت نحو «у» <span class="ipa">[u]</span>.`,
        `استبداله بصائت الكلمة الإنجليزية <i>bit</i> <span class="ipa">[ɪ]</span>: فهو أكثر انفتاحًا وتقدّمًا من اللازم.`,
        "تليين الصامت قبل Ы، فتصبح <i>сыр</i> قريبة من <i>сир</i>.",
      ],
    },
    ain: {
      h2: "نطق العين ع / ע [ʕ]",
      lead: `العين صامت حلقي مجهور: يُسحب جذر اللسان إلى الخلف نحو الجدار الخلفي للحلق فيضيّقه، بينما تستمر
      الأوتار الصوتية في الاهتزاز، وهي النظير المجهور للحاء <span class="ipa">[ħ]</span>. في العربية هي صامت
      أصيل؛ أما في العبرية الحديثة فينطق معظم المتحدثين ע همزةً <span class="ipa">[ʔ]</span> أو يُسقطونها،
      بينما يحافظ كثير من المتحدثين الشرقيين (المزراحيين) على النطق الحلقي <span class="ipa">[ʕ]</span>. يفيد
      هذا القسم متعلّمي العربية والعبرية، ويساعد الناطقين بالعربية على ملاحظة الفرق بين العين والأصوات القريبة منها.`,
      howH3: "الحلق والصوت",
      how: [
        `ابدأ بحاء ح <span class="ipa">[ħ]</span> من عمق الحلق، كأنك تنفخ على نظارة، ثم أضف الصوت دون تغيير أي
        شيء آخر — هذه هي <span class="ipa">[ʕ]</span>.`,
        `انطق <span class="ipa">[a]</span> طويلة واضغط الحلق في وسطها: تشعر بالتوتر في أسفل العنق فوق تفاحة آدم
        مباشرة، لا عند الحنك اللين.`,
        "أبقِ طرف اللسان منخفضًا والفم مفتوحًا؛ تبدو الصوائت المجاورة للعين أعمق وأكثر انفتاحًا.",
      ],
      wordsH3: "كلمات للتدريب",
      words: `العربية: عين، عربي، سعيد، سمع. العبرية: <span lang="he">עין</span> <i>ʿáyin</i> (عين)،
      <span lang="he">עשר</span> <i>ʿéser</i> (عشرة)، <span lang="he">שמע</span> <i>shmaʿ</i> (اسمع)،
      <span lang="he">יעקב</span> <i>Yaʿakov</i> (يعقوب).`,
      mistakesH3: "أخطاء شائعة",
      mistakes: [
        `همزة <span class="ipa">[ʔ]</span> (مثل أ / א): الإغلاق عند الأوتار الصوتية لا تضييق في الحلق، وينقطع الصوت.`,
        `حاء مهموسة <span class="ipa">[ħ]</span> (ح): موضع الحلق صحيح لكن الجهر غائب.`,
        `صوت لهوي أو طبقي <span class="ipa">[ʁ، ɣ]</span> (غ، والراء العبرية ר): التضييق أعلى من اللازم، بظهر
        اللسان عند الحنك اللين أو اللهاة بدل جذر اللسان.`,
        "الضغط الزائد حتى يصبح الصوت متحشرجًا أو ينقطع تمامًا: العين في الغالب تضييق لا إغلاق تام.",
      ],
    },
    langsLabel: "اللغات",
    privacy: "سياسة الخصوصية",
    source: "الشيفرة المصدرية",
    noscript: "يحتاج المدرّب التفاعلي إلى JavaScript وميكروفون.",
  },
};

export const pageText = (l: Lang): PageText => TEXT[l];

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const list = (items: string[]): string => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

function guide(g: Guide, hint: string): string {
  return `
      <section>
        <h2>${g.h2}</h2>
        <p>${g.lead}</p>
        <h3>${g.howH3}</h3>
        ${list([hint, ...g.how])}
        <h3>${g.wordsH3}</h3>
        <p>${g.words}</p>
        <h3>${g.mistakesH3}</h3>
        ${list(g.mistakes)}
      </section>`;
}

/** <head> tags that differ per language (title through JSON-LD). */
export function renderHead(l: Lang): string {
  const p = TEXT[l];
  const url = SITE + pathOf(l);
  const alternates = LANGS.map((x) => `<link rel="alternate" hreflang="${x}" href="${SITE}${pathOf(x)}" />`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Yaplikacija",
    alternateName: "Аппликация Ы",
    url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Android",
    inLanguage: l,
    description: p.description,
    image: OG_IMAGE,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: "komapc", url: "https://github.com/komapc" },
  };
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    ...alternates,
    `<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Yaplikacija" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[l]}" />`,
    ...LANGS.filter((x) => x !== l).map((x) => `<meta property="og:locale:alternate" content="${OG_LOCALE[x]}" />`),
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Yaplikacija: Ы [ɨ] and ع / ע [ʕ] pronunciation trainer" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");
}

/** Static page content placed inside #app (replaced by the live app on boot). */
export function renderBody(l: Lang): string {
  const p = TEXT[l];
  const langLinks = LANGS.map(
    (x) =>
      `<li><a href="${pathOf(x)}" hreflang="${x}" lang="${x}"${x === l ? ' aria-current="page"' : ""}>${LANG_NAME[x]}</a></li>`,
  ).join("");
  return `
    <article class="seo-static">
      <h1>${p.h1}</h1>
      ${p.intro.map((x) => `<p>${x}</p>`).join("\n      ")}
      <noscript><p><b>${p.noscript}</b></p></noscript>
      ${guide(p.yery, translate(l, "yery.hint"))}
      ${guide(p.ain, translate(l, "ain.hint"))}
      <nav aria-label="${p.langsLabel}">
        <h2>${p.langsLabel}</h2>
        <ul>${langLinks}</ul>
        <p><a href="/privacy.html">${p.privacy}</a> · <a href="${REPO}">${p.source}</a></p>
      </nav>
    </article>`;
}

const HEAD = /<!--seo:head-->[\s\S]*?<!--\/seo:head-->/;
const BODY = /<!--seo:body-->[\s\S]*?<!--\/seo:body-->/;

/**
 * Fill index.html for language `l` between its <!--seo:head--> and
 * <!--seo:body--> markers. With `keepMarkers` the result can be rendered again
 * (Vite's dev/build transform keeps them so the plugin can derive /ru/, /he/,
 * /ar/ from the built page); the published pages drop them.
 */
export function renderPage(template: string, l: Lang, keepMarkers = false): string {
  const wrap = (name: string, html: string) =>
    keepMarkers ? `<!--seo:${name}-->${html}<!--/seo:${name}-->` : html;
  return template
    .replace(/<html lang="[^"]*"( dir="[^"]*")?>/, `<html lang="${l}" dir="${dirOf(l)}">`)
    .replace(HEAD, () => wrap("head", renderHead(l)))
    .replace(BODY, () => wrap("body", renderBody(l)));
}

export function renderSitemap(lastmod: string): string {
  const alt = LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${SITE}${pathOf(x)}"/>`)
    .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`)
    .join("");
  const urls = LANGS.map(
    (l) => `  <url><loc>${SITE}${pathOf(l)}</loc><lastmod>${lastmod}</lastmod>${alt}</url>`,
  ).concat(`  <url><loc>${SITE}/privacy.html</loc><lastmod>${lastmod}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}
