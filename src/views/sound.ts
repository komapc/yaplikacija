// Звук — sustain an isolated Ы and hit its formant zone.

import type { Recorder } from "../audio/recorder";
import { analyzeBuffer } from "../dsp/analyze";
import { TARGETS, scoreAttempt } from "../trainers/targets";
import { drawFormantChart } from "../ui/formantChart";
import { holdToRecord } from "../ui/record";
import { createPlayer } from "../ui/play";
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
      <button class="record" id="s-rec">🎙️ hold &amp; speak</button>
      <button class="ghost" id="s-play" disabled>▶ play my attempt</button>
    </div>
    <p class="status" id="s-status">Hold the button and sustain the sound for about a second.</p>
    <div class="result" id="s-result" hidden>
      <div class="score-ring" id="s-ring"><span id="s-num">0</span></div>
      <div class="score-text"><div class="feedback" id="s-fb"></div><div class="formants" id="s-fm"></div></div>
    </div>
    <canvas class="chart" id="s-chart"></canvas>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const chart = q<HTMLCanvasElement>("s-chart");
  const player = createPlayer();
  let lastBlob: Blob | null = null;
  drawFormantChart(chart, t, null);

  q<HTMLButtonElement>("s-play").addEventListener("click", () => {
    if (lastBlob) player.play(URL.createObjectURL(lastBlob), true);
  });

  const teardown = holdToRecord(q("s-rec"), recorder, {
    onStart: () => (q("s-status").textContent = "Listening… keep it steady."),
    onError: () => (q("s-status").textContent = "Could not access the microphone."),
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
          ? `Your ${t.letter}: F1 ≈ ${Math.round(result.f1)} Hz, F2 ≈ ${Math.round(result.f2)} Hz`
          : "";
      q("s-status").textContent = "Try again to improve.";
      drawFormantChart(chart, t, result);
    },
  });

  const onResize = () => drawFormantChart(chart, t, null);
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
