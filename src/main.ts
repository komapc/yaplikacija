import "./styles.css";
import { Recorder } from "./audio/recorder";
import { analyzeBuffer, analyzeWord, type AnalysisResult } from "./dsp/analyze";
import { TARGETS, scoreAttempt, type SoundTarget } from "./trainers/targets";
import { YERY_EXERCISES, exerciseTarget } from "./trainers/exercises";
import { drawFormantChart } from "./ui/formantChart";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="topbar">
    <div class="brand">Yaplikacija</div>
    <nav class="modes" id="modes">
      <button class="mode" data-mode="sound">Звук</button>
      <button class="mode" data-mode="words">Слова Ы</button>
    </nav>
  </header>
  <main class="trainer">
    <div id="soundPanel">
      <nav class="picker" id="picker"></nav>
      <section class="glyph-panel">
        <div class="glyph" id="glyph"></div>
        <div class="meta">
          <div class="ipa" id="ipa"></div>
          <div class="lang" id="lang"></div>
        </div>
      </section>
      <p class="prompt" id="prompt"></p>
      <p class="hint" id="hint"></p>
    </div>

    <div id="wordPanel" hidden>
      <div class="word-nav">
        <button id="prevWord" class="nav-arrow" aria-label="Previous word">‹</button>
        <div class="word-card">
          <div class="word-text" id="wordText"></div>
          <div class="word-meta">
            <span id="wordTranslit"></span> · <span id="wordIpa"></span> · <span id="wordGloss"></span>
          </div>
        </div>
        <button id="nextWord" class="nav-arrow" aria-label="Next word">›</button>
      </div>
      <div class="word-controls">
        <button id="reference" class="ghost">▶ Reference</button>
        <span class="word-progress" id="wordProgress"></span>
      </div>
      <p class="hint">Listen to a native speaker, then say the word — keep the «ы» steady.</p>
    </div>

    <div class="controls">
      <button id="record" class="record">🎙️ Hold &amp; speak</button>
      <button id="play" class="ghost" disabled>▶ Play my attempt</button>
    </div>
    <p class="status" id="status"></p>

    <div class="result" id="result" hidden>
      <div class="score-ring" id="scoreRing"><span id="scoreNum">0</span></div>
      <div class="score-text">
        <div class="feedback" id="feedback"></div>
        <div class="formants" id="formants"></div>
      </div>
    </div>

    <canvas id="chart" class="chart"></canvas>
    <p class="attribution" id="attribution"></p>
  </main>
`;

type Mode = "sound" | "words";
const recorder = new Recorder();
let mode: Mode = "sound";
let currentId: SoundTarget["id"] = "yery";
let exIdx = 0;
let lastResult: AnalysisResult | null = null;
let lastBlob: Blob | null = null;
let recording = false;

const el = {
  modes: byId("modes"),
  soundPanel: byId("soundPanel"),
  wordPanel: byId("wordPanel"),
  picker: byId("picker"),
  glyph: byId("glyph"),
  ipa: byId("ipa"),
  lang: byId("lang"),
  prompt: byId("prompt"),
  hint: byId("hint"),
  wordText: byId("wordText"),
  wordTranslit: byId("wordTranslit"),
  wordIpa: byId("wordIpa"),
  wordGloss: byId("wordGloss"),
  wordProgress: byId("wordProgress"),
  reference: byId<HTMLButtonElement>("reference"),
  prevWord: byId<HTMLButtonElement>("prevWord"),
  nextWord: byId<HTMLButtonElement>("nextWord"),
  status: byId("status"),
  record: byId<HTMLButtonElement>("record"),
  play: byId<HTMLButtonElement>("play"),
  result: byId("result"),
  scoreNum: byId("scoreNum"),
  scoreRing: byId("scoreRing"),
  feedback: byId("feedback"),
  formants: byId("formants"),
  chart: byId<HTMLCanvasElement>("chart"),
  attribution: byId("attribution"),
};

/** The SoundTarget currently being trained, for chart + scoring. */
function activeTarget(): SoundTarget {
  return mode === "sound" ? TARGETS[currentId] : exerciseTarget(YERY_EXERCISES[exIdx]);
}

function resetAttempt(): void {
  lastResult = null;
  lastBlob = null;
  el.play.disabled = true;
  el.result.hidden = true;
}

function renderModes(): void {
  el.modes.querySelectorAll<HTMLButtonElement>(".mode").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
}

function setMode(next: Mode): void {
  mode = next;
  el.soundPanel.hidden = next !== "sound";
  el.wordPanel.hidden = next !== "words";
  resetAttempt();
  renderModes();
  if (next === "sound") selectSound(currentId);
  else selectExercise(exIdx);
}

function renderPicker(): void {
  el.picker.innerHTML = "";
  for (const t of Object.values(TARGETS)) {
    const btn = document.createElement("button");
    btn.className = "tab" + (t.id === currentId ? " active" : "");
    btn.textContent = `${t.letter}  ${t.title}`;
    btn.onclick = () => selectSound(t.id);
    el.picker.appendChild(btn);
  }
}

function selectSound(id: SoundTarget["id"]): void {
  currentId = id;
  const t = TARGETS[id];
  el.glyph.textContent = t.letter;
  el.ipa.textContent = t.ipa;
  el.lang.textContent = t.language;
  el.prompt.textContent = t.prompt;
  el.hint.textContent = t.hint;
  el.status.textContent = "Hold the button and sustain the sound for about a second.";
  el.attribution.textContent = "";
  resetAttempt();
  renderPicker();
  drawFormantChart(el.chart, t, null);
}

function selectExercise(idx: number): void {
  exIdx = (idx + YERY_EXERCISES.length) % YERY_EXERCISES.length;
  const ex = YERY_EXERCISES[exIdx];
  el.wordText.textContent = ex.text;
  el.wordTranslit.textContent = ex.translit;
  el.wordIpa.textContent = ex.ipa;
  el.wordGloss.textContent = ex.gloss;
  el.wordProgress.textContent = `${exIdx + 1} / ${YERY_EXERCISES.length}`;
  el.reference.disabled = ex.audioUrl === "";
  el.status.textContent = "Hold the button and say the whole word.";
  el.attribution.textContent = ex.attribution ? `Reference audio: ${ex.attribution}` : "";
  resetAttempt();
  drawFormantChart(el.chart, exerciseTarget(ex), null);
}

async function beginRecording(): Promise<void> {
  if (recording) return;
  try {
    await recorder.start();
    recording = true;
    el.record.classList.add("active");
    el.status.textContent = mode === "sound" ? "Listening… keep the sound steady." : "Listening… say the word.";
  } catch (err) {
    el.status.textContent = "Could not access the microphone. Check browser permissions.";
    console.error(err);
  }
}

async function endRecording(): Promise<void> {
  if (!recording) return;
  recording = false;
  el.record.classList.remove("active");
  el.status.textContent = "Analyzing…";
  try {
    const { samples, sampleRate, blob } = await recorder.stop();
    lastBlob = blob;
    el.play.disabled = false;
    const target = activeTarget();

    if (mode === "sound") {
      lastResult = analyzeBuffer(samples, sampleRate);
    } else {
      const { result, match } = analyzeWord(samples, sampleRate, target);
      lastResult = result;
      if (!match.found) el.status.textContent = "";
    }

    const score = scoreAttempt(target, lastResult);
    el.result.hidden = false;
    el.scoreNum.textContent = String(score.overall);
    el.scoreRing.style.setProperty("--pct", String(score.overall));
    el.feedback.textContent =
      mode === "words" && lastResult.frames.length === 0
        ? "I could not find a clear «ы» in that. Say the word slowly and stretch the «ы»."
        : score.feedback;
    el.formants.textContent =
      lastResult.frames.length > 0
        ? `Your Ы: F1 ≈ ${Math.round(lastResult.f1)} Hz, F2 ≈ ${Math.round(lastResult.f2)} Hz · target F1 ${target.f1.center}, F2 ${target.f2.center}`
        : "";
    if (lastResult.frames.length > 0) el.status.textContent = "Try again, or move on.";
    drawFormantChart(el.chart, target, lastResult);
  } catch (err) {
    el.status.textContent = "Something went wrong analyzing the audio.";
    console.error(err);
  }
}

function playAttempt(): void {
  if (!lastBlob) return;
  void new Audio(URL.createObjectURL(lastBlob)).play();
}

function playReference(): void {
  const ex = YERY_EXERCISES[exIdx];
  if (!ex.audioUrl) return;
  void new Audio(import.meta.env.BASE_URL + ex.audioUrl).play();
}

// --- wiring ----------------------------------------------------------------
el.modes.querySelectorAll<HTMLButtonElement>(".mode").forEach((b) => {
  b.addEventListener("click", () => setMode(b.dataset.mode as Mode));
});

// Pointer events cover mouse + touch for the hold-to-record button.
el.record.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  void beginRecording();
});
const stop = () => void endRecording();
el.record.addEventListener("pointerup", stop);
el.record.addEventListener("pointerleave", stop);
el.record.addEventListener("pointercancel", stop);
el.play.addEventListener("click", playAttempt);
el.reference.addEventListener("click", playReference);
el.prevWord.addEventListener("click", () => selectExercise(exIdx - 1));
el.nextWord.addEventListener("click", () => selectExercise(exIdx + 1));
window.addEventListener("resize", () => drawFormantChart(el.chart, activeTarget(), lastResult));

renderModes();
setMode("sound");

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}
