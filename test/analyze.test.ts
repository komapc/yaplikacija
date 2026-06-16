import { describe, it, expect } from "vitest";
import { analyzeBuffer } from "../src/dsp/analyze";
import { synthVowel } from "./helpers/synth";

const FS = 16000;

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
