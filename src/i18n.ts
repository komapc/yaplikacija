// UI strings in English, Russian, Hebrew and Arabic, plus the active-language state.
//
// The language comes from the URL prefix (/ru/, /he/, /ar/ — the per-language
// pages generated at build time, see src/seo.ts), else from localStorage, else
// from the browser locale, and is persisted on change. Strings are looked up at call time (`t`), so anything
// built after a switch uses the new language; main.ts rebuilds the shell on
// `onLangChange`. Guarded for non-browser contexts (tests run some modules in
// plain Node).

export type Lang = "en" | "ru" | "he" | "ar";
export const LANGS: readonly Lang[] = ["en", "ru", "he", "ar"];
const isLang = (x: unknown): x is Lang => LANGS.includes(x as Lang);
/** Hebrew and Arabic are written right-to-left. */
export const dirOf = (l: Lang): "rtl" | "ltr" => (l === "he" || l === "ar" ? "rtl" : "ltr");

const en = {
  "tab.sound": "Sound",
  "tab.word": "Words",
  "tab.bullseye": "🎯 Target",
  "tab.duel": "⚔ Duel",
  "tab.falling": "🌧 Rain",

  "app.about": "How it works",
  "app.close": "Close",
  "app.switchLang": "Switch language",

  "about.html": `
      <h2>How it works</h2>
      <p>This app trains the Russian vowel <b>Ы</b> <span class="ipa">[ɨ]</span> — a high,
      <i>central</i> vowel that sits between «и» (front) and «у» (back).</p>

      <h3>Listening</h3>
      <p>It records your voice <b>entirely on your device</b> (nothing is uploaded),
      resamples to 16&nbsp;kHz, filters out low-frequency rumble, and finds the steady,
      voiced core of your vowel.</p>

      <h3>Formants</h3>
      <p>Every vowel is shaped by resonances of your vocal tract called <b>formants</b>.
      The two that matter here:</p>
      <ul>
        <li><b>F1</b> — how open the vowel is (tongue height). Ы is high → low F1.</li>
        <li><b>F2</b> — front vs back (tongue position). Ы is central → mid F2.</li>
      </ul>
      <p>It estimates F1 and F2 with <b>LPC</b> (linear predictive coding): per short frame
      it models the spectral envelope as resonant poles and reads off their frequencies,
      then takes the median over your steadiest frames.</p>

      <h3>Scoring</h3>
      <p>Your (F1,&nbsp;F2) is plotted on the vowel chart against the green <b>target zone</b>.
      The score combines both formants <i>non-compensatively</i> — being off in <i>either</i>
      lowers it — so «э» (good F2 but too open) can't sneak through, and «и»/«у» (wrong F2)
      are rejected. The и/у markers on the chart are your reference contrasts.</p>

      <h3>Honest limits</h3>
      <p>Formant estimates are tuned for adult voices and aren't perfect for back vowels or
      very high-pitched speakers, so an occasional reading is off. It's a practice aid, not a
      lab instrument.</p>`,

  "common.hold": "🎙️ hold &amp; speak",
  "common.play": "▶ play my attempt",
  "common.micError": "Could not access the microphone.",
  "common.micErrorShort": "Mic error — check permissions.",
  "common.score": "score",
  "common.yourVowel": "Your {letter}: F1 ≈ {f1} Hz, F2 ≈ {f2} Hz",

  "chart.f2": "F2 (front ← → back)",
  "chart.f1": "F1 (close ← → open)",
  "chart.you": "you",
  "chart.offChart": "you (off-chart)",

  "yery.language": "Russian",
  "yery.prompt": "Say a long «ы» — as in мы, ты, сын.",
  "yery.hint":
    "Like «и», but pull the tongue back toward your throat and keep lips unrounded. Smile slightly, do not pucker.",
  "yery.f2TooHigh": "That sounded like «и» — your tongue is too far forward. Pull it back toward the throat.",
  "yery.f2TooLow": "That drifted toward «у» — relax the back of the tongue and spread the lips a little.",
  "yery.f1TooHigh": "Vowel is too open (like «э/а»). Raise the tongue higher, closer to the roof.",
  "yery.f1TooLow": "Vowel is very closed — that is fine for «ы»; focus on the front/back position.",

  "ain.language": "Hebrew / Arabic",
  "ain.prompt": "Produce a voiced «ע / ع» — a tight, voiced sound deep in the throat.",
  "ain.hint":
    "Constrict the pharynx (root of the tongue toward the back wall) and keep voicing, as if gently choking while humming. Not a glottal stop, not an «h».",
  "ain.f2TooHigh": "Too far forward / too vowel-like. Pull the tongue root back and tighten the throat.",
  "ain.f2TooLow": "Going toward a back rounded vowel — keep it tense and voiced, do not round the lips.",
  "ain.f1TooHigh": "Constriction may be too low (glottal). Move the squeeze up into the pharynx.",
  "ain.f1TooLow": "Not enough pharyngeal constriction — squeeze harder at the root of the tongue.",

  "score.none": "I did not hear a sustained voiced sound. Hold the sound steady for about a second.",
  "calib.title": "Calibrate to my voice",
  "calib.help": "Targets are tuned to an average adult voice. Hold the sound «a» (as in “father”) for about a second so scoring can adjust to your voice.",
  "calib.hold": "Hold and say «a»",
  "calib.reset": "Reset",
  "calib.on": "Calibrated to your voice.",
  "calib.off": "Not calibrated (average adult voice).",
  "calib.fail": "Could not measure — hold «a» steadily for about a second.",
  "score.short": "That was too short to measure. Hold the sound steady for about a second.",
  "score.excellent": "Excellent — that is right in the target zone. 🎯",
  "score.close": "Close — nudge it a little nearer the center of the target.",
  "score.steadier": "Hold the vowel steadier — it wandered a lot. {rest}",

  "sound.status0": "Hold the button and sustain the sound for about a second.",
  "sound.listening": "Listening… keep it steady.",
  "sound.again": "Try again to improve.",

  "word.ref": "▶ Reference",
  "word.hint": "Listen, then say the word — keep the «ы» steady.",
  "word.status0": "Hold the button and say the whole word.",
  "word.listening": "Listening… say the word.",
  "word.noNucleus": "I could not find a clear «ы» — say it slowly and stretch the «ы».",
  "word.again": "Try again, or move on.",
  "word.reference": "Reference: {a}",
  "word.best": "best {n}",
  "word.newBest": "New best: {n}!",
  "word.scored": "Scored segment",
  "word.prev": "Previous",
  "word.next": "Next",

  "bullseye.title": "🎯 Target — {l}",
  "bullseye.combo": "combo ×{n}",
  "bullseye.hint": "Tap Start, then say «ы» again and again — the mic stays open. Each hit (≥{hit}) builds your combo.",
  "bullseye.status0": "Tap Start and say «ы».",
  "bullseye.bestCombo": "best combo",
  "bullseye.start": "🎙️ Start listening",
  "bullseye.stop": "⏸ Stop",
  "bullseye.live": "🔴 listening — say «ы»",
  "bullseye.paused": "Paused. Tap Start to continue.",
  "bullseye.hit": "✦ HIT {s} ×{mult} = +{pts}",
  "bullseye.miss": "✗ miss ({s}) — combo reset",

  "duel.title": "⚔ Duel — say «{l}»",
  "duel.hint": "Produce «ы» — <b>not</b> «и», <b>not</b> «у». The и/у markers on the chart are the traps.",
  "duel.status0": "Hold the button and say «ы».",
  "duel.round": "round",
  "duel.clean": "✓ clean ы — +{pts}",
  "duel.rival": "✗ that was «{v}»! −1 ♥",
  "duel.over": "💀 out of lives — score {score}. Hold to play again.",
  "duel.aim": "«{v}» — aim for a clear «ы»",
  "duel.noVowel": "couldn't hear a vowel — try again",

  "falling.title": "🌧 Word rain",
  "falling.hint": "Say each falling word before it lands. We listen for its vowel.",
  "falling.status0": "Hold the button and say the word.",
  "falling.landed": "«{w}» landed!",
  "falling.over": "💀 {msg} — score {score}. Hold to play again.",
  "falling.heard": "heard «{v}» — that word needs «{need}»",
  "falling.ok": "✓ {w}!",
} as const;

const ru: Record<keyof typeof en, string> = {
  "tab.sound": "Звук",
  "tab.word": "Слова",
  "tab.bullseye": "🎯 Мишень",
  "tab.duel": "⚔ Дуэль",
  "tab.falling": "🌧 Дождь",

  "app.about": "Как это работает",
  "app.close": "Закрыть",
  "app.switchLang": "Сменить язык",

  "about.html": `
      <h2>Как это работает</h2>
      <p>Приложение тренирует русский гласный <b>Ы</b> <span class="ipa">[ɨ]</span> — высокий
      <i>центральный</i> гласный между «и» (передний) и «у» (задний).</p>

      <h3>Слушание</h3>
      <p>Голос записывается <b>только на вашем устройстве</b> (ничего не отправляется),
      приводится к 16&nbsp;кГц, из него убирается низкочастотный гул, и находится устойчивая
      озвученная часть гласного.</p>

      <h3>Форманты</h3>
      <p>Окраска каждого гласного определяется резонансами речевого тракта — <b>формантами</b>.
      Здесь важны две:</p>
      <ul>
        <li><b>F1</b> — насколько гласный открыт (высота языка). Ы высокий → низкая F1.</li>
        <li><b>F2</b> — передний или задний (положение языка). Ы центральный → средняя F2.</li>
      </ul>
      <p>F1 и F2 оцениваются методом <b>LPC</b> (линейное предсказание): для каждого короткого
      кадра спектральная огибающая моделируется резонансными полюсами, из них читаются частоты,
      затем берётся медиана по самым устойчивым кадрам.</p>

      <h3>Оценка</h3>
      <p>Ваша точка (F1,&nbsp;F2) рисуется на диаграмме гласных относительно зелёной
      <b>целевой зоны</b>. Оценка учитывает обе форманты <i>без компенсации</i> — ошибка в
      <i>любой</i> из них снижает балл, поэтому «э» (F2 подходит, но слишком открытый) не
      пройдёт, а «и»/«у» (неверная F2) отклоняются. Метки и/у на диаграмме — опорные контрасты.</p>

      <h3>Честные ограничения</h3>
      <p>Оценки формант настроены на взрослые голоса и неидеальны для задних гласных и очень
      высоких голосов, поэтому иногда результат неточен. Это тренажёр, а не лабораторный прибор.</p>`,

  "common.hold": "🎙️ зажми и говори",
  "common.play": "▶ послушать запись",
  "common.micError": "Нет доступа к микрофону.",
  "common.micErrorShort": "Ошибка микрофона — проверь разрешения.",
  "common.score": "очки",
  "common.yourVowel": "Твой {letter}: F1 ≈ {f1} Гц, F2 ≈ {f2} Гц",

  "chart.f2": "F2 (передний ← → задний)",
  "chart.f1": "F1 (закрытый ← → открытый)",
  "chart.you": "ты",
  "chart.offChart": "ты (за диаграммой)",

  "yery.language": "русский",
  "yery.prompt": "Скажи долгое «ы» — как в мы, ты, сын.",
  "yery.hint":
    "Как «и», но язык оттянут назад, к горлу, губы не округлены. Слегка улыбнись, не вытягивай губы трубочкой.",
  "yery.f2TooHigh": "Получилось похоже на «и» — язык слишком впереди. Оттяни его назад, к горлу.",
  "yery.f2TooLow": "Сползает к «у» — расслабь заднюю часть языка и слегка растяни губы.",
  "yery.f1TooHigh": "Гласный слишком открытый (как «э/а»). Подними язык выше, ближе к нёбу.",
  "yery.f1TooLow": "Гласный очень закрытый — для «ы» это нормально; следи за положением вперёд/назад.",

  "ain.language": "иврит / арабский",
  "ain.prompt": "Произнеси звонкий «ע / ع» — напряжённый звук глубоко в горле.",
  "ain.hint":
    "Сузь глотку (корень языка к задней стенке) и сохраняй голос — как будто слегка давишься, напевая. Это не гортанная смычка и не «х».",
  "ain.f2TooHigh": "Слишком впереди / слишком похоже на гласный. Оттяни корень языка и напряги горло.",
  "ain.f2TooLow": "Уходит к заднему лабиализованному гласному — держи напряжение и голос, не округляй губы.",
  "ain.f1TooHigh": "Сужение, возможно, слишком низко (гортанное). Подними сжатие в глотку.",
  "ain.f1TooLow": "Мало глоточного сужения — сильнее сожми корень языка.",

  "score.none": "Устойчивого звонкого звука не слышно. Держи звук ровно около секунды.",
  "calib.title": "Подстроить под мой голос",
  "calib.help": "Цели настроены на средний взрослый голос. Протяни звук «а» около секунды, чтобы оценка подстроилась под твой голос.",
  "calib.hold": "Зажми и скажи «а»",
  "calib.reset": "Сбросить",
  "calib.on": "Подстроено под твой голос.",
  "calib.off": "Не настроено (средний взрослый голос).",
  "calib.fail": "Не удалось измерить — тяни «а» ровно около секунды.",
  "score.short": "Слишком коротко, чтобы измерить. Держи звук ровно около секунды.",
  "score.excellent": "Отлично — прямо в целевой зоне. 🎯",
  "score.close": "Близко — сдвинь чуть ближе к центру цели.",
  "score.steadier": "Держи гласный ровнее — он сильно плавал. {rest}",

  "sound.status0": "Зажми кнопку и тяни звук около секунды.",
  "sound.listening": "Слушаю… держи ровно.",
  "sound.again": "Попробуй ещё раз, чтобы улучшить.",

  "word.ref": "▶ Эталон",
  "word.hint": "Послушай, затем скажи слово — держи «ы» ровно.",
  "word.status0": "Зажми кнопку и скажи слово целиком.",
  "word.listening": "Слушаю… скажи слово.",
  "word.noNucleus": "Не нашёл чёткого «ы» — скажи медленно и протяни «ы».",
  "word.again": "Попробуй ещё раз или иди дальше.",
  "word.reference": "Эталон: {a}",
  "word.best": "рекорд {n}",
  "word.newBest": "Новый рекорд: {n}!",
  "word.scored": "Оценённый участок",
  "word.prev": "Назад",
  "word.next": "Вперёд",

  "bullseye.title": "🎯 Мишень — {l}",
  "bullseye.combo": "комбо ×{n}",
  "bullseye.hint": "Нажми «Старт» и говори «ы» снова и снова — микрофон остаётся включённым. Каждое попадание (≥{hit}) растит комбо.",
  "bullseye.status0": "Нажми «Старт» и скажи «ы».",
  "bullseye.bestCombo": "лучшее комбо",
  "bullseye.start": "🎙️ Начать слушать",
  "bullseye.stop": "⏸ Стоп",
  "bullseye.live": "🔴 слушаю — говори «ы»",
  "bullseye.paused": "Пауза. Нажми «Старт», чтобы продолжить.",
  "bullseye.hit": "✦ ПОПАДАНИЕ {s} ×{mult} = +{pts}",
  "bullseye.miss": "✗ мимо ({s}) — комбо сброшено",

  "duel.title": "⚔ Дуэль — скажи «{l}»",
  "duel.hint": "Произнеси «ы» — <b>не</b> «и», <b>не</b> «у». Метки и/у на диаграмме — ловушки.",
  "duel.status0": "Зажми кнопку и скажи «ы».",
  "duel.round": "раунд",
  "duel.clean": "✓ чистое ы — +{pts}",
  "duel.rival": "✗ это было «{v}»! −1 ♥",
  "duel.over": "💀 жизни кончились — очки {score}. Зажми, чтобы сыграть снова.",
  "duel.aim": "«{v}» — целься в чёткое «ы»",
  "duel.noVowel": "гласный не слышно — попробуй ещё раз",

  "falling.title": "🌧 Дождь слов",
  "falling.hint": "Скажи каждое падающее слово, пока оно не упало. Мы слушаем его гласный.",
  "falling.status0": "Зажми кнопку и скажи слово.",
  "falling.landed": "«{w}» упало!",
  "falling.over": "💀 {msg} — очки {score}. Зажми, чтобы сыграть снова.",
  "falling.heard": "услышал «{v}» — этому слову нужно «{need}»",
  "falling.ok": "✓ {w}!",
};

const he: Record<keyof typeof en, string> = {
  "tab.sound": "צליל",
  "tab.word": "מילים",
  "tab.bullseye": "🎯 מטרה",
  "tab.duel": "⚔ דו־קרב",
  "tab.falling": "🌧 גשם",

  "app.about": "איך זה עובד",
  "app.close": "סגירה",
  "app.switchLang": "החלפת שפה",

  "about.html": `
      <h2>איך זה עובד</h2>
      <p>האפליקציה מאמנת את התנועה הרוסית <b>Ы</b> <span class="ipa">[ɨ]</span> — תנועה גבוהה
      ו<i>מרכזית</i>, שנמצאת בין «и» (קדמית) לבין «у» (אחורית).</p>

      <h3>האזנה</h3>
      <p>הקול מוקלט <b>רק על המכשיר שלכם</b> (שום דבר לא נשלח), נדגם מחדש ל־16&nbsp;קה״ץ,
      מסונן מרעש בתדרים נמוכים, ואז נמצא בו הגרעין הקולי והיציב של התנועה.</p>

      <h3>פורמנטים</h3>
      <p>כל תנועה מעוצבת על ידי תהודות של מערכת הדיבור שנקראות <b>פורמנטים</b>.
      שניים מהם חשובים כאן:</p>
      <ul>
        <li><b>F1</b> — כמה התנועה פתוחה (גובה הלשון). Ы גבוהה ← F1 נמוך.</li>
        <li><b>F2</b> — קדמית או אחורית (מיקום הלשון). Ы מרכזית ← F2 בינוני.</li>
      </ul>
      <p>F1 ו־F2 מוערכים בשיטת <b>LPC</b> (קידוד חיזוי לינארי): בכל מסגרת קצרה המעטפת הספקטרלית
      ממודלת כקטבי תהודה, התדרים שלהם נקראים, ואז נלקח החציון של המסגרות היציבות ביותר.</p>

      <h3>ניקוד</h3>
      <p>הנקודה שלכם (F1,&nbsp;F2) מסומנת על תרשים התנועות ביחס ל<b>אזור היעד</b> הירוק.
      הציון משלב את שני הפורמנטים <i>בלי פיצוי</i> — סטייה ב<i>כל אחד</i> מהם מורידה אותו —
      כך ש־«э» (F2 טוב אבל פתוחה מדי) לא תעבור, ו־«и»/«у» (F2 שגוי) נדחות.
      הסימונים и/у על התרשים הם נקודות הייחוס להשוואה.</p>

      <h3>מגבלות, בכנות</h3>
      <p>הערכות הפורמנטים מכוונות לקולות של מבוגרים ואינן מושלמות לתנועות אחוריות או לקולות
      גבוהים מאוד, ולכן מדי פעם מדידה תצא שגויה. זה כלי תרגול, לא מכשיר מעבדה.</p>`,

  "common.hold": "🎙️ להחזיק ולדבר",
  "common.play": "▶ להשמיע את הניסיון שלי",
  "common.micError": "אין גישה למיקרופון.",
  "common.micErrorShort": "שגיאת מיקרופון — בדקו את ההרשאות.",
  "common.score": "ציון",
  "common.yourVowel": "ה־{letter} שלכם: F1 ≈ {f1} הרץ, F2 ≈ {f2} הרץ",

  "chart.f2": "F2 (קדמית ← → אחורית)",
  "chart.f1": "F1 (סגורה ← → פתוחה)",
  "chart.you": "את/ה",
  "chart.offChart": "את/ה (מחוץ לתרשים)",

  "yery.language": "רוסית",
  "yery.prompt": "אמרו «ы» ארוכה — כמו ב־мы, ты, сын.",
  "yery.hint":
    "כמו «и», אבל משכו את הלשון לאחור לכיוון הגרון והשאירו את השפתיים לא מעוגלות. חייכו קלות, בלי לעגל את השפתיים.",
  "yery.f2TooHigh": "זה נשמע כמו «и» — הלשון קדמית מדי. משכו אותה לאחור, לכיוון הגרון.",
  "yery.f2TooLow": "זה גלש לכיוון «у» — הרפו את גב הלשון ומתחו מעט את השפתיים.",
  "yery.f1TooHigh": "התנועה פתוחה מדי (כמו «э/а»). הרימו את הלשון גבוה יותר, קרוב לחך.",
  "yery.f1TooLow": "התנועה סגורה מאוד — זה בסדר ל־«ы»; התמקדו במיקום קדימה/אחורה.",

  "ain.language": "עברית / ערבית",
  "ain.prompt": "הפיקו «ע / ع» קולית — צליל מהודק וקולי עמוק בגרון.",
  "ain.hint":
    "כווצו את הלוע (שורש הלשון אל הדופן האחורית) והמשיכו להשמיע קול, כאילו נחנקים קלות תוך כדי זמזום. זה לא סגר סדקי (א) ולא «ה».",
  "ain.f2TooHigh": "קדמי מדי / דומה מדי לתנועה. משכו את שורש הלשון לאחור והדקו את הגרון.",
  "ain.f2TooLow": "זה נוטה לתנועה אחורית מעוגלת — שמרו על מתח ועל קול, בלי לעגל את השפתיים.",
  "ain.f1TooHigh": "ייתכן שההיצרות נמוכה מדי (במיתרי הקול). העלו את הכיווץ אל הלוע.",
  "ain.f1TooLow": "אין מספיק היצרות לועית — כווצו חזק יותר בשורש הלשון.",

  "score.none": "לא שמעתי צליל קולי מתמשך. החזיקו את הצליל יציב כשנייה.",
  "calib.title": "כיול לקול שלי",
  "calib.help": "היעדים מכוונים לקול של מבוגר ממוצע. החזיקו את הצליל «a» (כמו ב־«אבא») כשנייה, כדי שהניקוד יותאם לקול שלכם.",
  "calib.hold": "להחזיק ולומר «a»",
  "calib.reset": "איפוס",
  "calib.on": "מכויל לקול שלכם.",
  "calib.off": "לא מכויל (קול של מבוגר ממוצע).",
  "calib.fail": "המדידה נכשלה — החזיקו «a» יציבה כשנייה.",
  "score.short": "זה היה קצר מדי למדידה. החזיקו את הצליל יציב כשנייה.",
  "score.excellent": "מצוין — בדיוק באזור היעד. 🎯",
  "score.close": "קרוב — הזיזו מעט לכיוון מרכז היעד.",
  "score.steadier": "החזיקו את התנועה יציבה יותר — היא נדדה הרבה. {rest}",

  "sound.status0": "החזיקו את הכפתור והאריכו את הצליל כשנייה.",
  "sound.listening": "מקשיב… שמרו על יציבות.",
  "sound.again": "נסו שוב כדי להשתפר.",

  "word.ref": "▶ הגייה לדוגמה",
  "word.hint": "הקשיבו, ואז אמרו את המילה — שמרו על «ы» יציבה.",
  "word.status0": "החזיקו את הכפתור ואמרו את המילה כולה.",
  "word.listening": "מקשיב… אמרו את המילה.",
  "word.noNucleus": "לא מצאתי «ы» ברורה — אמרו לאט והאריכו את ה־«ы».",
  "word.again": "נסו שוב, או עברו הלאה.",
  "word.reference": "הגייה לדוגמה: {a}",
  "word.best": "שיא {n}",
  "word.newBest": "שיא חדש: {n}!",
  "word.scored": "הקטע שנוקד",
  "word.prev": "הקודמת",
  "word.next": "הבאה",

  "bullseye.title": "🎯 מטרה — {l}",
  "bullseye.combo": "רצף ×{n}",
  "bullseye.hint": "לחצו על «התחלה» ואמרו «ы» שוב ושוב — המיקרופון נשאר פתוח. כל פגיעה (≥{hit}) מאריכה את הרצף.",
  "bullseye.status0": "לחצו על «התחלה» ואמרו «ы».",
  "bullseye.bestCombo": "הרצף הטוב ביותר",
  "bullseye.start": "🎙️ התחלה",
  "bullseye.stop": "⏸ עצירה",
  "bullseye.live": "🔴 מקשיב — אמרו «ы»",
  "bullseye.paused": "מושהה. לחצו על «התחלה» כדי להמשיך.",
  "bullseye.hit": "✦ פגיעה {s} ×{mult} = +{pts}",
  "bullseye.miss": "✗ החטאה ({s}) — הרצף אופס",

  "duel.title": "⚔ דו־קרב — אמרו «{l}»",
  "duel.hint": "הפיקו «ы» — <b>לא</b> «и» ו<b>לא</b> «у». הסימונים и/у על התרשים הם המלכודות.",
  "duel.status0": "החזיקו את הכפתור ואמרו «ы».",
  "duel.round": "סיבוב",
  "duel.clean": "✓ ы נקייה — +{pts}",
  "duel.rival": "✗ זו הייתה «{v}»! −1 ♥",
  "duel.over": "💀 נגמרו החיים — ציון {score}. החזיקו כדי לשחק שוב.",
  "duel.aim": "«{v}» — כוונו ל־«ы» ברורה",
  "duel.noVowel": "לא נשמעה תנועה — נסו שוב",

  "falling.title": "🌧 גשם מילים",
  "falling.hint": "אמרו כל מילה נופלת לפני שהיא נוחתת. אנחנו מקשיבים לתנועה שלה.",
  "falling.status0": "החזיקו את הכפתור ואמרו את המילה.",
  "falling.landed": "«{w}» נחתה!",
  "falling.over": "💀 {msg} — ציון {score}. החזיקו כדי לשחק שוב.",
  "falling.heard": "שמעתי «{v}» — המילה הזו צריכה «{need}»",
  "falling.ok": "✓ {w}!",
};

const ar: Record<keyof typeof en, string> = {
  "tab.sound": "الصوت",
  "tab.word": "الكلمات",
  "tab.bullseye": "🎯 الهدف",
  "tab.duel": "⚔ المبارزة",
  "tab.falling": "🌧 المطر",

  "app.about": "كيف يعمل",
  "app.close": "إغلاق",
  "app.switchLang": "تغيير اللغة",

  "about.html": `
      <h2>كيف يعمل</h2>
      <p>يدرّبك هذا التطبيق على الصائت الروسي <b>Ы</b> <span class="ipa">[ɨ]</span> — صائت مرتفع
      <i>مركزي</i> يقع بين «и» (أمامي) و«у» (خلفي).</p>

      <h3>الاستماع</h3>
      <p>يُسجَّل صوتك <b>على جهازك فقط</b> (لا يُرفع أي شيء)، ويُعاد أخذ عيناته بتردد 16&nbsp;كيلوهرتز،
      وتُزال منه الضوضاء منخفضة التردد، ثم يُعثر على الجزء المجهور الثابت من الصائت.</p>

      <h3>الفورمانتات</h3>
      <p>يتشكّل كل صائت بفعل رنينات في الجهاز الصوتي تُسمّى <b>الفورمانتات</b>.
      المهم هنا اثنان منها:</p>
      <ul>
        <li><b>F1</b> — مدى انفتاح الصائت (ارتفاع اللسان). Ы مرتفع ← F1 منخفض.</li>
        <li><b>F2</b> — أمامي أو خلفي (موضع اللسان). Ы مركزي ← F2 متوسط.</li>
      </ul>
      <p>يُقدَّر F1 وF2 بطريقة <b>LPC</b> (الترميز التنبّئي الخطي): في كل إطار قصير يُمثَّل الغلاف
      الطيفي بأقطاب رنين تُقرأ تردداتها، ثم يُؤخذ الوسيط عبر أكثر الإطارات ثباتًا.</p>

      <h3>التقييم</h3>
      <p>تُرسم نقطتك (F1،&nbsp;F2) على مخطط الصوائت مقارنةً بـ<b>منطقة الهدف</b> الخضراء.
      يجمع التقييم بين الفورمانتين <i>دون تعويض</i> — الابتعاد في <i>أيٍّ</i> منهما يخفض الدرجة —
      فلا يمرّ «э» (F2 جيد لكنه منفتح أكثر من اللازم)، ويُرفض «и»/«у» (F2 خاطئ).
      علامتا и/у على المخطط هما نقطتا المقارنة المرجعيتان.</p>

      <h3>حدود بصراحة</h3>
      <p>تقديرات الفورمانتات مضبوطة على أصوات البالغين وليست مثالية للصوائت الخلفية أو للأصوات
      الحادة جدًا، لذا قد تخطئ قراءة من حين لآخر. إنه أداة تدريب، لا جهاز مختبر.</p>`,

  "common.hold": "🎙️ اضغط مطولًا وتكلّم",
  "common.play": "▶ استمع إلى محاولتي",
  "common.micError": "تعذّر الوصول إلى الميكروفون.",
  "common.micErrorShort": "خطأ في الميكروفون — تحقّق من الأذونات.",
  "common.score": "النقاط",
  "common.yourVowel": "{letter} الخاص بك: F1 ≈ {f1} هرتز، F2 ≈ {f2} هرتز",

  "chart.f2": "F2 (أمامي ← → خلفي)",
  "chart.f1": "F1 (مغلق ← → منفتح)",
  "chart.you": "أنت",
  "chart.offChart": "أنت (خارج المخطط)",

  "yery.language": "الروسية",
  "yery.prompt": "انطق «ы» طويلة — كما في мы وты وсын.",
  "yery.hint":
    "مثل «и»، لكن اسحب لسانك إلى الخلف نحو الحلق وأبقِ الشفتين غير مدوّرتين. ابتسم قليلًا ولا تضمّ شفتيك.",
  "yery.f2TooHigh": "بدا ذلك مثل «и» — لسانك متقدم أكثر من اللازم. اسحبه إلى الخلف نحو الحلق.",
  "yery.f2TooLow": "انزلق الصوت نحو «у» — أرخِ مؤخرة اللسان وافرد شفتيك قليلًا.",
  "yery.f1TooHigh": "الصائت منفتح أكثر من اللازم (مثل «э/а»). ارفع لسانك أعلى، أقرب إلى سقف الفم.",
  "yery.f1TooLow": "الصائت مغلق جدًا — وهذا مناسب لـ«ы»؛ ركّز على الموضع أمامًا/خلفًا.",

  "ain.language": "العبرية / العربية",
  "ain.prompt": "انطق «ع / ע» مجهورة — صوت مشدود مجهور من عمق الحلق.",
  "ain.hint":
    "ضيّق الحلق (جذر اللسان نحو الجدار الخلفي) واستمر في إخراج الصوت، كأنك تختنق قليلًا وأنت تدندن. ليست همزة ولا «هاء».",
  "ain.f2TooHigh": "متقدم أكثر من اللازم / يشبه الصائت. اسحب جذر اللسان إلى الخلف وشدّ الحلق.",
  "ain.f2TooLow": "يتجه نحو صائت خلفي مدوّر — حافظ على الشد والجهر، ولا تدوّر شفتيك.",
  "ain.f1TooHigh": "ربما التضييق منخفض أكثر من اللازم (حنجري). ارفع الضغط إلى الحلق.",
  "ain.f1TooLow": "التضييق الحلقي غير كافٍ — اضغط أكثر عند جذر اللسان.",

  "score.none": "لم أسمع صوتًا مجهورًا متواصلًا. أبقِ الصوت ثابتًا نحو ثانية.",
  "calib.title": "المعايرة على صوتي",
  "calib.help": "الأهداف مضبوطة على صوت بالغ متوسط. امدد الصوت «a» (كما في «باب») نحو ثانية حتى يتكيّف التقييم مع صوتك.",
  "calib.hold": "اضغط مطولًا وقل «a»",
  "calib.reset": "إعادة الضبط",
  "calib.on": "تمت المعايرة على صوتك.",
  "calib.off": "غير معاير (صوت بالغ متوسط).",
  "calib.fail": "تعذّر القياس — امدد «a» بثبات نحو ثانية.",
  "score.short": "كان ذلك أقصر من أن يُقاس. أبقِ الصوت ثابتًا نحو ثانية.",
  "score.excellent": "ممتاز — في منطقة الهدف تمامًا. 🎯",
  "score.close": "قريب — حرّكه قليلًا نحو مركز الهدف.",
  "score.steadier": "أبقِ الصائت أكثر ثباتًا — لقد تذبذب كثيرًا. {rest}",

  "sound.status0": "اضغط على الزر مطولًا وامدد الصوت نحو ثانية.",
  "sound.listening": "أستمع… حافظ على الثبات.",
  "sound.again": "حاول مرة أخرى لتتحسّن.",

  "word.ref": "▶ النطق المرجعي",
  "word.hint": "استمع، ثم قل الكلمة — وأبقِ «ы» ثابتة.",
  "word.status0": "اضغط على الزر مطولًا وقل الكلمة كاملة.",
  "word.listening": "أستمع… قل الكلمة.",
  "word.noNucleus": "لم أجد «ы» واضحة — تكلّم ببطء وامدد «ы».",
  "word.again": "حاول مرة أخرى أو انتقل إلى التالية.",
  "word.reference": "النطق المرجعي: {a}",
  "word.best": "الأفضل {n}",
  "word.newBest": "رقم قياسي جديد: {n}!",
  "word.scored": "الجزء المقيَّم",
  "word.prev": "السابقة",
  "word.next": "التالية",

  "bullseye.title": "🎯 الهدف — {l}",
  "bullseye.combo": "سلسلة ×{n}",
  "bullseye.hint": "اضغط «ابدأ» ثم قل «ы» مرارًا — يبقى الميكروفون مفتوحًا. كل إصابة (≥{hit}) تطيل سلسلتك.",
  "bullseye.status0": "اضغط «ابدأ» وقل «ы».",
  "bullseye.bestCombo": "أفضل سلسلة",
  "bullseye.start": "🎙️ ابدأ الاستماع",
  "bullseye.stop": "⏸ إيقاف",
  "bullseye.live": "🔴 أستمع — قل «ы»",
  "bullseye.paused": "متوقف مؤقتًا. اضغط «ابدأ» للمتابعة.",
  "bullseye.hit": "✦ إصابة {s} ×{mult} = +{pts}",
  "bullseye.miss": "✗ خطأ ({s}) — أُعيدت السلسلة إلى الصفر",

  "duel.title": "⚔ المبارزة — قل «{l}»",
  "duel.hint": "انطق «ы» — <b>لا</b> «и» و<b>لا</b> «у». علامتا и/у على المخطط هما الفخّان.",
  "duel.status0": "اضغط على الزر مطولًا وقل «ы».",
  "duel.round": "الجولة",
  "duel.clean": "✓ ы نظيفة — +{pts}",
  "duel.rival": "✗ كانت تلك «{v}»! −1 ♥",
  "duel.over": "💀 نفدت المحاولات — النقاط {score}. اضغط مطولًا للعب مجددًا.",
  "duel.aim": "«{v}» — استهدف «ы» واضحة",
  "duel.noVowel": "لم أسمع صائتًا — حاول مرة أخرى",

  "falling.title": "🌧 مطر الكلمات",
  "falling.hint": "قل كل كلمة متساقطة قبل أن تصل إلى الأسفل. نستمع إلى صائتها.",
  "falling.status0": "اضغط على الزر مطولًا وقل الكلمة.",
  "falling.landed": "وصلت «{w}» إلى الأسفل!",
  "falling.over": "💀 {msg} — النقاط {score}. اضغط مطولًا للعب مجددًا.",
  "falling.heard": "سمعت «{v}» — هذه الكلمة تحتاج إلى «{need}»",
  "falling.ok": "✓ {w}!",
};

export const DICT: Record<Lang, Record<keyof typeof en, string>> = { en, ru, he, ar };
export type Key = keyof typeof en;

let lang: Lang = detect();
const listeners = new Set<() => void>();

function detect(): Lang {
  // A language page (/ru/, /he/, /ar/) always starts in its own language.
  const path = typeof location !== "undefined" ? location.pathname : "";
  const m = /^\/(ru|he|ar)(\/|$)/.exec(path);
  if (m) return m[1] as Lang;
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
    if (isLang(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language || "" : "").toLowerCase();
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("he") || nav.startsWith("iw")) return "he";
  if (nav.startsWith("ar")) return "ar";
  return "en";
}

export const getLang = (): Lang => lang;

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem("lang", next);
  } catch {
    /* storage blocked */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.documentElement.dir = dirOf(next);
  }
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

/** A string in a given language, independent of the active one (build-time pages). */
export const translate = (l: Lang, key: Key): string => DICT[l][key];

/** Translate `key`, filling `{name}` placeholders from `params`. */
export function t(key: Key, params?: Record<string, string | number>): string {
  const s = DICT[lang][key];
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}
