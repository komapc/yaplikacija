import "./styles.css";
import { Recorder } from "./audio/recorder";
import { createSound } from "./views/sound";
import { createWord } from "./views/word";
import { createBullseye } from "./games/bullseye";
import { createDuel } from "./games/duel";
import { createFalling } from "./games/falling";
import type { View } from "./views/types";

// Ы-only for now (Ain trainer hidden — its target still lives in trainers/targets.ts).
const recorder = new Recorder();
const TABS: { id: string; label: string; make: (r: Recorder) => View }[] = [
  { id: "sound", label: "Звук", make: createSound },
  { id: "word", label: "Слова", make: createWord },
  { id: "bullseye", label: "🎯 Мишень", make: createBullseye },
  { id: "duel", label: "⚔ Дуэль", make: createDuel },
  { id: "falling", label: "🌧 Дождь", make: createFalling },
];

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="topbar">
    <div class="brand">Аппликация Ы</div>
    <nav class="tabs" id="tabs"></nav>
    <button class="about-btn" id="about-btn" aria-label="How it works">ⓘ</button>
  </header>
  <main class="trainer" id="view"></main>
  <div class="modal" id="about" hidden>
    <div class="modal-card">
      <button class="modal-close" id="about-close" aria-label="Close">×</button>
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
      lab instrument.</p>
    </div>
  </div>`;

const tabsEl = document.getElementById("tabs")!;
const viewEl = document.getElementById("view")!;
let current: View | null = null;
let activeId = "";

function open(id: string): void {
  if (id === activeId) return;
  current?.destroy();
  viewEl.replaceChildren();
  const tab = TABS.find((t) => t.id === id)!;
  current = tab.make(recorder);
  viewEl.appendChild(current.element);
  // The element is now laid out — let views redraw their chart at real size
  // (charts drawn during mount, while detached, are skipped at zero size).
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  activeId = id;
  tabsEl.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
}

for (const t of TABS) {
  const b = document.createElement("button");
  b.className = "tab";
  b.dataset.id = t.id;
  b.textContent = t.label;
  b.addEventListener("click", () => open(t.id));
  tabsEl.appendChild(b);
}

// About modal
const aboutModal = document.getElementById("about")!;
const setAbout = (show: boolean) => (aboutModal.hidden = !show);
document.getElementById("about-btn")!.addEventListener("click", () => setAbout(true));
document.getElementById("about-close")!.addEventListener("click", () => setAbout(false));
aboutModal.addEventListener("click", (e) => {
  if (e.target === aboutModal) setAbout(false); // click backdrop closes
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setAbout(false);
});

open("sound");
