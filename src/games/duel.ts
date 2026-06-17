// ⚔ Дуэль — say Ы, not its rivals И/У. Land in a rival's region and you lose a life.

import type { Recorder } from "../audio/recorder";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt } from "../trainers/targets";
import { classifyVowel } from "../trainers/vowels";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import type { View } from "../views/types";

const LIVES = 3;

export function createDuel(recorder: Recorder): View {
  const t = TARGETS.yery;
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="game-head"><div class="game-title">⚔ Дуэль — say «${t.letter}»</div><div id="d-lives">${"♥".repeat(LIVES)}</div></div>
    <p class="hint">Produce «ы» — <b>not</b> «и», <b>not</b> «у». The и/у markers on the chart are the traps.</p>
    <canvas class="chart" id="d-chart"></canvas>
    <p class="status" id="d-fb">Hold the button and say «ы».</p>
    <div class="game-score">score <b id="d-score">0</b> · round <b id="d-round">0</b></div>
    <button class="record" id="d-rec">🎙️ hold &amp; speak</button>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("d-chart");
  let lives = LIVES,
    score = 0,
    round = 0,
    over = false;
  drawFormantChart(chart, t, null);

  const teardown = holdToRecord(q("d-rec"), recorder, {
    onError: () => (q("d-fb").textContent = "Mic error — check permissions."),
    onResult: ({ samples, sampleRate }) => {
      if (over) {
        // restart
        lives = LIVES;
        score = 0;
        round = 0;
        over = false;
        q("d-lives").textContent = "♥".repeat(LIVES);
      }
      const result = analyzeBuffer(samples, sampleRate);
      const v = classifyVowel(result.f1, result.f2);
      round += 1;
      if (v === "ы") {
        const pts = scoreAttempt(t, result).overall;
        score += pts;
        q("d-fb").textContent = `✓ clean ы — +${pts}`;
        q("d-fb").className = "status hit";
      } else {
        lives -= 1;
        q("d-fb").textContent = v ? `✗ that was «${v}»! −1 ♥` : "✗ couldn't hear a vowel";
        q("d-fb").className = "status miss";
        q("d-lives").textContent = "♥".repeat(Math.max(0, lives)) + "·".repeat(LIVES - Math.max(0, lives));
        if (lives <= 0) {
          over = true;
          q("d-fb").textContent = `💀 out of lives — score ${score}. Hold to play again.`;
        }
      }
      q("d-score").textContent = String(score);
      q("d-round").textContent = String(round);
      drawFormantChart(chart, t, result);
    },
  });

  const onResize = () => drawFormantChart(chart, t, null);
  window.addEventListener("resize", onResize);
  return { element: el, destroy: () => (teardown(), window.removeEventListener("resize", onResize)) };
}
