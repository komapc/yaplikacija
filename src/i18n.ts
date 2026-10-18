// UI strings in English and Russian, plus the active-language state.
//
// The language is read from localStorage, else from the browser locale, and
// persisted on change. Strings are looked up at call time (`t`), so anything
// built after a switch uses the new language; main.ts rebuilds the shell on
// `onLangChange`. Guarded for non-browser contexts (tests run some modules in
// plain Node).

export type Lang = "en" | "ru";

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

const DICT: Record<Lang, Record<keyof typeof en, string>> = { en, ru };
export type Key = keyof typeof en;

let lang: Lang = detect();
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "en" || saved === "ru") return saved;
  } catch {
    /* storage blocked */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return nav.toLowerCase().startsWith("ru") ? "ru" : "en";
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
  if (typeof document !== "undefined") document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): void {
  listeners.add(fn);
}

/** Translate `key`, filling `{name}` placeholders from `params`. */
export function t(key: Key, params?: Record<string, string | number>): string {
  const s = DICT[lang][key];
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}
