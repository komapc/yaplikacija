import { describe, it, expect } from "vitest";
import { classifyVowel } from "../src/trainers/vowels";

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
