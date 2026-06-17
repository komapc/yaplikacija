// High-level analysis: turn a buffer of mono PCM into robust (F1, F2, F3)
// estimates by analysing voiced frames and taking medians over a steady region.

import { estimateFormants } from "./lpc";
import { analyzeVoicing } from "./voicing";
import { highpassFilter } from "./filter";

export interface FrameResult {
  timeSec: number;
  f0: number;
  f1: number;
  f2: number;
  f3: number; // 0 when no plausible third formant was found
  rms: number;
}

export interface AnalysisResult {
  /** Median formants over the voiced steady portion. */
  f1: number;
  f2: number;
  f3: number; // 0 when unavailable
  /** Fraction of frames that yielded a usable voiced formant pair — a proxy for
   * "did they sustain it". */
  voicedRatio: number;
  frames: FrameResult[];
}

export function analyzeBuffer(input: Float32Array, sampleRate: number): AnalysisResult {
  // Noise filter: strip DC, rumble and mains hum below the formant range.
  const samples = highpassFilter(input, sampleRate);

  const frameSize = Math.round(0.025 * sampleRate); // 25 ms
  const hop = Math.round(0.010 * sampleRate); // 10 ms
  const frames: FrameResult[] = [];
  const f1s: number[] = [];
  const f2s: number[] = [];
  const f3s: number[] = [];
  let voicedCount = 0;
  let total = 0;

  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    total++;
    const frame = samples.subarray(start, start + frameSize);
    const v = analyzeVoicing(frame, sampleRate);
    if (!v.voiced) continue;

    const formants = estimateFormants(frame, sampleRate);
    if (formants.length < 2) continue;
    const f1 = formants[0].freq;
    const f2 = formants[1].freq;
    // Reject implausible formant pairs (noise / unstable LPC on consonantal or
    // nasal frames): F1 too low, F2 above the human range, or F2 not above F1.
    if (f1 < 150 || f2 > 3500 || f2 <= f1) continue;
    // F3 (used for speaker-normalised F2/F3 scoring); 0 when not plausibly found.
    const f3cand = formants.length >= 3 ? formants[2].freq : 0;
    const f3 = f3cand > f2 && f3cand < 4500 ? f3cand : 0;

    voicedCount++;
    frames.push({ timeSec: start / sampleRate, f0: v.f0, f1, f2, f3, rms: v.rms });
    f1s.push(f1);
    f2s.push(f2);
    if (f3 > 0) f3s.push(f3);
  }

  return {
    f1: median(f1s),
    f2: median(f2s),
    f3: median(f3s),
    voicedRatio: total === 0 ? 0 : voicedCount / total,
    frames,
  };
}

/** Median of the positive, finite values (0/NaN are treated as "missing"). */
function median(xs: number[]): number {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (v.length === 0) return 0;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

// --- word-level analysis ---------------------------------------------------

const FRAME_HOP_SEC = 0.01; // matches the 10 ms hop used above
const MAX_FRAME_GAP_SEC = 0.025; // a larger gap means we crossed an unvoiced segment

export interface WindowMatch {
  f1: number;
  f2: number;
  f3: number;
  frames: FrameResult[];
  startSec: number;
  endSec: number;
  found: boolean;
}

function windowResult(frames: FrameResult[], s: number, e: number): WindowMatch {
  const win = frames.slice(s, e + 1);
  return {
    f1: median(win.map((f) => f.f1)),
    f2: median(win.map((f) => f.f2)),
    f3: median(win.map((f) => f.f3)),
    frames: win,
    startSec: win[0].timeSec,
    endSec: win[win.length - 1].timeSec,
    found: true,
  };
}

/**
 * Locate the VOWEL NUCLEUS — the sustained voiced region that is both loud and
 * spectrally STEADY — WITHOUT reference to any target. Target-independent so it
 * can't cherry-pick a transient that merely sweeps past the target. Among the
 * loud contiguous runs we pick the one that best resembles a held vowel (long ×
 * low F2 spread), then trim the consonant transitions off its edges. In every
 * exercise word the stressed vowel is the loudest steady region, so this finds
 * it; scoring then judges it fairly.
 */
export function findVowelNucleus(frames: FrameResult[], minDurationSec = 0.05): WindowMatch {
  const empty: WindowMatch = { f1: 0, f2: 0, f3: 0, frames: [], startSec: 0, endSec: 0, found: false };
  const minFrames = Math.max(3, Math.round(minDurationSec / FRAME_HOP_SEC));
  if (frames.length < minFrames) return empty;

  let peak = 0;
  for (const f of frames) peak = Math.max(peak, f.rms);
  if (peak === 0) return empty;
  const threshold = 0.5 * peak;

  // Collect contiguous "loud" runs (>= minFrames long).
  const runs: { lo: number; hi: number }[] = [];
  let runLo = -1;
  for (let i = 0; i <= frames.length; i++) {
    const loud = i < frames.length && frames[i].rms >= threshold;
    const contiguous =
      i > 0 && i < frames.length && frames[i].timeSec - frames[i - 1].timeSec <= FRAME_HOP_SEC + MAX_FRAME_GAP_SEC;
    if (loud && (runLo < 0 || contiguous)) {
      if (runLo < 0) runLo = i;
    } else {
      if (runLo >= 0 && i - runLo >= minFrames) runs.push({ lo: runLo, hi: i - 1 });
      runLo = loud ? i : -1;
    }
  }
  if (runs.length === 0) return empty;

  // Prefer the run that best resembles a held vowel: long and spectrally steady.
  let best = runs[0];
  let bestScore = -Infinity;
  for (const r of runs) {
    const f2s: number[] = [];
    for (let k = r.lo; k <= r.hi; k++) f2s.push(frames[k].f2);
    const score = (r.hi - r.lo + 1) / (1 + stdev(f2s) / 150);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  // Trim ~20% off each end (the consonant→vowel transitions), keeping >= minFrames.
  const len = best.hi - best.lo + 1;
  const trim = Math.max(0, Math.min(Math.floor(len * 0.2), Math.floor((len - minFrames) / 2)));
  return windowResult(frames, best.lo + trim, best.hi - trim);
}

/**
 * Analyse a recorded WORD: frame analysis, then score the (target-independent)
 * vowel nucleus. Returns an `AnalysisResult` shaped like `analyzeBuffer` plus
 * the raw `match`. The gate is whether a nucleus was found (not the
 * whole-recording voiced ratio, which silence around a short word drags down).
 */
export function analyzeWord(
  samples: Float32Array,
  sampleRate: number,
): { result: AnalysisResult; match: WindowMatch } {
  const full = analyzeBuffer(samples, sampleRate);
  const match = findVowelNucleus(full.frames);
  const result: AnalysisResult = {
    f1: match.f1,
    f2: match.f2,
    f3: match.f3,
    voicedRatio: match.found ? 1 : 0,
    frames: match.found ? match.frames : [],
  };
  return { result, match };
}
