// ⚔ Дуэль — say Ы, not its rivals И/У. Land in a rival's region and you lose a life.

import type { Recorder } from "../audio/recorder";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt } from "../trainers/targets";
import { classifyVowel } from "../trainers/vowels";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import { t as tr } from "../i18n";
import type { View } from "../views/types";

const LIVES = 3;

export function createDuel(recorder: Recorder): View {
  const t = TARGETS.yery;
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="game-head"><div class="game-title">${tr("duel.title", { l: t.letter })}</div><div id="d-lives">${"♥".repeat(LIVES)}</div></div>
    <p class="hint">${tr("duel.hint")}</p>
    <canvas class="chart" id="d-chart"></canvas>
    <p class="status" id="d-fb">${tr("duel.status0")}</p>
    <div class="game-score">${tr("common.score")} <b id="d-score">0</b> · ${tr("duel.round")} <b id="d-round">0</b></div>
    <button class="record" id="d-rec">${tr("common.hold")}</button>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("d-chart");
  let lives = LIVES,
    score = 0,
    round = 0,
    over = false;
  drawFormantChart(chart, t, null);

  const teardown = holdToRecord(q("d-rec"), recorder, {
    onError: () => (q("d-fb").textContent = tr("common.micErrorShort")),
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
      if (v === "ы") {
        round += 1;
        const pts = scoreAttempt(t, result).overall;
        score += pts;
        q("d-fb").textContent = tr("duel.clean", { pts });
        q("d-fb").className = "status hit";
      } else if (v === "и" || v === "у") {
        // Only the named rivals cost a life.
        round += 1;
        lives -= 1;
        q("d-fb").textContent = tr("duel.rival", { v });
        q("d-fb").className = "status miss";
        q("d-lives").textContent = "♥".repeat(Math.max(0, lives)) + "·".repeat(LIVES - Math.max(0, lives));
        if (lives <= 0) {
          over = true;
          q("d-fb").textContent = tr("duel.over", { score });
        }
      } else {
        // Not ы, but not a rival either — no penalty, just try again.
        q("d-fb").textContent = v ? tr("duel.aim", { v }) : tr("duel.noVowel");
        q("d-fb").className = "status";
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
