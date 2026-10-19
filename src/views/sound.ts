// Звук — sustain an isolated Ы and hit its formant zone.

import type { Recorder } from "../audio/recorder";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt, toReferenceSpace } from "../trainers/targets";
import { scaleFromA, setSpeakerScale, isCalibrated } from "../trainers/speaker";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import { createPlayer } from "../ui/play";
import { t as tr } from "../i18n";
import type { View } from "./types";

export function createSound(recorder: Recorder): View {
  const t = TARGETS.yery;
  const el = document.createElement("div");
  el.innerHTML = `
    <section class="glyph-panel">
      <div class="glyph">${t.letter}</div>
      <div class="meta"><div class="ipa">${t.ipa}</div><div class="lang">${t.language}</div></div>
    </section>
    <p class="prompt">${t.prompt}</p>
    <p class="hint">${t.hint}</p>
    <div class="controls">
      <button class="record" id="s-rec">${tr("common.hold")}</button>
      <button class="ghost" id="s-play" disabled>${tr("common.play")}</button>
    </div>
    <p class="status" id="s-status">${tr("sound.status0")}</p>
    <div class="result" id="s-result" hidden>
      <div class="score-ring" id="s-ring"><span id="s-num">0</span></div>
      <div class="score-text"><div class="feedback" id="s-fb"></div><div class="formants" id="s-fm"></div></div>
    </div>
    <canvas class="chart" id="s-chart"></canvas>
    <details class="calib">
      <summary>${tr("calib.title")}</summary>
      <p class="hint">${tr("calib.help")}</p>
      <div class="controls">
        <button class="record" id="s-cal">${tr("calib.hold")}</button>
        <button class="ghost" id="s-cal-reset">${tr("calib.reset")}</button>
      </div>
      <p class="status" id="s-cal-status"></p>
    </details>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("s-chart");
  const player = createPlayer();
  let lastBlob: Blob | null = null;
  drawFormantChart(chart, t, null);

  q<HTMLButtonElement>("s-play").addEventListener("click", () => {
    if (lastBlob) player.play(URL.createObjectURL(lastBlob), true);
  });

  const teardown = holdToRecord(q("s-rec"), recorder, {
    onStart: () => (q("s-status").textContent = tr("sound.listening")),
    onError: () => (q("s-status").textContent = tr("common.micError")),
    onResult: ({ samples, sampleRate, blob }) => {
      lastBlob = blob;
      q<HTMLButtonElement>("s-play").disabled = false;
      const result = analyzeBuffer(samples, sampleRate);
      const score = scoreAttempt(t, result);
      q("s-result").hidden = false;
      q("s-num").textContent = String(score.overall);
      q("s-ring").style.setProperty("--pct", String(score.overall));
      q("s-fb").textContent = score.feedback;
      q("s-fm").textContent =
        result.frames.length > 0
          ? tr("common.yourVowel", { letter: t.letter, f1: Math.round(result.f1), f2: Math.round(result.f2) })
          : "";
      q("s-status").textContent = tr("sound.again");
      drawFormantChart(chart, t, toReferenceSpace(result));
    },
  });

  const calStatus = () =>
    (q("s-cal-status").textContent = isCalibrated() ? tr("calib.on") : tr("calib.off"));
  calStatus();
  q<HTMLButtonElement>("s-cal-reset").addEventListener("click", () => {
    setSpeakerScale(null);
    calStatus();
  });
  const teardownCal = holdToRecord(q("s-cal"), recorder, {
    onStart: () => (q("s-cal-status").textContent = tr("sound.listening")),
    onError: () => (q("s-cal-status").textContent = tr("common.micError")),
    onResult: ({ samples, sampleRate }) => {
      const r = analyzeBuffer(samples, sampleRate);
      const s = (r.sustainedFrames ?? 0) >= 15 ? scaleFromA(r.f1, r.f2) : null;
      if (s === null) q("s-cal-status").textContent = tr("calib.fail");
      else {
        setSpeakerScale(s);
        calStatus();
      }
    },
  });

  const onResize = () => drawFormantChart(chart, t, null);
  window.addEventListener("resize", onResize);
  return {
    element: el,
    destroy: () => {
      teardown();
      teardownCal();
      player.stop();
      window.removeEventListener("resize", onResize);
    },
  };
}
