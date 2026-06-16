import { describe, it, expect } from "vitest";
import { analyzeVoicing } from "../src/dsp/voicing";
import { sine } from "./helpers/synth";

const FS = 16000;

describe("analyzeVoicing", () => {
  it("marks silence as unvoiced with f0 = 0", () => {
    const v = analyzeVoicing(new Float32Array(400), FS);
    expect(v.voiced).toBe(false);
    expect(v.f0).toBe(0);
    expect(v.rms).toBeCloseTo(0, 6);
  });

  it("rejects a signal below the RMS threshold", () => {
    const v = analyzeVoicing(sine(150, 0.03, FS, 0.005), FS);
    expect(v.voiced).toBe(false);
  });

  it("detects a periodic tone as voiced and estimates its f0", () => {
    const v = analyzeVoicing(sine(150, 0.03, FS, 0.6), FS);
    expect(v.voiced).toBe(true);
    expect(v.f0).toBeGreaterThan(135);
    expect(v.f0).toBeLessThan(165);
  });

  it("reports a higher RMS for a louder frame", () => {
    const quiet = analyzeVoicing(sine(150, 0.03, FS, 0.2), FS);
    const loud = analyzeVoicing(sine(150, 0.03, FS, 0.8), FS);
    expect(loud.rms).toBeGreaterThan(quiet.rms);
  });
});
