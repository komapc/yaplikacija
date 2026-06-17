// Corpus calibration (run in Node): download native Russian word recordings
// from Wikimedia Commons, decode + resample to 16 kHz, measure the Ы formants
// with the SAME DSP the app uses to grade learners, and write
// src/trainers/exercise-targets.generated.ts (per-word target + bundled audio).
//
//   npm run calibrate
//
// Audio is bundled as-is (.ogg, played natively by browsers); no ffmpeg needed.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import decode from "audio-decode";
import { YERY_EXERCISES } from "../src/trainers/exercises";
import { TARGETS } from "../src/trainers/targets";
import { analyzeBuffer, findVowelNucleus } from "../src/dsp/analyze";
import { resampleTo } from "../src/dsp/resample";
import { praatFormants, hasPraat } from "./praat";

const ANALYSIS_RATE = 16000;
const PUBLIC_DIR = "public/audio/exercises";
const OUT = "src/trainers/exercise-targets.generated.ts";

// Plausible Ы envelope. A single native recording + window search occasionally
// locks onto a formant transition (yielding an [i]-like F2); such outliers fall
// back to the safe global Ы target rather than mis-teaching the learner.
const PLAUSIBLE_F1 = [230, 480] as const;
const PLAUSIBLE_F2 = [1250, 1800] as const;
// Reliability gate (see docs/native-validation.md): trustworthy measurements have
// many steady voiced frames; garbage tokens are short and/or jittery. These
// reject the short coronal/palatal-onset tokens whose Ы fronts toward [i].
const MIN_NUCLEUS_FRAMES = 8;
const MIN_NUCLEUS_FRAMES_PRAAT = 5; // shorter is OK when Praat strongly corroborates
const MAX_F2_SPREAD = 200; // Hz; F2 stdev over the nucleus window
const PRAAT_TOLERANCE = 200; // Hz; max |ours − Praat| F2 to accept when Praat is present
const PRAAT_STRONG = 100; // Hz; tight agreement that vouches for a short nucleus
const SEED = { f1: TARGETS.yery.f1.center, f2: TARGETS.yery.f2.center };
const SEED_RATIO = TARGETS.yery.f2f3 ?? 0.6;
const inRange = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;
const UA = "yaplikacija-calibration/0.1 (https://github.com/komapc/yaplikacija; educational)";

interface Calibrated {
  f1: number;
  f2: number;
  f3: number;
  ratio: number; // F2/F3
  attribution: string;
  audio: string;
}

async function fetchCommons(path: string): Promise<Response> {
  return fetch(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(path)}`, {
    headers: { "User-Agent": UA },
  });
}

async function fetchAttribution(word: string): Promise<string> {
  const title = `File:Ru-${word}.ogg`;
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo` +
    `&iiprop=extmetadata&titles=${encodeURIComponent(title)}`;
  try {
    const data = (await (await fetch(api, { headers: { "User-Agent": UA } })).json()) as any;
    const page = Object.values(data.query.pages)[0] as any;
    const md = page?.imageinfo?.[0]?.extmetadata ?? {};
    const license = md.LicenseShortName?.value ?? "see file page";
    const artist = String(md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim() || "Wikimedia Commons";
    return `${artist} / ${license} — ${title}, Wikimedia Commons`;
  } catch {
    return `${title}, Wikimedia Commons`;
  }
}

async function main(): Promise<void> {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const results: Record<string, Calibrated> = {};

  for (const ex of YERY_EXERCISES) {
    await new Promise((r) => setTimeout(r, 500)); // be polite to Commons (avoid 429)
    const res = await fetchCommons(`Ru-${ex.text}.ogg`);
    if (!res.ok) {
      console.log(`SKIP ${ex.id} (${ex.text}) — no Commons recording (${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(PUBLIC_DIR, `${ex.id}.ogg`), buf); // bundle for in-app playback

    const { channelData, sampleRate } = await decode(buf);
    const samples = resampleTo(channelData[0], sampleRate, ANALYSIS_RATE);

    const full = analyzeBuffer(samples, ANALYSIS_RATE);
    const match = findVowelNucleus(full.frames); // same segmentation the learner is graded with
    if (!match.found) {
      console.log(`WARN ${ex.id} (${ex.text}) — no Ы nucleus found, keeping seed target`);
      continue;
    }

    const f1 = Math.round(match.f1);
    const f2 = Math.round(match.f2);
    const f3 = Math.round(match.f3);
    const ratio = f3 > 0 ? +(f2 / f3).toFixed(3) : SEED_RATIO;

    // Reliability gate: only adopt a measured target if the nucleus is steady,
    // in the plausible Ы envelope, and either long enough OR (when Praat is
    // installed) tightly corroborated by Praat on a still-usable window.
    // Otherwise fall back to the safe global Ы seed.
    const steady = match.spread <= MAX_F2_SPREAD;
    const plausible = inRange(f1, PLAUSIBLE_F1) && inRange(f2, PLAUSIBLE_F2);
    const praat = praatFormants(samples, ANALYSIS_RATE, match.startSec, match.endSec);
    const praatOk = !praat || Math.abs(f2 - praat.f2) <= PRAAT_TOLERANCE;
    const praatStrong = praat !== null && Math.abs(f2 - praat.f2) <= PRAAT_STRONG;
    const enoughFrames =
      match.frames.length >= MIN_NUCLEUS_FRAMES ||
      (praatStrong && match.frames.length >= MIN_NUCLEUS_FRAMES_PRAAT);
    const accept = enoughFrames && steady && plausible && praatOk;

    results[ex.id] = {
      f1: accept ? f1 : SEED.f1,
      f2: accept ? f2 : SEED.f2,
      f3,
      ratio: accept && f3 > 0 ? ratio : SEED_RATIO,
      attribution: await fetchAttribution(ex.text),
      audio: `audio/exercises/${ex.id}.ogg`, // always keep the native reference
    };
    const why = [
      enoughFrames ? "" : `frames ${match.frames.length}<${MIN_NUCLEUS_FRAMES}`,
      steady ? "" : `spread ${match.spread.toFixed(0)}>${MAX_F2_SPREAD}`,
      plausible ? "" : `F1/F2 ${f1}/${f2} out of range`,
      praatOk ? "" : `Praat Δ${Math.abs(f2 - (praat?.f2 ?? 0)).toFixed(0)}`,
    ].filter(Boolean).join(", ");
    const praatNote = praat ? ` [Praat F2 ${praat.f2.toFixed(0)}]` : "";
    console.log(
      accept
        ? `OK    ${ex.id} (${ex.text}): F1 ${f1}  F2 ${f2}  F3 ${f3}  spread ${match.spread.toFixed(0)}  fr ${match.frames.length}${praatNote}`
        : `SEED  ${ex.id} (${ex.text}): ${why} → seed${praatNote}`,
    );
  }

  const body =
    `// AUTO-GENERATED by scripts/calibrate-exercises.ts — do not edit by hand.\n` +
    `export interface CalibratedTarget {\n  f1: number;\n  f2: number;\n  f3: number;\n  ratio: number;\n  attribution: string;\n  audio: string;\n}\n` +
    `export const CALIBRATED: Record<string, CalibratedTarget> = ${JSON.stringify(results, null, 2)};\n`;
  writeFileSync(OUT, body);
  console.log(`\nWrote ${OUT} with ${Object.keys(results).length} calibrated word(s).`);
}

void main();
