import { describe, it, expect } from "vitest";
import { analyzeBuffer, findBestWindow, analyzeWord } from "../src/dsp/analyze";
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

// Pseudo-word [a]-Ы-[u]: only the middle segment is a real Ы (F2 ~1500).
const aVowel = () => synthVowel(120, [{ f: 750, bw: 90 }, { f: 1300, bw: 110 }], 0.4, FS);
const yeryVowel = () => synthVowel(120, [{ f: 350, bw: 70 }, { f: 1500, bw: 90 }], 0.4, FS);
const uVowel = () => synthVowel(120, [{ f: 320, bw: 80 }, { f: 850, bw: 100 }], 0.4, FS);

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

describe("findBestWindow / analyzeWord", () => {
  it("locates the Ы segment inside [a]-Ы-[u]", () => {
    const word = concat(aVowel(), yeryVowel(), uVowel());
    const full = analyzeBuffer(word, FS);
    const match = findBestWindow(full.frames, TARGETS.yery);

    expect(match.found).toBe(true);
    expect(Math.abs(match.f2 - 1500)).toBeLessThan(150);
    // The match should sit in the middle segment (0.4–0.8 s).
    const mid = (match.startSec + match.endSec) / 2;
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.8);
  });

  it("scores a word containing a good Ы highly", () => {
    const word = concat(aVowel(), yeryVowel(), uVowel());
    const { result } = analyzeWord(word, FS, TARGETS.yery);
    expect(scoreAttempt(TARGETS.yery, result).overall).toBeGreaterThanOrEqual(80);
  });

  it("scores a word with no Ы (only [u] and [a]) low", () => {
    const word = concat(uVowel(), aVowel());
    const { result } = analyzeWord(word, FS, TARGETS.yery);
    expect(scoreAttempt(TARGETS.yery, result).overall).toBeLessThan(70);
  });

  it("reports found=false for silence", () => {
    const full = analyzeBuffer(new Float32Array(FS), FS);
    expect(findBestWindow(full.frames, TARGETS.yery).found).toBe(false);
  });
});
