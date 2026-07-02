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
 * Gaussian lag window (bandwidth-broadening) applied to the autocorrelation.
 * Multiplying R[k] by exp(-½(2π·B·k/fs)²) widens every formant bandwidth by
 * ~B Hz, which damps spurious razor-sharp poles and the F1/F2 pole-merging that
 * plain autocorrelation LPC suffers on high-pitched (female) and back vowels.
 * It is the robustness we wanted from closed-phase analysis, without fragile
 * glottal-closure-instant detection. See Tohkura et al., 1978.
 */
export function lagWindow(r: Float64Array, sampleRate: number, bandwidthHz = 50): Float64Array {
  const out = new Float64Array(r.length);
  const c = (2 * Math.PI * bandwidthHz) / sampleRate;
  for (let k = 0; k < r.length; k++) {
    const w = Math.exp(-0.5 * (c * k) * (c * k));
    out[k] = r[k] * w;
  }
  return out;
}

/**
 * Burg's method: estimate the LPC polynomial A(z) directly from the (windowed)
 * frame by minimising forward+backward prediction error, without an explicit
 * autocorrelation. Returns coefficients A(z) = 1 + a[1]z^-1 + ... in the same
 * convention as `levinsonDurbin`, or null on a degenerate frame.
 *
 * Burg is the estimator Praat uses ("To Formant (burg)"). On this app's corpus
 * it separates ы from и/у markedly better than autocorrelation LPC (clean-ы vs
 * non-ы AUC 0.88 → 0.94) and resolves the F1/F2 pole-merge that made some
 * higher-pitched (female) tokens read a spurious ~2400 Hz F2. See
 * `scripts/eval-variants.ts` for the benchmark.
 */
export function burgCoefficients(x: Float64Array, order: number): Float64Array | null {
  const n = x.length;
  if (n <= order) return null;
  // Forward/backward prediction-error sequences, seeded with the signal itself.
  const f = Float64Array.from(x);
  const b = Float64Array.from(x);
  const a = new Float64Array(order + 1);
  a[0] = 1;

  // Denominator of the first reflection coefficient.
  let den = 0;
  for (let i = 0; i < n; i++) den += 2 * x[i] * x[i];
  den -= x[0] * x[0] + x[n - 1] * x[n - 1];
  if (den <= 0) return null;

  const prev = new Float64Array(order + 1);
  for (let m = 1; m <= order; m++) {
    // Reflection coefficient k = -2·Σ f·b / (Σ f² + Σ b²).
    let num = 0;
    for (let i = m; i < n; i++) num += f[i] * b[i - 1];
    const k = (-2 * num) / den;
    if (!Number.isFinite(k)) return null;

    // Update the polynomial: a_m[j] = a_{m-1}[j] + k·a_{m-1}[m-j].
    prev.set(a);
    for (let j = 1; j <= m; j++) a[j] = prev[j] + k * prev[m - j];

    // Update the forward/backward errors in place (walk high→low so b[i-1] is
    // still the previous iteration's value when read).
    for (let i = n - 1; i >= m; i--) {
      const fi = f[i];
      f[i] = fi + k * b[i - 1];
      b[i] = b[i - 1] + k * fi;
    }

    // Recurrence for the next denominator (Andersen's update).
    den = den * (1 - k * k) - f[m] * f[m] - b[n - 1] * b[n - 1];
    if (den <= 0) break;
  }
  return a;
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

/** Convert LPC-polynomial roots to sorted, plausibility-filtered formants. */
function rootsToFormants(a: Float64Array, sampleRate: number): Formant[] {
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

export type LpcMethod = "burg" | "autocorrelation";

/**
 * Estimate formants from one frame of samples.
 * Returns formants sorted by frequency (F1, F2, F3, ...).
 *
 * Defaults to Burg's method — it discriminates the target vowels better and is
 * robust to the F1/F2 pole-merge on high-pitched voices (see `burgCoefficients`
 * and `scripts/eval-variants.ts`). Pass `method: "autocorrelation"` for the
 * older lag-windowed autocorrelation path (kept for regression comparison).
 */
export function estimateFormants(
  frame: Float32Array,
  sampleRate: number,
  order = 2 + Math.round(sampleRate / 1000),
  method: LpcMethod = "burg",
): Formant[] {
  const windowed = hammingWindow(preEmphasis(frame));
  let a: Float64Array | null;
  if (method === "burg") {
    a = burgCoefficients(windowed, order);
  } else {
    // Lag-window the autocorrelation before the recursion to stabilise the poles
    // (broadens bandwidths slightly; suppresses spurious/merged formants).
    const r = lagWindow(autocorrelate(windowed, order), sampleRate);
    a = levinsonDurbin(r, order);
  }
  if (!a) return [];
  return rootsToFormants(a, sampleRate);
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
