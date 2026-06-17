// Validate F3 estimation (and the speaker-normalised F2/F3 ratio) against Praat,
// to decide whether scoring Ы on F2/F3 — instead of absolute F2 — is viable
// without per-user calibration. Read-only experiment; changes no app code.
//
//   npx tsx scripts/validate-f3.ts
//
// For each recording: decode → 16 kHz → reproduce analyzeBuffer's framing but
// KEEP F3 → locate the vowel nucleus → median F1/F2/F3 over it → ask Praat for
// its mean F1/F2/F3 over the same window. Reports ΔF3 and the F2/F3 ratio.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import decode from "audio-decode";
import { highpassFilter } from "../src/dsp/filter";
import { analyzeVoicing } from "../src/dsp/voicing";
import { estimateFormants } from "../src/dsp/lpc";
import { findVowelNucleus, type FrameResult } from "../src/dsp/analyze";
import { resampleTo } from "../src/dsp/resample";
import { YERY_EXERCISES } from "../src/trainers/exercises";

const FS = 16000;
const DIR = "/tmp/validate-f3";
const PRAAT = `${process.env.HOME}/.local/bin/praat_barren`;

interface EF extends FrameResult {
  f3: number;
}

function median(xs: number[]): number {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (v.length === 0) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Reproduce analyzeBuffer's framing, but keep F3. */
function framesWithF3(samples: Float32Array): EF[] {
  const filtered = highpassFilter(samples, FS);
  const frameSize = Math.round(0.025 * FS);
  const hop = Math.round(0.01 * FS);
  const out: EF[] = [];
  for (let start = 0; start + frameSize <= filtered.length; start += hop) {
    const frame = filtered.subarray(start, start + frameSize);
    const v = analyzeVoicing(frame, FS);
    if (!v.voiced) continue;
    const f = estimateFormants(frame, FS);
    if (f.length < 2) continue;
    const f1 = f[0].freq;
    const f2 = f[1].freq;
    if (f1 < 150 || f2 > 3500 || f2 <= f1) continue;
    out.push({ timeSec: start / FS, f0: v.f0, f1, f2, f3: f.length >= 3 ? f[2].freq : NaN, rms: v.rms });
  }
  return out;
}

function writeWav(path: string, samples: Float32Array): void {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(FS, 24); buf.writeUInt32LE(FS * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE((Math.max(-1, Math.min(1, samples[i])) * 32767) | 0, 44 + i * 2);
  writeFileSync(path, buf);
}

interface Row { id: string; f1: number; f2: number; f3: number; start: number; end: number }

async function main(): Promise<void> {
  mkdirSync(DIR, { recursive: true });
  const rows: Row[] = [];
  const scaledRows: { id: string; f2: number; f2s: number; ratio: number; ratioS: number }[] = [];
  const script: string[] = ['writeInfoLine: ""'];

  for (const ex of YERY_EXERCISES) {
    if (!ex.audioUrl) continue;
    const { channelData, sampleRate } = await decode(readFileSync(`public/${ex.audioUrl}`));
    const samples = resampleTo(channelData[0], sampleRate, FS);
    writeWav(`${DIR}/${ex.id}.wav`, samples);

    const frames = framesWithF3(samples);
    const m = findVowelNucleus(frames);
    if (!m.found) continue;
    const win = m.frames as EF[];
    const f2 = median(win.map((f) => f.f2));
    const f3 = median(win.map((f) => f.f3));

    // Simulate a ~18% shorter vocal tract (e.g. female vs male) by time-
    // compressing the signal, which scales all formants up together.
    const scaled = resampleTo(samples, FS, Math.round(FS / 1.18));
    const sm = findVowelNucleus(framesWithF3(scaled));
    const sWin = (sm.found ? sm.frames : []) as EF[];
    const f2s = median(sWin.map((f) => f.f2));
    const f3s = median(sWin.map((f) => f.f3));
    scaledRows.push({ id: ex.id, f2, f2s, ratio: f2 / f3, ratioS: f2s / f3s });

    rows.push({ id: ex.id, f1: median(win.map((f) => f.f1)), f2, f3, start: m.startSec, end: m.endSec });
    script.push(
      `Read from file: "${DIR}/${ex.id}.wav"`,
      `sound = selected("Sound")`,
      `To Formant (burg): 0, 5, 5000, 0.025, 50`,
      `formant = selected("Formant")`,
      `f3 = Get mean: 3, ${m.startSec.toFixed(3)}, ${m.endSec.toFixed(3)}, "hertz"`,
      `appendInfoLine: "${ex.id}|", f3`,
      `removeObject: sound, formant`,
    );
  }

  writeFileSync(`${DIR}/f3.praat`, script.join("\n") + "\n");
  const out = execFileSync(PRAAT, ["--run", `${DIR}/f3.praat`], { encoding: "utf8" });
  const praatF3 = new Map<string, number>();
  for (const line of out.split("\n")) {
    const [id, f3] = line.split("|");
    if (id && f3 !== undefined) praatF3.set(id.trim(), parseFloat(f3));
  }

  console.log("\nword     ourF2  ourF3  praatF3  ΔF3   F2/F3");
  console.log("-------  -----  -----  -------  ----  -----");
  const ratios: number[] = [];
  let sumD = 0;
  let cnt = 0;
  for (const r of rows) {
    const p = praatF3.get(r.id);
    const ratio = r.f2 / r.f3;
    ratios.push(ratio);
    const d = p && Number.isFinite(p) ? Math.abs(r.f3 - p) : NaN;
    if (Number.isFinite(d)) { sumD += d; cnt++; }
    console.log(
      `${r.id.padEnd(7)}  ${r.f2.toFixed(0).padStart(5)}  ${r.f3.toFixed(0).padStart(5)}  ${(p ?? NaN).toFixed(0).padStart(7)}  ${Number.isFinite(d) ? d.toFixed(0).padStart(4) : "  --"}  ${ratio.toFixed(3)}`,
    );
  }
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const sd = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / ratios.length);
  console.log("-------  -----  -----  -------  ----  -----");
  console.log(`mean |ΔF3| vs Praat: ${(sumD / cnt).toFixed(0)} Hz over ${cnt} words`);

  // Per-word: how much does a +18% tract shift move absolute F2 vs the F2/F3 ratio?
  console.log("\n--- simulated +18% shorter tract (same word, 'smaller speaker') ---");
  console.log("word     F2→F2'      (Δ%)   ratio→ratio'   (Δ%)");
  let absDrift = 0;
  let ratDrift = 0;
  for (const s of scaledRows) {
    const dAbs = (100 * (s.f2s - s.f2)) / s.f2;
    const dRat = (100 * (s.ratioS - s.ratio)) / s.ratio;
    absDrift += Math.abs(dAbs);
    ratDrift += Math.abs(dRat);
    console.log(
      `${s.id.padEnd(7)}  ${s.f2.toFixed(0)}→${s.f2s.toFixed(0)}  ${dAbs >= 0 ? "+" : ""}${dAbs.toFixed(1)}%   ${s.ratio.toFixed(3)}→${s.ratioS.toFixed(3)}   ${dRat >= 0 ? "+" : ""}${dRat.toFixed(1)}%`,
    );
  }
  console.log(`\nmean |drift|: absolute F2 ${(absDrift / scaledRows.length).toFixed(1)}%   vs   F2/F3 ratio ${(ratDrift / scaledRows.length).toFixed(1)}%`);
}

void main();
