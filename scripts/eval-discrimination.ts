// Minimal-pair discrimination eval: ы-words must PASS, и/other-words must FAIL
// the Ы scorer. Runs the full app pipeline at a configurable analysis rate.
//
//   npx tsx /tmp/.../eval.ts [fs=16000] [fs2=...]
//
// Files: scratchpad/eval-corpus/{y,i,other}_*.{ogg,wav} + repo corpus/*/ (all y).

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import decode from "audio-decode";
import { analyzeWord } from "../src/dsp/analyze";
import { resampleTo } from "../src/dsp/resample";
import { TARGETS, scoreAttempt } from "../src/trainers/targets";

const ROOT = "/home/mark/projects/yaplikacija";
const EVAL = "/home/mark/projects/yaplikacija/samples/eval-corpus";

interface Item { path: string; name: string; label: "y" | "i" | "other" }

function collectItems(): Item[] {
  const items: Item[] = [];
  for (const f of readdirSync(EVAL).sort()) {
    if (!/\.(ogg|wav)$/i.test(f)) continue;
    const label = f.startsWith("y_") ? "y" : f.startsWith("i_") ? "i" : "other";
    items.push({ path: join(EVAL, f), name: f.replace(/\.(ogg|wav)$/i, ""), label });
  }
  const corpusDir = join(ROOT, "corpus");
  for (const slug of readdirSync(corpusDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    for (const f of readdirSync(join(corpusDir, slug.name))) {
      if (!/\.(ogg|wav)$/i.test(f)) continue;
      items.push({ path: join(corpusDir, slug.name, f), name: `corpus/${slug.name}/${basename(f)}`, label: "y" });
    }
  }
  return items;
}

async function run(fs: number): Promise<void> {
  const items = collectItems();
  const rows: { name: string; label: string; f1: number; f2: number; frames: number; spread: number; score: number }[] = [];
  for (const it of items) {
    try {
      const decoded = await decode(readFileSync(it.path));
      // mixdown to mono
      const ch = decoded.channelData;
      const mono = new Float32Array(ch[0].length);
      for (let c = 0; c < ch.length; c++) for (let i = 0; i < mono.length; i++) mono[i] += ch[c][i] / ch.length;
      const samples = resampleTo(mono, decoded.sampleRate, fs);
      const { result, match } = analyzeWord(samples, fs);
      const score = scoreAttempt(TARGETS.yery, result).overall;
      rows.push({ name: it.name, label: it.label, f1: result.f1, f2: result.f2, frames: match.frames.length, spread: result.spread, score });
    } catch (e) {
      rows.push({ name: it.name, label: it.label, f1: 0, f2: 0, frames: 0, spread: 0, score: -1 });
    }
  }

  console.log(`\n=== analysis fs = ${fs} Hz (LPC order ${2 + Math.round(fs / 1000)}) ===`);
  console.log("label  file                                     F1    F2  frames spread score");
  for (const r of rows.sort((a, b) => a.label.localeCompare(b.label) || a.name.localeCompare(b.name))) {
    console.log(
      `${r.label.padEnd(6)} ${r.name.padEnd(38)} ${r.f1.toFixed(0).padStart(4)} ${r.f2.toFixed(0).padStart(5)}  ${String(r.frames).padStart(4)}  ${r.spread.toFixed(0).padStart(5)} ${String(r.score).padStart(5)}`,
    );
  }

  // Summary: threshold sweep + AUC (y vs non-y)
  const pos = rows.filter((r) => r.label === "y" && r.score >= 0).map((r) => r.score);
  const neg = rows.filter((r) => r.label !== "y" && r.score >= 0).map((r) => r.score);
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  const auc = wins / (pos.length * neg.length);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(`\npositives n=${pos.length} mean=${mean(pos).toFixed(1)}  negatives n=${neg.length} mean=${mean(neg).toFixed(1)}  AUC=${auc.toFixed(3)}`);
  for (const thr of [60, 65, 70, 75]) {
    const fr = pos.filter((p) => p < thr).length;
    const fa = neg.filter((n) => n >= thr).length;
    console.log(`  thr ${thr}: false-reject ${fr}/${pos.length}  false-accept ${fa}/${neg.length}`);
  }
}

async function main(): Promise<void> {
  const rates = process.argv.slice(2).map(Number).filter((x) => x > 0);
  for (const fs of rates.length ? rates : [16000]) await run(fs);
}
void main();
