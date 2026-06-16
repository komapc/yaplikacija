// Linear-predictive-coding formant estimation.
//
// Pipeline per frame: pre-emphasis -> Hamming window -> autocorrelation ->
// Levinson-Durbin -> roots of the LPC polynomial -> formant frequencies.
//
// All math is plain Float64; no external dependencies so it runs identically
// in the browser and (later) inside a Capacitor WebView on Android.

export interface Complex {
  re: number;
  im: number;
}

/** Hamming window applied in place is avoided; returns a fresh array. */
export function hammingWindow(frame: Float32Array): Float64Array {
  const n = frame.length;
  const out = new Float64Array(n);
  const f = (2 * Math.PI) / (n - 1);
  for (let i = 0; i < n; i++) {
    out[i] = frame[i] * (0.54 - 0.46 * Math.cos(f * i));
  }
  return out;
}

/** First-order pre-emphasis to flatten the spectral tilt of voiced speech. */
export function preEmphasis(frame: Float32Array, alpha = 0.97): Float32Array {
  const out = new Float32Array(frame.length);
  out[0] = frame[0];
  for (let i = 1; i < frame.length; i++) {
    out[i] = frame[i] - alpha * frame[i - 1];
  }
  return out;
}

/** Autocorrelation R[0..order] of a windowed frame. */
export function autocorrelate(x: Float64Array, order: number): Float64Array {
  const r = new Float64Array(order + 1);
  for (let lag = 0; lag <= order; lag++) {
    let sum = 0;
    for (let i = lag; i < x.length; i++) sum += x[i] * x[i - lag];
    r[lag] = sum;
  }
  return r;
}

/**
 * Levinson-Durbin recursion. Returns LPC coefficients as the polynomial
 * A(z) = 1 + a[1]z^-1 + ... + a[order]z^-order (a[0] === 1), or null if the
 * frame carries no energy.
 */
export function levinsonDurbin(r: Float64Array, order: number): Float64Array | null {
  if (r[0] === 0) return null;
  const a = new Float64Array(order + 1);
  a[0] = 1;
  let err = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / err;
    if (!Number.isFinite(k)) return null;
    // Update coefficients symmetrically.
    const half = i >> 1;
    for (let j = 1; j <= half; j++) {
      const tmp = a[j] + k * a[i - j];
      a[i - j] += k * a[j];
      a[j] = tmp;
    }
    a[i] = k;
    err *= 1 - k * k;
    if (err <= 0) break;
  }
  return a;
}

/**
 * Durand-Kerner (Weierstrass) iteration for all complex roots of a real
 * polynomial given as coefficients [c0, c1, ... cN] for c0 + c1 z + ... cN z^N.
 */
export function polynomialRoots(coeffs: Float64Array): Complex[] {
  // Trim leading/trailing zeros and normalise to monic, ascending powers.
  const c = Array.from(coeffs);
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-12) c.pop();
  const degree = c.length - 1;
  if (degree < 1) return [];
  const lead = c[degree];
  const norm = c.map((v) => v / lead);

  // Initial guesses spread around the unit circle (classic 0.4 + 0.9i seed).
  const roots: Complex[] = [];
  const seed: Complex = { re: 0.4, im: 0.9 };
  let p: Complex = { re: 1, im: 0 };
  for (let i = 0; i < degree; i++) {
    roots.push({ re: p.re, im: p.im });
    p = cMul(p, seed);
  }

  const evalPoly = (z: Complex): Complex => {
    // Horner on ascending coeffs: build from highest power down.
    let acc: Complex = { re: norm[degree], im: 0 };
    for (let i = degree - 1; i >= 0; i--) {
      acc = cAdd(cMul(acc, z), { re: norm[i], im: 0 });
    }
    return acc;
  };

  for (let iter = 0; iter < 100; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < degree; i++) {
      const numer = evalPoly(roots[i]);
      let denom: Complex = { re: 1, im: 0 };
      for (let j = 0; j < degree; j++) {
        if (j === i) continue;
        denom = cMul(denom, cSub(roots[i], roots[j]));
      }
      const delta = cDiv(numer, denom);
      roots[i] = cSub(roots[i], delta);
      maxDelta = Math.max(maxDelta, Math.hypot(delta.re, delta.im));
    }
    if (maxDelta < 1e-9) break;
  }
  return roots;
}

export interface Formant {
  freq: number; // Hz
  bandwidth: number; // Hz
}

/**
 * Estimate formants from one frame of samples.
 * Returns formants sorted by frequency (F1, F2, F3, ...).
 */
export function estimateFormants(
  frame: Float32Array,
  sampleRate: number,
  order = 2 + Math.round(sampleRate / 800),
): Formant[] {
  const emphasised = preEmphasis(frame);
  const windowed = hammingWindow(emphasised);
  const r = autocorrelate(windowed, order);
  const a = levinsonDurbin(r, order);
  if (!a) return [];

  const roots = polynomialRoots(a);
  const formants: Formant[] = [];
  for (const z of roots) {
    if (z.im <= 0) continue; // keep one of each conjugate pair (positive freq)
    const freq = (Math.atan2(z.im, z.re) * sampleRate) / (2 * Math.PI);
    // The polynomial is solved in z^-1, so a root magnitude r2 = |z^-1|; the
    // actual pole radius is 1/r2 and the formant bandwidth is -ln(1/r2)·fs/π
    // = ln(r2)·fs/π. Stable poles give r2 > 1 and thus positive bandwidth.
    const r2 = Math.hypot(z.re, z.im);
    const bandwidth = (Math.log(r2) * sampleRate) / Math.PI;
    // Plausible formants: in audible range, reasonably narrow band.
    if (freq > 90 && freq < sampleRate / 2 - 100 && bandwidth < 500) {
      formants.push({ freq, bandwidth });
    }
  }
  formants.sort((x, y) => x.freq - y.freq);
  return formants;
}

// --- minimal complex arithmetic -------------------------------------------
function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}
function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}
function cMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cDiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
