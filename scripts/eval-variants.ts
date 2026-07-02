// Tracker-variant benchmark on the labelled eval corpus (samples/eval-corpus +
// corpus/). Positives are split into CLEAN (labial/velar/sibilant context — the
// audio really holds an [ɨ]) and FRONTED (coronal/palatal/soft-coda context —
// the native audio itself measures и-like, a target/pedagogy issue, so a
// tracker cannot and should not "fix" it). Tracker quality = clean-Ы vs non-Ы.
//
//   npx tsx scripts/eval-variants.ts

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync } from "node:child_process";
import decode from "audio-decode";
import { hammingWindow, preEmphasis, autocorrelate, lagWindow, levinsonDurbin, polynomialRoots, type Formant } from "../src/dsp/lpc";
import { analyzeVoicing } from "../src/dsp/voicing";
import { highpassFilter } from "../src/dsp/filter";
import { resampleTo } from "../src/dsp/resample";
import { findVowelNucleus, type FrameResult } from "../src/dsp/analyze";
import { TARGETS, scoreAttempt } from "../src/trainers/targets";

const ROOT = "/home/mark/projects/yaplikacija";
const EVAL = join(ROOT, "samples/eval-corpus");
const WORK = "/tmp/claude-1000/-home-mark-projects-yaplikacija/e907f6eb-7606-4f07-81b4-d8116d25d5b2/scratchpad/variants-work";
const PRAAT = `${process.env.HOME}/.local/bin/praat_barren`;
const FS = 16000;

// Clean-context Ы tokens: labial/velar/sibilant frame, hard coda — the audio
// genuinely holds [ɨ], so the tracker must accept them.
const CLEAN_Y = new Set([
  "y_пыл", "y_пыль_kerbush", "y_пыль_moocit", "y_мышка", "y_тыква_infovarius",
  "byk:commons", "byk:lingualibre-1", "my:commons", "mylo:commons", "mysh:commons",
  "syn:commons", "syn:lingualibre-1", "syr:commons", "syr:lingualibre-1", "vy:commons",
]);

// --- Burg method -------------------------------------------------------------
function burg(x: Float64Array, order: number): Float64Array | null {
  const n = x.length;
  if (n <= order) return null;
  const f = Float64Array.from(x);
  const b = Float64Array.from(x);
  const a = new Float64Array(order + 1);
  a[0] = 1;
  let e = 0;
  for (let i = 0; i < n; i++) e += 2 * x[i] * x[i];
  e -= x[0] * x[0] + x[n - 1] * x[n - 1];
  if (e === 0) return null;
  const prev = new Float64Array(order + 1);
  for (let m = 1; m <= order; m++) {
    let num = 0;
    for (let i = m; i < n; i++) num += f[i] * b[i - 1];
    const k = (-2 * num) / e;
    if (!Number.isFinite(k)) return null;
    prev.set(a);
    for (let j = 1; j <= m; j++) a[j] = prev[j] + k * prev[m - j];
    for (let i = n - 1; i >= m; i--) {
      const fi = f[i];
      f[i] = fi + k * b[i - 1];
      b[i] = b[i - 1] + k * fi;
    }
    e = e * (1 - k * k) - f[m] * f[m] - b[n - 1] * b[n - 1];
    if (e <= 0) break;
  }
  return a;
}

function rootsToFormants(a: Float64Array, sampleRate: number): Formant[] {
  const roots = polynomialRoots(a);
  const formants: Formant[] = [];
  for (const z of roots) {
    if (z.im <= 0) continue;
    const freq = (Math.atan2(z.im, z.re) * sampleRate) / (2 * Math.PI);
    const r2 = Math.hypot(z.re, z.im);
    const bandwidth = (Math.log(r2) * sampleRate) / Math.PI;
    if (freq > 90 && freq < sampleRate / 2 - 100 && bandwidth < 500) formants.push({ freq, bandwidth });
  }
  formants.sort((x, y) => x.freq - y.freq);
  return formants;
}

type Method = "acf" | "burg" | "consensus";

interface Opts {
  method: Method;
  lagB?: number | "f0"; // lag-window bandwidth for the acf path (default 50)
  frameSec?: number; // analysis frame length (default 0.025)
  slotRepair?: boolean; // reassign F2 when F1 split into a fake low pole
}

function lagBandwidth(opts: Opts, f0: number): number {
  if (opts.lagB === "f0") return f0 > 0 ? Math.max(50, 0.45 * f0) : 50;
  return opts.lagB ?? 50;
}

function estimateOne(frame: Float32Array, sampleRate: number, method: "acf" | "burg", bHz: number): Formant[] {
  const order = 2 + Math.round(sampleRate / 1000);
  const windowed = hammingWindow(preEmphasis(frame));
  if (method === "acf") {
    const r = lagWindow(autocorrelate(windowed, order), sampleRate, bHz);
    const a = levinsonDurbin(r, order);
    return a ? rootsToFormants(a, sampleRate) : [];
  }
  const a = burg(windowed, order);
  return a ? rootsToFormants(a, sampleRate) : [];
}

function estimate(frame: Float32Array, sampleRate: number, opts: Opts, f0: number): Formant[] {
  const bHz = lagBandwidth(opts, f0);
  if (opts.method !== "consensus") return estimateOne(frame, sampleRate, opts.method, bHz);
  const fa = estimateOne(frame, sampleRate, "acf", bHz);
  const fb = estimateOne(frame, sampleRate, "burg", bHz);
  if (fa.length < 2 || fb.length < 2) return [];
  if (Math.abs(fa[0].freq - fb[0].freq) > 150 || Math.abs(fa[1].freq - fb[1].freq) > 250) return [];
  return fb;
}

/** Pick (F1,F2,F3) from the sorted pole list. With slotRepair, detect the
 * "split F1" artifact — F1 and a fake pole packed close together low in the
 * spectrum while the real F2 sits clearly higher — and skip the fake pole. */
function pickSlots(fo: Formant[], repair: boolean): { f1: number; f2: number; f3: number; b1: number; b2: number } | null {
  if (fo.length < 2) return null;
  let i2 = 1;
  if (repair && fo.length >= 3) {
    const gap = fo[1].freq - fo[0].freq;
    if (gap < 550) {
      const cand = fo.find((p, idx) => idx >= 2 && p.freq >= 1400 && p.freq <= 3200 && p.bandwidth < 350);
      if (cand && fo[1].bandwidth > cand.bandwidth) i2 = fo.indexOf(cand);
    }
  }
  const f1 = fo[0].freq;
  const f2 = fo[i2].freq;
  const next = fo.find((p) => p.freq > f2 + 1);
  return { f1, f2, f3: next ? next.freq : 0, b1: fo[0].bandwidth, b2: fo[i2].bandwidth };
}

// --- frame loop (mirrors analyzeBuffer, with pluggable estimator) -------------
function frames(input: Float32Array, sampleRate: number, opts: Opts): FrameResult[] {
  const samples = highpassFilter(input, sampleRate);
  const frameSize = Math.round((opts.frameSec ?? 0.025) * sampleRate);
  const hop = Math.round(0.01 * sampleRate);
  const out: FrameResult[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    const frame = samples.subarray(start, start + frameSize);
    const v = analyzeVoicing(frame, sampleRate);
    if (!v.voiced) continue;
    const fo = estimate(frame, sampleRate, opts, v.f0);
    const slots = pickSlots(fo, opts.slotRepair ?? false);
    if (!slots) continue;
    const { f1, f2, b1, b2 } = slots;
    if (f1 < 150 || f2 > 3500 || f2 <= f1) continue;
    const f3 = slots.f3 > f2 && slots.f3 < 4500 ? slots.f3 : 0;
    out.push({ timeSec: start / sampleRate, f0: v.f0, f1, f2, f3, rms: v.rms, b1, b2 });
  }
  const med3 = (a: number, b: number, c: number) => {
    const v = [a, b, c].filter((x) => x > 0).sort((x, y) => x - y);
    return v.length === 3 ? v[1] : v.length === 2 ? (v[0] + v[1]) / 2 : (v[0] ?? 0);
  };
  if (out.length >= 3) {
    const f1s = out.map((f) => f.f1), f2s = out.map((f) => f.f2), f3s = out.map((f) => f.f3);
    for (let i = 1; i < out.length - 1; i++) {
      out[i].f1 = med3(f1s[i - 1], f1s[i], f1s[i + 1]);
      out[i].f2 = med3(f2s[i - 1], f2s[i], f2s[i + 1]);
      out[i].f3 = med3(f3s[i - 1], f3s[i], f3s[i + 1]);
    }
  }
  return out;
}

function writeWav(path: string, s: Float32Array, fs: number): void {
  const n = s.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(fs, 24); b.writeUInt32LE(fs * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE((Math.max(-1, Math.min(1, s[i])) * 32767) | 0, 44 + i * 2);
  writeFileSync(path, b);
}

interface Item { path: string; name: string; label: "y-clean" | "y-fronted" | "i" | "other" }

function collectItems(): Item[] {
  const items: Item[] = [];
  const yLabel = (name: string): Item["label"] => (CLEAN_Y.has(name) ? "y-clean" : "y-fronted");
  for (const f of readdirSync(EVAL).sort()) {
    if (!/\.(ogg|wav)$/i.test(f)) continue;
    const name = f.replace(/\.(ogg|wav)$/i, "");
    const label = f.startsWith("y_") ? yLabel(name) : f.startsWith("i_") ? "i" : "other";
    items.push({ path: join(EVAL, f), name, label });
  }
  const corpusDir = join(ROOT, "corpus");
  for (const slug of readdirSync(corpusDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    for (const f of readdirSync(join(corpusDir, slug.name))) {
      if (!/\.(ogg|wav)$/i.test(f)) continue;
      const name = `${slug.name}:${basename(f).replace(/\..*$/, "")}`;
      items.push({ path: join(corpusDir, slug.name, f), name, label: yLabel(name) });
    }
  }
  return items;
}

interface Variant extends Opts { name: string }
const VARIANTS: Variant[] = [
  { name: "acf (current)", method: "acf" },
  { name: "burg", method: "burg" },
  { name: "cons", method: "consensus" },
  { name: "acf-B100", method: "acf", lagB: 100 },
  { name: "acf-Bf0", method: "acf", lagB: "f0" },
  { name: "cons-Bf0", method: "consensus", lagB: "f0" },
  { name: "acf-f40", method: "acf", frameSec: 0.04 },
  { name: "burg-f40", method: "burg", frameSec: 0.04 },
  { name: "cons-Bf0-f40", method: "consensus", lagB: "f0", frameSec: 0.04 },
  { name: "burg-slot", method: "burg", slotRepair: true },
  { name: "cons-slot", method: "consensus", slotRepair: true },
  { name: "cons-Bf0-slot", method: "consensus", lagB: "f0", slotRepair: true },
];

interface Row { name: string; label: Item["label"]; f1: number; f2: number; n: number; score: number; start: number; end: number; wav: string }

function auc(pos: number[], neg: number[]): number {
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return pos.length && neg.length ? wins / (pos.length * neg.length) : NaN;
}

async function main(): Promise<void> {
  mkdirSync(WORK, { recursive: true });
  const items = collectItems();
  const audio = new Map<string, Float32Array>();
  for (const it of items) {
    const d = await decode(readFileSync(it.path));
    const ch = d.channelData;
    const mono = new Float32Array(ch[0].length);
    for (let c = 0; c < ch.length; c++) for (let i = 0; i < mono.length; i++) mono[i] += ch[c][i] / ch.length;
    const s = resampleTo(mono, d.sampleRate, FS);
    audio.set(it.name, s);
    writeWav(join(WORK, `${it.name.replace(/[^\w.-]+/g, "_")}.wav`), s, FS);
  }

  const perVariant = new Map<string, Row[]>();
  for (const v of VARIANTS) {
    const rows: Row[] = [];
    for (const it of items) {
      const s = audio.get(it.name)!;
      const fr = frames(s, FS, v);
      const m = findVowelNucleus(fr);
      const score = m.found
        ? scoreAttempt(TARGETS.yery, { f1: m.f1, f2: m.f2, f3: m.f3, voicedRatio: 1, spread: m.spread, frames: m.frames }).overall
        : 0;
      rows.push({ name: it.name, label: it.label, f1: m.f1, f2: m.f2, n: m.frames.length, score, start: m.startSec, end: m.endSec, wav: join(WORK, `${it.name.replace(/[^\w.-]+/g, "_")}.wav`) });
    }
    perVariant.set(v.name, rows);
  }

  // Praat ground truth per (file, window) — dedupe identical windows.
  const req = new Map<string, { wav: string; start: number; end: number }>();
  for (const rows of perVariant.values())
    for (const r of rows) {
      if (r.n === 0) continue;
      req.set(`${r.wav}|${r.start.toFixed(3)}|${r.end.toFixed(3)}`, { wav: r.wav, start: r.start, end: r.end });
    }
  const script: string[] = ['writeInfoLine: ""'];
  for (const [key, q] of req) {
    script.push(
      `Read from file: "${q.wav}"`,
      `s = selected("Sound")`,
      `To Formant (burg): 0, 5, 5000, 0.025, 50`,
      `fo = selected("Formant")`,
      `f1 = Get mean: 1, ${q.start.toFixed(3)}, ${(q.end + 0.025).toFixed(3)}, "hertz"`,
      `f2 = Get mean: 2, ${q.start.toFixed(3)}, ${(q.end + 0.025).toFixed(3)}, "hertz"`,
      `appendInfoLine: "${key}|", f1, "|", f2`,
      `removeObject: s, fo`,
    );
  }
  const praatOut = new Map<string, [number, number]>();
  writeFileSync(join(WORK, "gt.praat"), script.join("\n") + "\n");
  try {
    const out = execFileSync(PRAAT, ["--run", join(WORK, "gt.praat")], { encoding: "utf8", maxBuffer: 1 << 26 });
    for (const line of out.split("\n")) {
      const parts = line.split("|");
      if (parts.length === 5) praatOut.set(parts.slice(0, 3).join("|"), [parseFloat(parts[3]), parseFloat(parts[4])]);
    }
  } catch (e) {
    console.error("praat failed:", (e as Error).message.slice(0, 200));
  }

  console.log("variant          cleanAUC fullAUC  FA@60  cleanFR@60  clean-mean  neg-mean  |ΔF2| med");
  for (const v of VARIANTS) {
    const rows = perVariant.get(v.name)!;
    const clean = rows.filter((r) => r.label === "y-clean").map((r) => r.score);
    const posAll = rows.filter((r) => r.label.startsWith("y")).map((r) => r.score);
    const neg = rows.filter((r) => !r.label.startsWith("y")).map((r) => r.score);
    const d2: number[] = [];
    for (const r of rows) {
      const gt = praatOut.get(`${r.wav}|${r.start.toFixed(3)}|${r.end.toFixed(3)}`);
      if (gt && Number.isFinite(gt[1]) && r.f2 > 0) d2.push(Math.abs(r.f2 - gt[1]));
    }
    d2.sort((a, b) => a - b);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
    console.log(
      `${v.name.padEnd(16)} ${auc(clean, neg).toFixed(3).padStart(7)} ${auc(posAll, neg).toFixed(3).padStart(7)}  ${String(neg.filter((n) => n >= 60).length).padStart(3)}/${neg.length}  ${String(clean.filter((c) => c < 60).length).padStart(4)}/${clean.length}     ${mean(clean).toFixed(1).padStart(5)}      ${mean(neg).toFixed(1).padStart(5)}    ${(d2[d2.length >> 1] ?? NaN).toFixed(0).padStart(4)} Hz`,
    );
  }

  // Per-file table for chosen variants
  const SHOW = ["acf (current)", "burg"];
  console.log(`\nfile                              label      ${SHOW.map((s) => s.padEnd(17)).join("")}Praat F2 (win of ${SHOW[1]})`);
  const [va, vb] = SHOW.map((s) => perVariant.get(s)!);
  for (let i = 0; i < va.length; i++) {
    const r = va[i], b = vb[i];
    const gt = praatOut.get(`${b.wav}|${b.start.toFixed(3)}|${b.end.toFixed(3)}`);
    console.log(
      `${r.name.padEnd(34)} ${r.label.padEnd(9)} ${r.f2.toFixed(0).padStart(5)}/${String(r.score).padStart(3)}         ${b.f2.toFixed(0).padStart(5)}/${String(b.score).padStart(3)}          ${gt ? gt[1].toFixed(0) : "—"}`,
    );
  }
}

void main();
