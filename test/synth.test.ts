// Sanity check: synthesize vowels with KNOWN formants (source-filter model)
// and confirm the LPC estimator recovers them within tolerance.

import { analyzeBuffer } from "../src/dsp/analyze";

const FS = 16000;

/** Two-pole resonator: y[n] = x[n] + 2 r cos(w) y[n-1] - r^2 y[n-2]. */
function resonate(x: Float64Array, freq: number, bw: number): Float64Array {
  const r = Math.exp((-Math.PI * bw) / FS);
  const w = (2 * Math.PI * freq) / FS;
  const a1 = 2 * r * Math.cos(w);
  const a2 = -r * r;
  const y = new Float64Array(x.length);
  for (let n = 0; n < x.length; n++) {
    y[n] = x[n] + (n >= 1 ? a1 * y[n - 1] : 0) + (n >= 2 ? a2 * y[n - 2] : 0);
  }
  return y;
}

function synthVowel(f0: number, formants: { f: number; bw: number }[], durSec: number): Float32Array {
  const n = Math.round(durSec * FS);
  // Glottal impulse train as the source.
  const src = new Float64Array(n);
  const period = Math.round(FS / f0);
  for (let i = 0; i < n; i += period) src[i] = 1;

  let sig = src;
  for (const fm of formants) sig = resonate(sig, fm.f, fm.bw);

  // Normalise.
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(sig[i]));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (sig[i] / (max || 1)) * 0.9;
  return out;
}

interface Case {
  name: string;
  f0: number;
  formants: { f: number; bw: number }[];
  expect: { f1: number; f2: number };
}

const cases: Case[] = [
  {
    name: "Ы [ɨ]   (F1 350, F2 1500)",
    f0: 120,
    formants: [{ f: 350, bw: 70 }, { f: 1500, bw: 90 }, { f: 2600, bw: 120 }],
    expect: { f1: 350, f2: 1500 },
  },
  {
    name: "Ain [ʕ] (F1 700, F2 1150)",
    f0: 110,
    formants: [{ f: 700, bw: 90 }, { f: 1150, bw: 110 }, { f: 2700, bw: 150 }],
    expect: { f1: 700, f2: 1150 },
  },
  {
    name: "и [i]   (F1 300, F2 2200)",
    f0: 130,
    formants: [{ f: 300, bw: 60 }, { f: 2200, bw: 110 }, { f: 3000, bw: 150 }],
    expect: { f1: 300, f2: 2200 },
  },
];

let failures = 0;
for (const c of cases) {
  const sig = synthVowel(c.f0, c.formants, 0.8);
  const res = analyzeBuffer(sig, FS);
  const e1 = Math.abs(res.f1 - c.expect.f1);
  const e2 = Math.abs(res.f2 - c.expect.f2);
  const tol1 = 80;
  const tol2 = 150;
  const ok = e1 <= tol1 && e2 <= tol2 && res.voicedRatio > 0.5;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name}  ->  ` +
      `F1 ${res.f1.toFixed(0)} (Δ${e1.toFixed(0)}), ` +
      `F2 ${res.f2.toFixed(0)} (Δ${e2.toFixed(0)}), ` +
      `voiced ${(res.voicedRatio * 100).toFixed(0)}%`,
  );
}

console.log(failures === 0 ? "\nAll formant estimates within tolerance ✔" : `\n${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
