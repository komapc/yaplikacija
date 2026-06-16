// Pre-processing noise filter applied to the whole buffer before framing.
//
// A second-order Butterworth high-pass (RBJ biquad) removes DC offset,
// low-frequency rumble, breath/handling thumps and mains hum (50/60 Hz) — all
// of which sit below the lowest formant we care about (~250 Hz), so this
// cleans up the signal without disturbing the F1/F2 estimates. We deliberately
// avoid broadband spectral denoising, which would distort the formant envelope.

export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** RBJ cookbook high-pass; q = 1/√2 gives a maximally-flat Butterworth response. */
export function highpassCoeffs(sampleRate: number, cutoffHz: number, q = Math.SQRT1_2): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);

  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Direct-form-I biquad applied causally; returns a new buffer. */
export function applyBiquad(x: Float32Array, c: BiquadCoeffs): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const xn = x[n];
    const yn = c.b0 * xn + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    y[n] = yn;
  }
  return y;
}

/** Convenience: high-pass a buffer at the given cutoff (default 80 Hz). */
export function highpassFilter(samples: Float32Array, sampleRate: number, cutoffHz = 80): Float32Array {
  return applyBiquad(samples, highpassCoeffs(sampleRate, cutoffHz));
}
