import { describe, it, expect } from "vitest";
import { classifyVowel, yeryDominance } from "../src/trainers/vowels";

describe("classifyVowel", () => {
  it("classifies adult-male-range vowels from our recordings", () => {
    expect(classifyVowel(336, 1482)).toBe("ы"); // сын
    expect(classifyVowel(327, 2040)).toBe("и"); // син
    expect(classifyVowel(329, 711)).toBe("у"); // P у
    expect(classifyVowel(688, 1300)).toBe("а"); // сан
    expect(classifyVowel(503, 1081)).toBe("о"); // сон
    expect(classifyVowel(452, 1702)).toBe("э"); // сэн [e]
  });

  it("returns null when no formants were measured", () => {
    expect(classifyVowel(0, 0)).toBeNull();
    expect(classifyVowel(NaN, NaN)).toBeNull();
  });
});

describe("yeryDominance", () => {
  it("gives full credit to a clean central ы and ~0 to a clear э/и", () => {
    expect(yeryDominance(336, 1482)).toBeGreaterThan(0.9); // сын — ы owns it
    expect(yeryDominance(452, 1635)).toBeLessThan(0.2); // э brushing the ы band
    expect(yeryDominance(300, 2200)).toBe(0); // и — clearly another vowel
  });

  it("keeps a back ы (near у) ahead of an э that sits in the ы F2 band", () => {
    // A speaker whose vowel space is shifted down in F2: their ы (F2 1137) reads
    // BELOW the absolute ы band while their э (F2 1635) reads inside it — so raw
    // distance ties them. The competitor gate must still favour the real ы.
    expect(yeryDominance(353, 1137)).toBeGreaterThan(yeryDominance(429, 1635));
  });

  it("returns 0 for absent formants", () => {
    expect(yeryDominance(0, 0)).toBe(0);
  });
});
