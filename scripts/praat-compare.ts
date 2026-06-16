// Validate our formant tracker against Praat's Burg tracker on the same audio.
//
//   npm run praat:compare      (needs ~/.local/bin/praat_barren)
//
// For each exercise recording we: decode → resample to 16 kHz → write a WAV →
// run OUR analyzer (findVowelNucleus) to get F1/F2 + the nucleus time window,
// then ask Praat for its mean F1/F2 over the SAME window. Same segment, two
// algorithms — so the diff isolates the formant-estimation difference.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import decode from "audio-decode";
import { analyzeBuffer, findVowelNucleus } from "../src/dsp/analyze";
import { YERY_EXERCISES } from "../src/trainers/exercises";
import { lowpassCoeffs, applyBiquad } from "../src/dsp/filter";

const FS = 16000;
const DIR = "/tmp/praat-compare";
const PRAAT = `${process.env.HOME}/.local/bin/praat_barren`;

function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;
  let f = x;
  if (to < from) {
    const lp = lowpassCoeffs(from, to * 0.45);
    for (let p = 0; p < 3; p++) f = applyBiquad(f, lp);
  }
  const r = from / to;
  const n = Math.floor(f.length / r);
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * r;
    const i0 = Math.floor(pos);
    o[i] = f[i0] * (1 - (pos - i0)) + (f[i0 + 1] ?? f[i0]) * (pos - i0);
  }
  return o;
}

/** Minimal 16-bit PCM mono WAV writer. */
function writeWav(path: string, samples: Float32Array, fs: number): void {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(fs, 24);
  buf.writeUInt32LE(fs * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

interface Row {
  id: string;
  ourF1: number;
  ourF2: number;
  start: number;
  end: number;
}

async function main(): Promise<void> {
  mkdirSync(DIR, { recursive: true });
  const rows: Row[] = [];
  const script: string[] = ['writeInfoLine: ""'];

  for (const ex of YERY_EXERCISES) {
    if (!ex.audioUrl) continue;
    const { channelData, sampleRate } = await decode(readFileSync(`public/${ex.audioUrl}`));
    const samples = resample(channelData[0], sampleRate, FS);
    const wav = `${DIR}/${ex.id}.wav`;
    writeWav(wav, samples, FS);

    const m = findVowelNucleus(analyzeBuffer(samples, FS).frames);
    if (!m.found) continue;
    rows.push({ id: ex.id, ourF1: m.f1, ourF2: m.f2, start: m.startSec, end: m.endSec });

    // Praat: standard Burg settings (5 formants, 5000 Hz ceiling), mean over our window.
    script.push(
      `Read from file: "${wav}"`,
      `sound = selected("Sound")`,
      `To Formant (burg): 0, 5, 5000, 0.025, 50`,
      `formant = selected("Formant")`,
      `f1 = Get mean: 1, ${m.startSec.toFixed(3)}, ${m.endSec.toFixed(3)}, "hertz"`,
      `f2 = Get mean: 2, ${m.startSec.toFixed(3)}, ${m.endSec.toFixed(3)}, "hertz"`,
      `appendInfoLine: "${ex.id}|", f1, "|", f2`,
      `removeObject: sound, formant`,
    );
  }

  const scriptPath = `${DIR}/formants.praat`;
  writeFileSync(scriptPath, script.join("\n") + "\n");
  const out = execFileSync(PRAAT, ["--run", scriptPath], { encoding: "utf8" });

  const praat = new Map<string, { f1: number; f2: number }>();
  for (const line of out.split("\n")) {
    const [id, f1, f2] = line.split("|");
    if (id && f2 !== undefined) praat.set(id.trim(), { f1: parseFloat(f1), f2: parseFloat(f2) });
  }

  console.log("\nword     ours F1/F2     Praat F1/F2    ΔF1   ΔF2");
  console.log("-------  -------------  -------------  ----  ----");
  let sumD1 = 0;
  let sumD2 = 0;
  let count = 0;
  for (const r of rows) {
    const p = praat.get(r.id);
    if (!p || Number.isNaN(p.f2)) {
      console.log(`${r.id.padEnd(7)}  (Praat returned no formant)`);
      continue;
    }
    const d1 = Math.abs(r.ourF1 - p.f1);
    const d2 = Math.abs(r.ourF2 - p.f2);
    sumD1 += d1;
    sumD2 += d2;
    count++;
    console.log(
      `${r.id.padEnd(7)}  ${fmt(r.ourF1)}/${fmt(r.ourF2)}    ${fmt(p.f1)}/${fmt(p.f2)}    ${d1.toFixed(0).padStart(4)}  ${d2.toFixed(0).padStart(4)}`,
    );
  }
  console.log("-------  -------------  -------------  ----  ----");
  console.log(`mean abs diff over ${count} words:                    ${(sumD1 / count).toFixed(0).padStart(4)}  ${(sumD2 / count).toFixed(0).padStart(4)}  Hz`);
}

function fmt(v: number): string {
  return v.toFixed(0).padStart(4);
}

void main();
