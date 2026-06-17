// 🎯 Мишень — hands-free: the mic stays open and scores each «ы» you say,
// chaining a combo multiplier. A miss resets the combo.

import type { Recorder } from "../audio/recorder";
import { LiveMic } from "../audio/liveMic";
import { resampleTo } from "../dsp/resample";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt } from "../trainers/targets";
import { drawFormantChart } from "../ui/formantChart";
import type { View } from "../views/types";

const HIT = 65;
const MAX_MULT = 8;
const FS = 16000;

export function createBullseye(_recorder: Recorder): View {
  const t = TARGETS.yery;
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="game-head"><div class="game-title">🎯 Мишень — ${t.letter}</div><div class="combo" id="b-combo">combo ×0</div></div>
    <p class="hint">Tap Start, then say «ы» again and again — the mic stays open. Each hit (≥${HIT}) builds your combo.</p>
    <canvas class="chart" id="b-chart"></canvas>
    <p class="status" id="b-fb">Tap Start and say «ы».</p>
    <div class="game-score">score <b id="b-score">0</b> · best combo <b id="b-best">0</b></div>
    <button class="record" id="b-toggle">🎙️ Start listening</button>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("b-chart");
  const mic = new LiveMic();
  let listening = false,
    combo = 0,
    best = 0,
    score = 0;
  drawFormantChart(chart, t, null);

  function onUtterance(samples: Float32Array, rate: number): void {
    const result = analyzeBuffer(resampleTo(samples, rate, FS), FS);
    if (result.frames.length < 3) return; // not a real vowel
    const s = scoreAttempt(t, result).overall;
    if (s >= HIT) {
      combo += 1;
      best = Math.max(best, combo);
      const mult = Math.min(combo, MAX_MULT);
      const pts = s * mult;
      score += pts;
      q("b-fb").textContent = `✦ HIT ${s} ×${mult} = +${pts}`;
      q("b-fb").className = "status hit";
    } else {
      combo = 0;
      q("b-fb").textContent = `✗ miss (${s}) — combo reset`;
      q("b-fb").className = "status miss";
    }
    q("b-combo").textContent = `combo ×${combo}`;
    q("b-score").textContent = String(score);
    q("b-best").textContent = String(best);
    drawFormantChart(chart, t, result);
  }

  const toggle = q<HTMLButtonElement>("b-toggle");
  toggle.addEventListener("click", () => {
    if (!listening) {
      void mic
        .start(onUtterance)
        .then(() => {
          listening = true;
          toggle.textContent = "⏸ Stop";
          toggle.classList.add("active");
          q("b-fb").textContent = "🔴 listening — say «ы»";
          q("b-fb").className = "status";
        })
        .catch(() => (q("b-fb").textContent = "Could not access the microphone."));
    } else {
      mic.stop();
      listening = false;
      toggle.textContent = "🎙️ Start listening";
      toggle.classList.remove("active");
      q("b-fb").textContent = "Paused. Tap Start to continue.";
    }
  });

  const onResize = () => drawFormantChart(chart, t, null);
  window.addEventListener("resize", onResize);
  return {
    element: el,
    destroy: () => {
      mic.stop();
      window.removeEventListener("resize", onResize);
    },
  };
}
