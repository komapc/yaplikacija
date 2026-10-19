// Ground-truth bias check: synthesise vowels with KNOWN F1/F2 across a range of
// F0 and report how far analyzeBuffer lands from the truth. High F0 (female /
// child voices) is where LPC formant estimates are least trustworthy.
//
//   npm run synth:bias

import { analyzeBuffer } from "../src/dsp/analyze";
import { synthVowel } from "../test/helpers/synth";

const FS = 16000;
const VOWELS: Record<string, [number, number, number]> = {
  ы: [340, 1450, 2500],
  и: [330, 2100, 2900],
  а: [700, 1300, 2500],
  у: [330, 800, 2300],
};
const F0S = [100, 130, 160, 200, 250, 300, 350];

console.log("vowel  F0   true F1/F2    est F1/F2    ΔF1   ΔF2");
let sumF1 = 0;
let sumF2 = 0;
let n = 0;
for (const [name, [f1, f2, f3]] of Object.entries(VOWELS)) {
  for (const f0 of F0S) {
    const sig = synthVowel(
      f0,
      [
        { f: f1, bw: 60 },
        { f: f2, bw: 90 },
        { f: f3, bw: 120 },
      ],
      0.6,
      FS,
    );
    const r = analyzeBuffer(sig, FS);
    const d1 = r.f1 - f1;
    const d2 = r.f2 - f2;
    sumF1 += Math.abs(d1);
    sumF2 += Math.abs(d2);
    n++;
    console.log(
      `${name}   ${String(f0).padStart(4)}  ${f1}/${f2}`.padEnd(30) +
        `${Math.round(r.f1)}/${Math.round(r.f2)}`.padEnd(13) +
        `${Math.round(d1)}`.padStart(5) +
        `${Math.round(d2)}`.padStart(6),
    );
  }
}
console.log(`mean abs error: F1 ${Math.round(sumF1 / n)} Hz, F2 ${Math.round(sumF2 / n)} Hz`);
