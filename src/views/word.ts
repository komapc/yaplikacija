// Слова — say short words; the app scores the Ы inside, with native reference.

import type { Recorder } from "../audio/recorder";
import { analyzeWord } from "../dsp/analyze";
import { scoreAttempt } from "../trainers/targets";
import { YERY_EXERCISES, exerciseTarget } from "../trainers/exercises";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import { createPlayer } from "../ui/play";
import type { View } from "./types";

export function createWord(recorder: Recorder): View {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="word-nav">
      <button class="nav-arrow" id="w-prev" aria-label="Previous">‹</button>
      <div class="word-card">
        <div class="word-text" id="w-text"></div>
        <div class="word-meta"><span id="w-tr"></span> · <span id="w-ipa"></span> · <span id="w-gloss"></span></div>
      </div>
      <button class="nav-arrow" id="w-next" aria-label="Next">›</button>
    </div>
    <div class="word-controls">
      <button class="ghost" id="w-ref">▶ Reference</button>
      <span class="word-progress" id="w-prog"></span>
    </div>
    <p class="hint">Listen, then say the word — keep the «ы» steady.</p>
    <div class="controls">
      <button class="record" id="w-rec">🎙️ hold &amp; speak</button>
      <button class="ghost" id="w-play" disabled>▶ play my attempt</button>
    </div>
    <p class="status" id="w-status"></p>
    <div class="result" id="w-result" hidden>
      <div class="score-ring" id="w-ring"><span id="w-num">0</span></div>
      <div class="score-text"><div class="feedback" id="w-fb"></div><div class="formants" id="w-fm"></div></div>
    </div>
    <canvas class="chart" id="w-chart"></canvas>
    <p class="attribution" id="w-attr"></p>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("w-chart");
  const player = createPlayer();
  let idx = 0;
  let lastBlob: Blob | null = null;

  function select(i: number): void {
    idx = (i + YERY_EXERCISES.length) % YERY_EXERCISES.length;
    const ex = YERY_EXERCISES[idx];
    q("w-text").textContent = ex.text;
    q("w-tr").textContent = ex.translit;
    q("w-ipa").textContent = ex.ipa;
    q("w-gloss").textContent = ex.gloss;
    q("w-prog").textContent = `${idx + 1} / ${YERY_EXERCISES.length}`;
    q<HTMLButtonElement>("w-ref").disabled = ex.audioUrl === "";
    q("w-status").textContent = "Hold the button and say the whole word.";
    q("w-attr").textContent = ex.attribution ? `Reference: ${ex.attribution}` : "";
    q<HTMLButtonElement>("w-play").disabled = true;
    lastBlob = null;
    q("w-result").hidden = true;
    drawFormantChart(chart, exerciseTarget(ex), null);
  }

  q("w-prev").addEventListener("click", () => select(idx - 1));
  q("w-next").addEventListener("click", () => select(idx + 1));
  q("w-ref").addEventListener("click", () => {
    const ex = YERY_EXERCISES[idx];
    if (ex.audioUrl) player.play(import.meta.env.BASE_URL + ex.audioUrl);
  });
  q("w-play").addEventListener("click", () => {
    if (lastBlob) player.play(URL.createObjectURL(lastBlob), true);
  });

  const teardown = holdToRecord(q("w-rec"), recorder, {
    onStart: () => (q("w-status").textContent = "Listening… say the word."),
    onError: () => (q("w-status").textContent = "Could not access the microphone."),
    onResult: ({ samples, sampleRate, blob }) => {
      lastBlob = blob;
      q<HTMLButtonElement>("w-play").disabled = false;
      const target = exerciseTarget(YERY_EXERCISES[idx]);
      const { result, match } = analyzeWord(samples, sampleRate);
      const score = scoreAttempt(target, result);
      q("w-result").hidden = false;
      q("w-num").textContent = String(score.overall);
      q("w-ring").style.setProperty("--pct", String(score.overall));
      q("w-fb").textContent =
        !match.found || result.frames.length === 0
          ? "I could not find a clear «ы» — say it slowly and stretch the «ы»."
          : score.feedback;
      q("w-fm").textContent =
        result.frames.length > 0 ? `Your ы: F1 ≈ ${Math.round(result.f1)} Hz, F2 ≈ ${Math.round(result.f2)} Hz` : "";
      q("w-status").textContent = "Try again, or move on.";
      drawFormantChart(chart, target, result);
    },
  });

  select(0);
  const onResize = () => drawFormantChart(chart, exerciseTarget(YERY_EXERCISES[idx]), null);
  window.addEventListener("resize", onResize);
  return {
    element: el,
    destroy: () => {
      teardown();
      player.stop();
      window.removeEventListener("resize", onResize);
    },
  };
}
