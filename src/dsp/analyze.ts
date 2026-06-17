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
  b1?: number; // F1 bandwidth (Hz) — narrow poles are more reliable
  b2?: number; // F2 bandwidth (Hz)
}

export interface AnalysisResult {
  /** Confidence-weighted center over the voiced steady portion. */
  f1: number;
  f2: number;
  f3: number; // 0 when unavailable
  /** Fraction of frames that yielded a usable voiced formant pair — a proxy for
   * "did they sustain it". */
  voicedRatio: number;
  /** F2 standard deviation over the steady portion (Hz) — how steadily the vowel
   * was held; high means the sound wandered (a glide or an unstable attempt). */
  spread: number;
  frames: FrameResult[];
}

export function analyzeBuffer(input: Float32Array, sampleRate: number): AnalysisResult {
  // Noise filter: strip DC, rumble and mains hum below the formant range.
  const samples = highpassFilter(input, sampleRate);

  const frameSize = Math.round(0.025 * sampleRate); // 25 ms
  const hop = Math.round(0.010 * sampleRate); // 10 ms
  const frames: FrameResult[] = [];
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
    const f3cand = formants.length >= 3 ? formants[2].freq : 0;
    const f3 = f3cand > f2 && f3cand < 4500 ? f3cand : 0;

    voicedCount++;
    frames.push({
      timeSec: start / sampleRate,
      f0: v.f0,
      f1,
      f2,
      f3,
      rms: v.rms,
      b1: formants[0].bandwidth,
      b2: formants[1].bandwidth,
    });
  }

  // Continuity smoothing: a 3-point median filter on each formant trajectory
  // removes single-frame LPC outliers (the bimodal F2 jumps seen on back vowels,
  // e.g. [u] reading 570 one frame and 2200 the next) before any aggregation.
  smoothFrames(frames);

  // Median over the STEADY middle of the hold (drop the onset/offset glides),
  // which is what sound mode scores. Edges can pull a whole-buffer median far
  // off the held vowel — a source of inconsistent scores.
  const steady = steadyMiddle(frames);
  return {
    // Confidence-weighted center: each frame counts by its loudness and the
    // narrowness of its LPC pole (a wide bandwidth signals an unreliable / merged
    // formant), so jittery low-confidence frames pull the estimate less.
    f1: confidentCenter(steady, (f) => f.f1, (f) => f.b1),
    f2: confidentCenter(steady, (f) => f.f2, (f) => f.b2),
    f3: median(steady.map((f) => f.f3)),
    voicedRatio: total === 0 ? 0 : voicedCount / total,
    spread: stdev(steady.map((f) => f.f2)),
    frames,
  };
}

/** Per-frame reliability weight: louder and narrower-band ⇒ more trustworthy. */
function frameWeight(rms: number, bandwidth: number | undefined): number {
  return rms / (1 + (bandwidth ?? 120) / 120);
}

/** Weighted median of the frames' value, weighting by frameWeight. Median (not
 * mean) keeps it robust to the occasional wild outlier; the weights demote
 * low-confidence frames. */
function confidentCenter(
  frames: FrameResult[],
  value: (f: FrameResult) => number,
  bandwidth: (f: FrameResult) => number | undefined,
): number {
  const items = frames
    .map((f) => ({ v: value(f), w: frameWeight(f.rms, bandwidth(f)) }))
    .filter((x) => Number.isFinite(x.v) && x.v > 0 && x.w > 0)
    .sort((a, b) => a.v - b.v);
  if (items.length === 0) return 0;
  const total = items.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of items) {
    acc += x.w;
    if (acc >= total / 2) return x.v;
  }
  return items[items.length - 1].v;
}

/** Median of three, ignoring zeros so a missing F3 neighbour can't blank a real
 * value. With one zero it returns the non-zero middle; with two it returns 0. */
function med3(a: number, b: number, c: number): number {
  const v = [a, b, c].filter((x) => x > 0).sort((x, y) => x - y);
  if (v.length === 3) return v[1];
  if (v.length === 2) return (v[0] + v[1]) / 2;
  return v[0] ?? 0;
}

/** In-place 3-point median filter on the f1/f2/f3 trajectories (continuity
 * tracking). Reads from a snapshot so the smoothing is not cascaded. */
function smoothFrames(frames: FrameResult[]): void {
  if (frames.length < 3) return;
  const f1 = frames.map((f) => f.f1);
  const f2 = frames.map((f) => f.f2);
  const f3 = frames.map((f) => f.f3);
  for (let i = 1; i < frames.length - 1; i++) {
    frames[i].f1 = med3(f1[i - 1], f1[i], f1[i + 1]);
    frames[i].f2 = med3(f2[i - 1], f2[i], f2[i + 1]);
    frames[i].f3 = med3(f3[i - 1], f3[i], f3[i + 1]);
  }
}

/** Drop the first/last 15% of frames (onset/offset transitions) when there are
 * enough to spare; otherwise keep all. */
function steadyMiddle(frames: FrameResult[]): FrameResult[] {
  if (frames.length < 10) return frames;
  const trim = Math.floor(frames.length * 0.15);
  return frames.slice(trim, frames.length - trim);
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
  /** F2 standard deviation over the window (Hz) — a measurement-confidence
   * signal: a steady held vowel has low spread, a transition-contaminated or
   * mis-tracked window is high. Calibration gates on this. */
  spread: number;
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
    spread: stdev(win.map((f) => f.f2)),
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
  const empty: WindowMatch = { f1: 0, f2: 0, f3: 0, frames: [], startSec: 0, endSec: 0, spread: 0, found: false };
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

  // Within the chosen run, slide a fixed-length window and keep the position
  // with the LOWEST F2 variation — the spectrally steadiest stretch, i.e. the
  // vowel's held target rather than a consonant→vowel transition (which is what
  // fronts the vowel toward [i] after coronal/palatal onsets). This replaces a
  // blind 20% edge trim, which kept whatever the edges happened to be.
  const runLen = best.hi - best.lo + 1;
  const win = Math.max(minFrames, Math.round(runLen * 0.5));
  let bestStart = best.lo;
  let bestSpread = Infinity;
  for (let s = best.lo; s + win - 1 <= best.hi; s++) {
    const f2s: number[] = [];
    for (let k = s; k < s + win; k++) f2s.push(frames[k].f2);
    const sp = stdev(f2s);
    if (sp < bestSpread) {
      bestSpread = sp;
      bestStart = s;
    }
  }
  return windowResult(frames, bestStart, bestStart + win - 1);
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
    spread: match.spread,
    frames: match.found ? match.frames : [],
  };
  return { result, match };
}
