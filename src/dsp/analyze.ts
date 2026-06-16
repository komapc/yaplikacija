// High-level analysis: turn a buffer of mono PCM into a robust (F1, F2)
// estimate by analysing voiced frames and taking the median.

import { estimateFormants } from "./lpc";
import { analyzeVoicing } from "./voicing";

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

export function analyzeBuffer(samples: Float32Array, sampleRate: number): AnalysisResult {
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
