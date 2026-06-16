// Anti-aliased sample-rate conversion, used by the offline calibration and
// validation scripts. (The live app resamples via the browser's
// OfflineAudioContext, which already anti-aliases.)

import { lowpassCoeffs, applyBiquad } from "./filter";

/**
 * Resample `x` from `from` Hz to `to` Hz. When downsampling, low-pass below the
 * target Nyquist first (cascaded Butterworth sections) so high-frequency energy
 * doesn't fold into the formant band — at the exact 48k→16k ratio, linear
 * interpolation alone degenerates to naked decimation and would alias badly.
 */
export function resampleTo(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x;

  let filtered = x;
  if (to < from) {
    const lp = lowpassCoeffs(from, to * 0.45);
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
