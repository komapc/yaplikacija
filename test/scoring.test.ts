import { describe, it, expect } from "vitest";
import { TARGETS, scoreAttempt } from "../src/trainers/targets";
import type { AnalysisResult, FrameResult } from "../src/dsp/analyze";

/** Build a valid (sufficiently voiced) result centred on the given formants. */
function result(f1: number, f2: number, voicedRatio = 1): AnalysisResult {
  const frames: FrameResult[] = Array.from({ length: 5 }, (_, i) => ({
    timeSec: i * 0.01,
    f0: 120,
    f1,
    f2,
    rms: 0.1,
  }));
  return { f1, f2, voicedRatio, frames };
}

describe("scoreAttempt", () => {
  it("scores a bull's-eye attempt as excellent", () => {
    const t = TARGETS.yery;
    const s = scoreAttempt(t, result(t.f1.center, t.f2.center));
    expect(s.overall).toBeGreaterThanOrEqual(85);
    expect(s.feedback).toMatch(/excellent/i);
  });

  it("returns 0 and a prompt to sustain when there is too little voicing", () => {
    const s = scoreAttempt(TARGETS.yery, result(350, 1500, 0.05));
    expect(s.overall).toBe(0);
    expect(s.feedback).toMatch(/sustained|steady/i);
  });

  it("returns 0 when there are too few voiced frames", () => {
    const r: AnalysisResult = { f1: 350, f2: 1500, voicedRatio: 1, frames: [] };
    expect(scoreAttempt(TARGETS.yery, r).overall).toBe(0);
  });

  it("flags an и-like attempt (F2 too high) for the Ы target", () => {
    const t = TARGETS.yery;
    const s = scoreAttempt(t, result(300, 2200)); // [i]: front, high F2
    expect(s.overall).toBeLessThan(85);
    expect(s.feedback).toBe(t.mistakes.f2TooHigh);
  });

  it("flags a у-like attempt (F2 too low) for the Ы target", () => {
    const t = TARGETS.yery;
    const s = scoreAttempt(t, result(350, 900));
    expect(s.feedback).toBe(t.mistakes.f2TooLow);
  });

  it("scores closer-to-centre higher than farther-from-centre", () => {
    const t = TARGETS.ain;
    const near = scoreAttempt(t, result(t.f1.center, t.f2.center + 40));
    const far = scoreAttempt(t, result(t.f1.center, t.f2.center + 220));
    expect(near.overall).toBeGreaterThan(far.overall);
  });

  it("weights F1 as the dominant cue for Ain (pharyngeal constriction)", () => {
    const t = TARGETS.ain;
    const f1Error = scoreAttempt(t, result(t.f1.center + t.f1.tolerance, t.f2.center));
    const f2Error = scoreAttempt(t, result(t.f1.center, t.f2.center + t.f2.tolerance));
    expect(f1Error.overall).toBeLessThan(f2Error.overall);
  });

  it("weights F2 as the dominant cue for Ы (tongue front/back)", () => {
    const t = TARGETS.yery;
    const f1Error = scoreAttempt(t, result(t.f1.center + t.f1.tolerance, t.f2.center));
    const f2Error = scoreAttempt(t, result(t.f1.center, t.f2.center + t.f2.tolerance));
    expect(f2Error.overall).toBeLessThan(f1Error.overall);
  });

  it("leads Ain feedback with the F1 (constriction) note when both formants miss", () => {
    const t = TARGETS.ain;
    const s = scoreAttempt(t, result(t.f1.center - t.f1.tolerance - 150, t.f2.center + t.f2.tolerance + 150));
    expect(s.feedback.startsWith(t.mistakes.f1TooLow)).toBe(true);
  });

  it("keeps scores within 0..100", () => {
    for (const t of Object.values(TARGETS)) {
      for (const f2 of [0, 500, t.f2.center, 3000, 8000]) {
        const s = scoreAttempt(t, result(t.f1.center, f2));
        expect(s.overall).toBeGreaterThanOrEqual(0);
        expect(s.overall).toBeLessThanOrEqual(100);
      }
    }
  });
});
