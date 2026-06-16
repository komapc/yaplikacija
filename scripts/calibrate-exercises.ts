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
import { analyzeBuffer, findBestWindow } from "../src/dsp/analyze";
import { lowpassCoeffs, applyBiquad } from "../src/dsp/filter";

const ANALYSIS_RATE = 16000;
const PUBLIC_DIR = "public/audio/exercises";
const OUT = "src/trainers/exercise-targets.generated.ts";

// Plausible Ы envelope. A single native recording + window search occasionally
// locks onto a formant transition (yielding an [i]-like F2); such outliers fall
// back to the safe global Ы target rather than mis-teaching the learner.
const PLAUSIBLE_F1 = [230, 480] as const;
const PLAUSIBLE_F2 = [1250, 1800] as const;
const SEED = { f1: TARGETS.yery.f1.center, f2: TARGETS.yery.f2.center };
const inRange = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;
const UA = "yaplikacija-calibration/0.1 (https://github.com/komapc/yaplikacija; educational)";

interface Calibrated {
  f1: number;
  f2: number;
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

/**
 * Anti-aliased downsampler. Native recordings are 44.1/48 kHz; decimating to
 * 16 kHz without filtering folds 8 kHz–Nyquist energy back into the formant
 * band (aliasing), which corrupts the LPC formant estimates — most severely at
 * the exact 48k→16k ratio of 3, where linear interpolation degenerates to naked
 * decimation. We low-pass below the 8 kHz target Nyquist first (cascaded
 * Butterworth sections for a steep roll-off), then interpolate. This mirrors the
 * anti-aliasing the browser's OfflineAudioContext does in the live app.
 */
function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;

  let filtered = x;
  if (to < from) {
    const lp = lowpassCoeffs(from, to * 0.45); // ~7.2 kHz for a 16 kHz target
    for (let pass = 0; pass < 3; pass++) filtered = applyBiquad(filtered, lp);
  }

  const ratio = from / to;
  const n = Math.floor(filtered.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    out[i] = filtered[i0] * (1 - (pos - i0)) + (filtered[i0 + 1] ?? filtered[i0]) * (pos - i0);
  }
  return out;
}

async function main(): Promise<void> {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const results: Record<string, Calibrated> = {};

  for (const ex of YERY_EXERCISES) {
    const res = await fetchCommons(`Ru-${ex.text}.ogg`);
    if (!res.ok) {
      console.log(`SKIP ${ex.id} (${ex.text}) — no Commons recording (${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(PUBLIC_DIR, `${ex.id}.ogg`), buf); // bundle for in-app playback

    const { channelData, sampleRate } = await decode(buf);
    const samples = resample(channelData[0], sampleRate, ANALYSIS_RATE);

    const full = analyzeBuffer(samples, ANALYSIS_RATE);
    const match = findBestWindow(full.frames, TARGETS.yery);
    if (!match.found) {
      console.log(`WARN ${ex.id} (${ex.text}) — no Ы window found, keeping seed target`);
      continue;
    }

    const f1 = Math.round(match.f1);
    const f2 = Math.round(match.f2);
    const plausible = inRange(f1, PLAUSIBLE_F1) && inRange(f2, PLAUSIBLE_F2);

    results[ex.id] = {
      f1: plausible ? f1 : SEED.f1,
      f2: plausible ? f2 : SEED.f2,
      attribution: await fetchAttribution(ex.text),
      audio: `audio/exercises/${ex.id}.ogg`, // always keep the native reference
    };
    console.log(
      plausible
        ? `OK    ${ex.id} (${ex.text}): F1 ${f1}  F2 ${f2}`
        : `CLAMP ${ex.id} (${ex.text}): measured F1 ${f1} F2 ${f2} out of range → seed target`,
    );
  }

  const body =
    `// AUTO-GENERATED by scripts/calibrate-exercises.ts — do not edit by hand.\n` +
    `export interface CalibratedTarget {\n  f1: number;\n  f2: number;\n  attribution: string;\n  audio: string;\n}\n` +
    `export const CALIBRATED: Record<string, CalibratedTarget> = ${JSON.stringify(results, null, 2)};\n`;
  writeFileSync(OUT, body);
  console.log(`\nWrote ${OUT} with ${Object.keys(results).length} calibrated word(s).`);
}

void main();
