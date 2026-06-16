import "./styles.css";
import { Recorder } from "./audio/recorder";
import { analyzeBuffer, type AnalysisResult } from "./dsp/analyze";
import { TARGETS, scoreAttempt, type SoundTarget } from "./trainers/targets";
import { drawFormantChart } from "./ui/formantChart";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="topbar">
    <div class="brand">Yaplikacija</div>
    <nav class="picker" id="picker"></nav>
  </header>
  <main class="trainer">
    <section class="glyph-panel">
      <div class="glyph" id="glyph"></div>
      <div class="meta">
        <div class="ipa" id="ipa"></div>
        <div class="lang" id="lang"></div>
      </div>
    </section>
    <p class="prompt" id="prompt"></p>
    <p class="hint" id="hint"></p>

    <div class="controls">
      <button id="record" class="record">🎙️ Hold &amp; speak</button>
      <button id="play" class="ghost" disabled>▶ Play my attempt</button>
    </div>
    <p class="status" id="status">Tap and hold the button, then sustain the sound for ~1 second.</p>

    <div class="result" id="result" hidden>
      <div class="score-ring" id="scoreRing"><span id="scoreNum">0</span></div>
      <div class="score-text">
        <div class="feedback" id="feedback"></div>
        <div class="formants" id="formants"></div>
      </div>
    </div>

    <canvas id="chart" class="chart"></canvas>
  </main>
`;

const recorder = new Recorder();
let currentId: SoundTarget["id"] = "yery";
let lastResult: AnalysisResult | null = null;
let lastBlob: Blob | null = null;
let recording = false;

const el = {
  picker: byId("picker"),
  glyph: byId("glyph"),
  ipa: byId("ipa"),
  lang: byId("lang"),
  prompt: byId("prompt"),
  hint: byId("hint"),
  status: byId("status"),
  record: byId<HTMLButtonElement>("record"),
  play: byId<HTMLButtonElement>("play"),
  result: byId("result"),
  scoreNum: byId("scoreNum"),
  scoreRing: byId("scoreRing"),
  feedback: byId("feedback"),
  formants: byId("formants"),
  chart: byId<HTMLCanvasElement>("chart"),
};

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
  lastResult = null;
  lastBlob = null;
  el.play.disabled = true;
  el.result.hidden = true;
  renderPicker();
  drawFormantChart(el.chart, t, null);
}

async function beginRecording(): Promise<void> {
  if (recording) return;
  try {
    await recorder.start();
    recording = true;
    el.record.classList.add("active");
    el.status.textContent = "Listening… keep the sound steady.";
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

    const target = TARGETS[currentId];
    lastResult = analyzeBuffer(samples, sampleRate);
    const score = scoreAttempt(target, lastResult);

    el.result.hidden = false;
    el.scoreNum.textContent = String(score.overall);
    el.scoreRing.style.setProperty("--pct", String(score.overall));
    el.feedback.textContent = score.feedback;
    el.formants.textContent =
      lastResult.frames.length > 0
        ? `Your F1 ≈ ${Math.round(lastResult.f1)} Hz, F2 ≈ ${Math.round(lastResult.f2)} Hz · target F1 ${target.f1.center}, F2 ${target.f2.center}`
        : "";
    el.status.textContent = "Try again to improve, or pick the other sound.";
    drawFormantChart(el.chart, target, lastResult);
  } catch (err) {
    el.status.textContent = "Something went wrong analyzing the audio.";
    console.error(err);
  }
}

function playAttempt(): void {
  if (!lastBlob) return;
  const audio = new Audio(URL.createObjectURL(lastBlob));
  void audio.play();
}

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
window.addEventListener("resize", () => drawFormantChart(el.chart, TARGETS[currentId], lastResult));

renderPicker();
selectSound("yery");

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}
