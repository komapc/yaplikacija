// Test fixtures: synthesize signals with KNOWN acoustic properties so the
// analysis code can be checked against ground truth.

/** Two-pole resonator: y[n] = x[n] + 2r·cos(w)·y[n-1] - r²·y[n-2]. */
export function resonate(x: Float64Array, freq: number, bw: number, fs: number): Float64Array {
  const r = Math.exp((-Math.PI * bw) / fs);
  const w = (2 * Math.PI * freq) / fs;
  const a1 = 2 * r * Math.cos(w);
  const a2 = -r * r;
  const y = new Float64Array(x.length);
  for (let n = 0; n < x.length; n++) {
    y[n] = x[n] + (n >= 1 ? a1 * y[n - 1] : 0) + (n >= 2 ? a2 * y[n - 2] : 0);
  }
  return y;
}

/** A glottal impulse train at f0 passed through a cascade of formant resonators. */
export function synthVowel(
  f0: number,
  formants: { f: number; bw: number }[],
  durSec: number,
  fs: number,
): Float32Array {
  const n = Math.round(durSec * fs);
  const src = new Float64Array(n);
  const period = Math.round(fs / f0);
  for (let i = 0; i < n; i += period) src[i] = 1;

  let sig = src;
  for (const fm of formants) sig = resonate(sig, fm.f, fm.bw, fs);

  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(sig[i]));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (sig[i] / (max || 1)) * 0.9;
  return out;
}

/** A pure sine tone at the given amplitude. */
export function sine(freq: number, durSec: number, fs: number, amp = 0.8): Float32Array {
  const n = Math.round(durSec * fs);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / fs);
  return out;
}
