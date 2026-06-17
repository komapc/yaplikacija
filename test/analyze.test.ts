import { describe, it, expect } from "vitest";
import { analyzeBuffer, findVowelNucleus, analyzeWord } from "../src/dsp/analyze";
import { scoreAttempt, TARGETS } from "../src/trainers/targets";
import { synthVowel } from "./helpers/synth";

const FS = 16000;

/** Concatenate audio segments into one "word"-like buffer. */
function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Scale amplitude — unstressed vowels are quieter than the stressed nucleus. */
function gain(x: Float32Array, g: number): Float32Array {
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * g;
  return out;
}

// Three formants each (incl. F3) so the F2/F3-ratio scoring path is exercised.
const aVowel = () => synthVowel(120, [{ f: 750, bw: 90 }, { f: 1300, bw: 110 }, { f: 2600, bw: 140 }], 0.4, FS);
const yeryVowel = () => synthVowel(120, [{ f: 350, bw: 70 }, { f: 1500, bw: 90 }, { f: 2500, bw: 130 }], 0.4, FS);
const uVowel = () => synthVowel(120, [{ f: 320, bw: 80 }, { f: 850, bw: 100 }, { f: 2400, bw: 140 }], 0.4, FS);
const iVowel = () => synthVowel(120, [{ f: 300, bw: 60 }, { f: 2200, bw: 110 }, { f: 2900, bw: 150 }], 0.4, FS);

interface VowelCase {
  name: string;
  f0: number;
  formants: { f: number; bw: number }[];
  expect: { f1: number; f2: number };
}

// Ground-truth vowels: the two trained sounds plus [i], which the app must be
// able to distinguish from Ы (high F2) — the core discrimination guarantee.
const cases: VowelCase[] = [
  {
    name: "Ы [ɨ]",
    f0: 120,
    formants: [{ f: 350, bw: 70 }, { f: 1500, bw: 90 }, { f: 2600, bw: 120 }],
    expect: { f1: 350, f2: 1500 },
  },
  {
    name: "Ain [ʕ]",
    f0: 110,
    formants: [{ f: 700, bw: 90 }, { f: 1150, bw: 110 }, { f: 2700, bw: 150 }],
    expect: { f1: 700, f2: 1150 },
  },
  {
    name: "и [i]",
    f0: 130,
    formants: [{ f: 300, bw: 60 }, { f: 2200, bw: 110 }, { f: 3000, bw: 150 }],
    expect: { f1: 300, f2: 2200 },
  },
];

describe("analyzeBuffer", () => {
  for (const c of cases) {
    it(`recovers F1/F2 for ${c.name}`, () => {
      const res = analyzeBuffer(synthVowel(c.f0, c.formants, 0.8, FS), FS);
      expect(res.voicedRatio).toBeGreaterThan(0.5);
      expect(Math.abs(res.f1 - c.expect.f1)).toBeLessThanOrEqual(80);
      expect(Math.abs(res.f2 - c.expect.f2)).toBeLessThanOrEqual(150);
    });
  }

  it("distinguishes и from Ы by F2 (no false Ы pass)", () => {
    const yery = analyzeBuffer(synthVowel(120, [{ f: 350, bw: 70 }, { f: 1500, bw: 90 }], 0.6, FS), FS);
    const ee = analyzeBuffer(synthVowel(130, [{ f: 300, bw: 60 }, { f: 2200, bw: 110 }], 0.6, FS), FS);
    expect(ee.f2 - yery.f2).toBeGreaterThan(400);
  });

  it("returns no voiced frames and zero formants for silence", () => {
    const res = analyzeBuffer(new Float32Array(FS), FS);
    expect(res.voicedRatio).toBe(0);
    expect(res.frames).toHaveLength(0);
    expect(res.f1).toBe(0);
    expect(res.f2).toBe(0);
  });
});

describe("findVowelNucleus / analyzeWord", () => {
  it("locks onto the loud (stressed) vowel, ignoring quiet flanking vowels", () => {
    // Quiet [a], loud Ы nucleus, quiet [u] — like a stressed Ы between others.
    const word = concat(gain(aVowel(), 0.35), yeryVowel(), gain(uVowel(), 0.35));
    const match = findVowelNucleus(analyzeBuffer(word, FS).frames);

    expect(match.found).toBe(true);
    expect(Math.abs(match.f2 - 1500)).toBeLessThan(160);
    const mid = (match.startSec + match.endSec) / 2;
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.8);
  });

  it("scores a word whose stressed vowel is a good Ы highly", () => {
    const word = concat(gain(aVowel(), 0.35), yeryVowel(), gain(uVowel(), 0.35));
    const { result } = analyzeWord(word, FS);
    expect(scoreAttempt(TARGETS.yery, result).overall).toBeGreaterThanOrEqual(80);
  });

  it("does NOT reward a wrong vowel even when a transition sweeps past Ы", () => {
    // Loud [i] nucleus with quiet flanks: an [i]→[u] glide passes through ~1500,
    // but the held vowel is [i], so the score must stay low (the bug we fixed).
    const word = concat(iVowel(), gain(uVowel(), 0.3));
    const { result } = analyzeWord(word, FS);
    expect(scoreAttempt(TARGETS.yery, result).overall).toBeLessThan(60);
  });

  it("scores a word whose stressed vowel is [u] (not Ы) low", () => {
    const word = concat(gain(aVowel(), 0.3), uVowel());
    const { result } = analyzeWord(word, FS);
    expect(scoreAttempt(TARGETS.yery, result).overall).toBeLessThan(65);
  });

  it("reports found=false for silence", () => {
    const full = analyzeBuffer(new Float32Array(FS), FS);
    expect(findVowelNucleus(full.frames).found).toBe(false);
  });

  it("scores a short Ы padded with long silence (gate is the nucleus, not whole-clip ratio)", () => {
    const silence = new Float32Array(Math.round(1.5 * FS));
    const word = concat(silence, yeryVowel(), silence); // lots of lead-in/out silence
    const { result, match } = analyzeWord(word, FS);
    expect(match.found).toBe(true);
    expect(result.voicedRatio).toBe(1); // not dragged below the 0.15 gate by silence
    expect(scoreAttempt(TARGETS.yery, result).overall).toBeGreaterThanOrEqual(80);
  });
});

// Direct unit tests of the nucleus run-finder on hand-built frame sequences,
// covering the tricky cases: a run that starts after a time gap, and quiet
// (unstressed) frames that must be excluded by the loudness threshold.
describe("findVowelNucleus run-finder", () => {
  const F = (timeSec: number, rms: number, f1 = 350, f2 = 1500) => ({ timeSec, f0: 120, f1, f2, f3: 2500, rms });

  it("picks the longer loud run even when it starts after a time gap", () => {
    const frames = [];
    for (let i = 0; i < 3; i++) frames.push(F(i * 0.01, 0.3, 360, 1520)); // short run
    for (let i = 0; i < 9; i++) frames.push(F(0.2 + i * 0.01, 0.3, 340, 1480)); // long run after gap
    const m = findVowelNucleus(frames, 0.03);
    expect(m.found).toBe(true);
    expect(m.startSec).toBeGreaterThanOrEqual(0.2); // landed in the long run
    expect(Math.abs(m.f2 - 1480)).toBeLessThan(30);
  });

  it("excludes quiet frames below the loudness threshold (only scores the stressed vowel)", () => {
    const frames = [];
    for (let i = 0; i < 8; i++) frames.push(F(i * 0.01, 0.1, 700, 1100)); // quiet wrong-vowel
    for (let i = 0; i < 8; i++) frames.push(F(0.08 + i * 0.01, 0.4, 350, 1500)); // loud Ы
    const m = findVowelNucleus(frames, 0.04);
    expect(m.found).toBe(true);
    expect(Math.abs(m.f2 - 1500)).toBeLessThan(40);
  });

  it("locks onto the STEADY held vowel, not the onset transition that sweeps past it", () => {
    // One loud run whose first half is an [i]→ glide (F2 2200→1700) and second
    // half is a steady Ы at 1500. The steadiest-window search must land on the
    // held 1500, not average in the transition (the coronal-onset fronting bug).
    const frames = [];
    const sweep = [2200, 2100, 2000, 1900, 1800, 1700];
    for (let i = 0; i < 6; i++) frames.push(F(i * 0.01, 0.3, 320, sweep[i]));
    for (let i = 0; i < 6; i++) frames.push(F(0.06 + i * 0.01, 0.3, 350, 1500));
    const m = findVowelNucleus(frames, 0.03);
    expect(m.found).toBe(true);
    expect(Math.abs(m.f2 - 1500)).toBeLessThan(40); // the held target, not ~1950
    expect(m.spread).toBeLessThan(40); // steady window ⇒ low F2 spread (confidence)
  });

  it("reports a higher spread for a jittery window than a steady one", () => {
    const steady = [];
    for (let i = 0; i < 8; i++) steady.push(F(i * 0.01, 0.3, 350, 1500));
    const jittery = [];
    const js = [1500, 1700, 1350, 1650, 1400, 1750, 1300, 1600];
    for (let i = 0; i < 8; i++) jittery.push(F(i * 0.01, 0.3, 350, js[i]));
    expect(findVowelNucleus(jittery, 0.03).spread).toBeGreaterThan(findVowelNucleus(steady, 0.03).spread);
  });
});
