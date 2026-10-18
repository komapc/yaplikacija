// Слова — say short words; the app scores the Ы inside, with native reference.

import type { Recorder } from "../audio/recorder";
import { analyzeWord } from "../dsp/analyze";
import { scoreAttempt } from "../trainers/targets";
import { YERY_EXERCISES, exerciseTarget } from "../trainers/exercises";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import { createPlayer } from "../ui/play";
import { drawWaveform } from "../ui/waveform";
import { getBest, recordScore } from "../progress";
import { getLang, t as tr } from "../i18n";
import type { View } from "./types";

export function createWord(recorder: Recorder): View {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="word-nav">
      <button class="nav-arrow" id="w-prev" aria-label="${tr("word.prev")}">‹</button>
      <div class="word-card">
        <div class="word-text" id="w-text"></div>
        <div class="word-meta"><span id="w-tr"></span> · <span id="w-ipa"></span> · <span id="w-gloss"></span></div>
      </div>
      <button class="nav-arrow" id="w-next" aria-label="${tr("word.next")}">›</button>
    </div>
    <div class="word-controls">
      <button class="ghost" id="w-ref">${tr("word.ref")}</button>
      <span class="word-progress" id="w-prog"></span>
      <span class="word-best" id="w-best"></span>
    </div>
    <p class="hint">${tr("word.hint")}</p>
    <div class="controls">
      <button class="record" id="w-rec">${tr("common.hold")}</button>
      <button class="ghost" id="w-play" disabled>${tr("common.play")}</button>
    </div>
    <p class="status" id="w-status"></p>
    <div class="result" id="w-result" hidden>
      <div class="score-ring" id="w-ring"><span id="w-num">0</span></div>
      <div class="score-text"><div class="feedback" id="w-fb"></div><div class="formants" id="w-fm"></div></div>
    </div>
    <canvas class="chart" id="w-chart"></canvas>
    <div class="wave-cap" id="w-wave-cap" hidden>${tr("word.scored")}</div>
    <canvas class="wave" id="w-wave" hidden></canvas>
    <p class="attribution" id="w-attr"></p>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("w-chart");
  const wave = q<HTMLCanvasElement>("w-wave");
  let take: { samples: Float32Array; rate: number; region: { startSec: number; endSec: number } | null } | null = null;
  const showBest = () => {
    const b = getBest(YERY_EXERCISES[idx].id);
    q("w-best").textContent = b === null ? "" : "★ " + tr("word.best", { n: b });
  };
  const drawWave = () => take && drawWaveform(wave, take.samples, take.rate, take.region);
  const player = createPlayer();
  let idx = 0;
  let lastBlob: Blob | null = null;

  function select(i: number): void {
    idx = (i + YERY_EXERCISES.length) % YERY_EXERCISES.length;
    const ex = YERY_EXERCISES[idx];
    q("w-text").textContent = ex.text;
    q("w-tr").textContent = ex.translit;
    q("w-ipa").textContent = ex.ipa;
    q("w-gloss").textContent = getLang() === "en" ? ex.gloss : ""; // glosses are English; the word is Russian already
    q("w-prog").textContent = `${idx + 1} / ${YERY_EXERCISES.length}`;
    q<HTMLButtonElement>("w-ref").disabled = ex.audioUrl === "";
    q("w-status").textContent = tr("word.status0");
    q("w-attr").textContent = ex.attribution ? tr("word.reference", { a: ex.attribution }) : "";
    q<HTMLButtonElement>("w-play").disabled = true;
    lastBlob = null;
    take = null;
    q("w-result").hidden = true;
    q("w-wave").hidden = true;
    q("w-wave-cap").hidden = true;
    showBest();
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
    onStart: () => (q("w-status").textContent = tr("word.listening")),
    onError: () => (q("w-status").textContent = tr("common.micError")),
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
          ? tr("word.noNucleus")
          : score.feedback;
      q("w-fm").textContent =
        result.frames.length > 0 ? tr("common.yourVowel", { letter: "ы", f1: Math.round(result.f1), f2: Math.round(result.f2) }) : "";
      const ex = YERY_EXERCISES[idx];
      if (match.found && result.frames.length > 0) {
        const { best, improved } = recordScore(ex.id, score.overall);
        showBest();
        q("w-status").textContent = improved && score.overall > 0 ? tr("word.newBest", { n: best }) : tr("word.again");
      } else {
        q("w-status").textContent = tr("word.again");
      }
      take = { samples, rate: sampleRate, region: match.found ? match : null };
      q("w-wave").hidden = false;
      q("w-wave-cap").hidden = false;
      drawWave();
      drawFormantChart(chart, target, result);
    },
  });

  select(0);
  const onResize = () => {
    drawFormantChart(chart, exerciseTarget(YERY_EXERCISES[idx]), null);
    drawWave();
  };
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
