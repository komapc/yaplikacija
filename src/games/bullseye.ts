// 🎯 Мишень — chain clean Ы reps for a combo multiplier.

import type { Recorder } from "../audio/recorder";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt } from "../trainers/targets";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import type { View } from "../views/types";

const HIT = 70; // score needed to count as a hit

export function createBullseye(recorder: Recorder): View {
  const t = TARGETS.yery;
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="game-head"><div class="game-title">🎯 Мишень — ${t.letter}</div><div class="combo" id="b-combo">combo ×0</div></div>
    <p class="hint">Say a clean «ы». Each hit (≥${HIT}) builds your combo; a miss resets it.</p>
    <canvas class="chart" id="b-chart"></canvas>
    <p class="status" id="b-fb">Hold the button and say «ы».</p>
    <div class="game-score">score <b id="b-score">0</b> · best combo <b id="b-best">0</b></div>
    <button class="record" id="b-rec">🎙️ hold &amp; speak</button>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("b-chart");
  let combo = 0,
    best = 0,
    score = 0;
  drawFormantChart(chart, t, null);

  const teardown = holdToRecord(q("b-rec"), recorder, {
    onError: () => (q("b-fb").textContent = "Mic error — check permissions."),
    onResult: ({ samples, sampleRate }) => {
      const result = analyzeBuffer(samples, sampleRate);
      const s = scoreAttempt(t, result).overall;
      if (s >= HIT) {
        combo += 1;
        best = Math.max(best, combo);
        const mult = Math.min(combo, 5);
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
    },
  });

  const onResize = () => drawFormantChart(chart, t, null);
  window.addEventListener("resize", onResize);
  return { element: el, destroy: () => (teardown(), window.removeEventListener("resize", onResize)) };
}
