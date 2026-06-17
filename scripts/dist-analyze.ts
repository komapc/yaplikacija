// Split each multi-take recording in samples/dist/ on its pauses and score each
// take through the Звук-mode path (analyzeBuffer + scoreAttempt against Ы), to
// see the per-category score/F2 distribution. Diagnostic only.
//
//   npx tsx scripts/dist-analyze.ts

import { readFileSync, readdirSync } from "node:fs";
import decode from "audio-decode";
import { analyzeBuffer } from "../src/dsp/analyze";
import { resampleTo } from "../src/dsp/resample";
import { TARGETS, scoreAttempt } from "../src/trainers/targets";

const FS = 16000;
const SRC = "samples/dist";
const GAP = 0.2; // s of silence that separates two takes

function stats(xs: number[]): { min: number; med: number; max: number; mean: number; sd: number } {
  const s = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  return { min: s[0], med: s[s.length >> 1], max: s[s.length - 1], mean, sd };
}

async function main(): Promise<void> {
  for (const file of readdirSync(SRC).filter((f) => /\.(ogg|wav|mp3|m4a|opus)$/i.test(f)).sort()) {
    const { channelData, sampleRate } = await decode(readFileSync(`${SRC}/${file}`));
    const samples = resampleTo(channelData[0], sampleRate, FS);
    const frames = analyzeBuffer(samples, FS).frames;

    // Group voiced frames into takes separated by silence gaps.
    const takes: { lo: number; hi: number }[] = [];
    let lo = -1;
    for (let i = 0; i < frames.length; i++) {
      if (lo < 0) lo = i;
      else if (frames[i].timeSec - frames[i - 1].timeSec > GAP) {
        takes.push({ lo, hi: i - 1 });
        lo = i;
      }
    }
    if (lo >= 0) takes.push({ lo, hi: frames.length - 1 });

    const f1s: number[] = [];
    const f2s: number[] = [];
    const scores: number[] = [];
    for (const t of takes) {
      if (t.hi - t.lo + 1 < 8) continue; // too short to be a held vowel
      const startS = frames[t.lo].timeSec;
      const endS = frames[t.hi].timeSec + 0.025;
      const sub = samples.slice(Math.floor(startS * FS), Math.ceil(endS * FS));
      const r = analyzeBuffer(sub, FS);
      if (r.frames.length < 3) continue;
      f1s.push(r.f1);
      f2s.push(r.f2);
      scores.push(scoreAttempt(TARGETS.yery, r).overall);
    }

    const f1S = stats(f1s);
    const fS = stats(f2s);
    const sS = stats(scores);
    const passGE60 = scores.filter((s) => s >= 60).length;
    const passGE70 = scores.filter((s) => s >= 70).length;
    console.log(
      `\n${file}  (${scores.length} takes)\n` +
        `  F1:    mean ${f1S.mean.toFixed(0)}  sd ${f1S.sd.toFixed(0)}  range ${f1S.min.toFixed(0)}–${f1S.max.toFixed(0)}\n` +
        `  F1s:    ${f1s.map((f) => f.toFixed(0)).join(" ")}\n` +
        `  F2:    mean ${fS.mean.toFixed(0)}  sd ${fS.sd.toFixed(0)}  range ${fS.min.toFixed(0)}–${fS.max.toFixed(0)}\n` +
        `  score: median ${sS.med}  range ${sS.min}–${sS.max}  | ≥60: ${passGE60}/${scores.length}  ≥70: ${passGE70}/${scores.length}\n` +
        `  scores: ${scores.join(" ")}\n` +
        `  F2s:    ${f2s.map((f) => f.toFixed(0)).join(" ")}`,
    );
  }
}

void main();
