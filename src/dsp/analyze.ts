// High-level analysis: turn a buffer of mono PCM into a robust (F1, F2)
// estimate by analysing voiced frames and taking the median.

import { estimateFormants } from "./lpc";
import { analyzeVoicing } from "./voicing";
import { highpassFilter } from "./filter";
import type { SoundTarget } from "../trainers/targets";

export interface FrameResult {
  timeSec: number;
  f0: number;
  f1: number;
  f2: number;
  rms: number;
}

export interface AnalysisResult {
  /** Median formants over the voiced steady portion. */
  f1: number;
  f2: number;
  /** Fraction of frames that were voiced — a proxy for "did they sustain it". */
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
  let voicedCount = 0;
  let total = 0;

  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    total++;
    const frame = samples.subarray(start, start + frameSize);
    const v = analyzeVoicing(frame, sampleRate);
    if (!v.voiced) continue;
    voicedCount++;

    const formants = estimateFormants(frame, sampleRate);
    if (formants.length < 2) continue;
    const f1 = formants[0].freq;
    const f2 = formants[1].freq;
    // Reject implausible formant pairs (noise / unstable LPC on consonantal or
    // nasal frames): F1 too low, F2 above the human range, or F2 not above F1.
    if (f1 < 150 || f2 > 3500 || f2 <= f1) continue;
    frames.push({ timeSec: start / sampleRate, f0: v.f0, f1, f2, rms: v.rms });
    f1s.push(f1);
    f2s.push(f2);
  }

  return {
    f1: median(f1s),
    f2: median(f2s),
    voicedRatio: total === 0 ? 0 : voicedCount / total,
    frames,
  };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// --- word-level analysis ---------------------------------------------------
// In a word the target sound is one segment among others, so we cannot median
// the whole recording. Instead we locate the sustained voiced window whose
// formants best match the target — i.e. "the learner's best moment" of the
// target sound inside the word.

const FRAME_HOP_SEC = 0.01; // matches the 10 ms hop used above
const MAX_FRAME_GAP_SEC = 0.025; // a larger gap means we crossed an unvoiced segment

export interface WindowMatch {
  f1: number;
  f2: number;
  frames: FrameResult[];
  startSec: number;
  endSec: number;
  found: boolean;
}

/**
 * Slide a fixed-width window (>= minDurationSec) over the voiced frames and
 * return the temporally-contiguous one whose median (F1,F2) is closest to the
 * target, measured in tolerance units and weighted per the sound (so F2
 * dominates for Ы). `found` is false when no sustained voiced window exists.
 */
export function findBestWindow(
  frames: FrameResult[],
  target: SoundTarget,
  minDurationSec = 0.07,
): WindowMatch {
  const width = Math.max(3, Math.round(minDurationSec / FRAME_HOP_SEC));
  const empty: WindowMatch = { f1: 0, f2: 0, frames: [], startSec: 0, endSec: 0, found: false };
  if (frames.length < width) return empty;

  let best: { dist: number; lo: number } | null = null;
  for (let lo = 0; lo + width <= frames.length; lo++) {
    const hi = lo + width - 1;
    if (!isContiguous(frames, lo, hi)) continue;

    const f1m = median(sliceField(frames, lo, hi, "f1"));
    const f2m = median(sliceField(frames, lo, hi, "f2"));
    const dist =
      target.weights.f1 * (Math.abs(f1m - target.f1.center) / target.f1.tolerance) +
      target.weights.f2 * (Math.abs(f2m - target.f2.center) / target.f2.tolerance);
    if (best === null || dist < best.dist) best = { dist, lo };
  }
  if (best === null) return empty;

  const win = frames.slice(best.lo, best.lo + width);
  return {
    f1: median(win.map((f) => f.f1)),
    f2: median(win.map((f) => f.f2)),
    frames: win,
    startSec: win[0].timeSec,
    endSec: win[win.length - 1].timeSec,
    found: true,
  };
}

/**
 * Locate the VOWEL NUCLEUS — the loudest sustained voiced region — WITHOUT
 * reference to any target. This is deliberately target-independent: scoring the
 * region that merely looks most like the target (findBestWindow) cherry-picks a
 * transient that sweeps past the target and rewards almost any utterance. The
 * nucleus is what the speaker actually held; in every exercise word the stressed
 * Ы is the loudest vowel, so this finds it and then scoring can fairly judge it.
 */
export function findVowelNucleus(frames: FrameResult[], minDurationSec = 0.05): WindowMatch {
  const empty: WindowMatch = { f1: 0, f2: 0, frames: [], startSec: 0, endSec: 0, found: false };
  const minFrames = Math.max(3, Math.round(minDurationSec / FRAME_HOP_SEC));
  if (frames.length < minFrames) return empty;

  let peak = 0;
  for (const f of frames) peak = Math.max(peak, f.rms);
  if (peak === 0) return empty;
  const threshold = 0.55 * peak;

  // Longest contiguous run of loud (>= threshold) voiced frames.
  let bestLo = -1;
  let bestLen = 0;
  let runLo = -1;
  for (let i = 0; i < frames.length; i++) {
    const contiguous = runLo >= 0 && frames[i].timeSec - frames[i - 1].timeSec <= FRAME_HOP_SEC + MAX_FRAME_GAP_SEC;
    if (frames[i].rms >= threshold && (runLo < 0 || contiguous)) {
      if (runLo < 0) runLo = i;
      const len = i - runLo + 1;
      if (len > bestLen) {
        bestLen = len;
        bestLo = runLo;
      }
    } else {
      runLo = frames[i].rms >= threshold ? i : -1;
    }
  }
  if (bestLo < 0 || bestLen < minFrames) return empty;

  // Trim one frame off each end (the loudness ramp) when the run is long enough.
  let s = bestLo;
  let e = bestLo + bestLen - 1;
  if (e - s >= minFrames + 1) {
    s += 1;
    e -= 1;
  }
  const win = frames.slice(s, e + 1);
  return {
    f1: median(win.map((f) => f.f1)),
    f2: median(win.map((f) => f.f2)),
    frames: win,
    startSec: win[0].timeSec,
    endSec: win[win.length - 1].timeSec,
    found: true,
  };
}

/**
 * Analyse a recorded WORD: run the normal frame analysis, then score the vowel
 * nucleus (the stressed Ы). Returns an `AnalysisResult` shaped exactly like
 * `analyzeBuffer` (so `scoreAttempt`/`drawFormantChart` are reused) plus the
 * raw `match` for UI highlighting. When no nucleus is found the result has no
 * frames so scoring reports "nothing sustained heard".
 */
export function analyzeWord(
  samples: Float32Array,
  sampleRate: number,
  _target: SoundTarget,
): { result: AnalysisResult; match: WindowMatch } {
  const full = analyzeBuffer(samples, sampleRate);
  const match = findVowelNucleus(full.frames);
  const result: AnalysisResult = {
    f1: match.f1,
    f2: match.f2,
    voicedRatio: full.voicedRatio,
    frames: match.found ? match.frames : [],
  };
  return { result, match };
}

function isContiguous(frames: FrameResult[], lo: number, hi: number): boolean {
  for (let k = lo + 1; k <= hi; k++) {
    if (frames[k].timeSec - frames[k - 1].timeSec > FRAME_HOP_SEC + MAX_FRAME_GAP_SEC) return false;
  }
  return true;
}

function sliceField(frames: FrameResult[], lo: number, hi: number, field: "f1" | "f2"): number[] {
  const out: number[] = [];
  for (let k = lo; k <= hi; k++) out.push(frames[k][field]);
  return out;
}
