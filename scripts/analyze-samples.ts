// Analyse the native reference recordings in samples/: measure F1/F2/F3 with
// our pipeline AND Praat over the same nucleus window, classify the vowel, and
// show what the Ы trainer would score each. Diagnostic only.
//
//   npx tsx scripts/analyze-samples.ts

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import decode from "audio-decode";
import { analyzeBuffer, findVowelNucleus } from "../src/dsp/analyze";
import { resampleTo } from "../src/dsp/resample";
import { TARGETS, scoreAttempt, adaptTarget } from "../src/trainers/targets";

const FS = 16000;
const SRC = "samples";
const DIR = "/tmp/analyze-samples";
const PRAAT = `${process.env.HOME}/.local/bin/praat_barren`;

function writeWav(path: string, s: Float32Array): void {
  const n = s.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(FS, 24); b.writeUInt32LE(FS * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE((Math.max(-1, Math.min(1, s[i])) * 32767) | 0, 44 + i * 2);
  writeFileSync(path, b);
}

/** Crude vowel classifier from F1/F2 (male-ish ranges, for labelling only). */
function classify(f1: number, f2: number): string {
  if (f1 > 600) return "а";
  if (f2 > 1850) return "и";
  if (f2 > 1300) return "ы";
  if (f1 > 430) return "о";
  return "у";
}

async function main(): Promise<void> {
  mkdirSync(DIR, { recursive: true });
  const files = readdirSync(SRC).filter((f) => /\.(ogg|wav|mp3|m4a|opus|flac)$/i.test(f)).sort();
  const rows: { file: string; f1: number; f2: number; f3: number; ratio: number; score: number; absScore: number; start: number; end: number }[] = [];
  const script: string[] = ['writeInfoLine: ""'];

  for (const file of files) {
    const { channelData, sampleRate } = await decode(readFileSync(`${SRC}/${file}`));
    const samples = resampleTo(channelData[0], sampleRate, FS);
    const wav = `${DIR}/${file}.wav`;
    writeWav(wav, samples);

    const { result, match } = (() => {
      const full = analyzeBuffer(samples, FS);
      const m = findVowelNucleus(full.frames);
      return { result: { f1: m.f1, f2: m.f2, f3: m.f3, voicedRatio: m.found ? 1 : 0, frames: m.frames }, match: m };
    })();
    const score = scoreAttempt(TARGETS.yery, result).overall;
    const absScore = scoreAttempt({ ...TARGETS.yery, f2f3: undefined }, result).overall; // absolute F2, no ratio
    rows.push({ file, f1: match.f1, f2: match.f2, f3: match.f3, ratio: match.f3 > 0 ? match.f2 / match.f3 : 0, score, absScore, start: match.startSec, end: match.endSec });

    script.push(
      `Read from file: "${wav}"`,
      `s = selected("Sound")`,
      `To Formant (burg): 0, 5, 5000, 0.025, 50`,
      `fo = selected("Formant")`,
      `f1 = Get mean: 1, ${match.startSec.toFixed(3)}, ${match.endSec.toFixed(3)}, "hertz"`,
      `f2 = Get mean: 2, ${match.startSec.toFixed(3)}, ${match.endSec.toFixed(3)}, "hertz"`,
      `f3 = Get mean: 3, ${match.startSec.toFixed(3)}, ${match.endSec.toFixed(3)}, "hertz"`,
      `appendInfoLine: "${file}|", f1, "|", f2, "|", f3`,
      `removeObject: s, fo`,
    );
  }

  writeFileSync(`${DIR}/s.praat`, script.join("\n") + "\n");
  const out = execFileSync(PRAAT, ["--run", `${DIR}/s.praat`], { encoding: "utf8" });
  const praat = new Map<string, [number, number, number]>();
  for (const line of out.split("\n")) {
    const [f, a, b, c] = line.split("|");
    if (f && c !== undefined) praat.set(f.trim(), [parseFloat(a), parseFloat(b), parseFloat(c)]);
  }

  console.log("\nfile               our F1/F2/F3      F2/F3  →vowel  Ы(ratio)  Ы(abs)   Praat F1/F2/F3");
  console.log("-----------------  ----------------  -----  ------  --------  ------   ----------------");
  for (const r of rows) {
    const p = praat.get(r.file) ?? [NaN, NaN, NaN];
    const vow = classify(r.f1, r.f2);
    console.log(
      `${r.file.padEnd(17)}  ${r.f1.toFixed(0).padStart(4)}/${r.f2.toFixed(0).padStart(4)}/${r.f3.toFixed(0).padStart(4)}     ${r.ratio.toFixed(2)}   ${vow.padEnd(4)}     ${String(r.score).padStart(3)}      ${String(r.absScore).padStart(3)}     ${p[0].toFixed(0)}/${p[1].toFixed(0)}/${p[2].toFixed(0)}`,
    );
  }
}

void main();
