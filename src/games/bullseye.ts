// 🎯 Мишень — hands-free: the mic stays open and scores each «ы» you say,
// chaining a combo multiplier. A miss resets the combo.

import type { Recorder } from "../audio/recorder";
import { LiveMic } from "../audio/liveMic";
import { resampleTo } from "../dsp/resample";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt } from "../trainers/targets";
import { drawFormantChart } from "../ui/formantChart";
import { t as tr } from "../i18n";
import type { View } from "../views/types";

const HIT = 65;
const MAX_MULT = 8;
const FS = 16000;

export function createBullseye(_recorder: Recorder): View {
  const t = TARGETS.yery;
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="game-head"><div class="game-title">${tr("bullseye.title", { l: t.letter })}</div><div class="combo" id="b-combo">${tr("bullseye.combo", { n: 0 })}</div></div>
    <p class="hint">${tr("bullseye.hint", { hit: HIT })}</p>
    <canvas class="chart" id="b-chart"></canvas>
    <p class="status" id="b-fb">${tr("bullseye.status0")}</p>
    <div class="game-score">${tr("common.score")} <b id="b-score">0</b> · ${tr("bullseye.bestCombo")} <b id="b-best">0</b></div>
    <button class="record" id="b-toggle">${tr("bullseye.start")}</button>`;
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
      q("b-fb").textContent = tr("bullseye.hit", { s, mult, pts });
      q("b-fb").className = "status hit";
    } else {
      combo = 0;
      q("b-fb").textContent = tr("bullseye.miss", { s });
      q("b-fb").className = "status miss";
    }
    q("b-combo").textContent = tr("bullseye.combo", { n: combo });
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
          toggle.textContent = tr("bullseye.stop");
          toggle.classList.add("active");
          q("b-fb").textContent = tr("bullseye.live");
          q("b-fb").className = "status";
        })
        .catch(() => (q("b-fb").textContent = tr("common.micError")));
    } else {
      mic.stop();
      listening = false;
      toggle.textContent = tr("bullseye.start");
      toggle.classList.remove("active");
      q("b-fb").textContent = tr("bullseye.paused");
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
