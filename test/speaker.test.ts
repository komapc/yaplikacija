import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scaleFromA, setSpeakerScale, getSpeakerScale } from "../src/trainers/speaker";
import { TARGETS, scoreAttempt, toReferenceSpace } from "../src/trainers/targets";
import { pickFormants } from "../src/dsp/analyze";
import type { AnalysisResult, FrameResult } from "../src/dsp/analyze";

function result(f1: number, f2: number, sustainedFrames?: number): AnalysisResult {
  const frames: FrameResult[] = Array.from({ length: 20 }, (_, i) => ({
    timeSec: i * 0.01, f0: 120, f1, f2, f3: 0, rms: 0.1,
  }));
  return { f1, f2, f3: 0, voicedRatio: 1, spread: 0, sustainedFrames, frames };
}

describe("speaker scale", () => {
  beforeEach(() => setSpeakerScale(null));
  afterEach(() => setSpeakerScale(null));

  it("is 1 for the reference «а» and larger for a higher-formant voice", () => {
    expect(scaleFromA(700, 1300)).toBeCloseTo(1, 5);
    expect(scaleFromA(840, 1560)!).toBeCloseTo(1.2, 5);
  });

  it("clamps absurd measurements and rejects missing ones", () => {
    expect(scaleFromA(2000, 4000)).toBe(1.4);
    expect(scaleFromA(0, 1300)).toBeNull();
  });

  it("lets a correct «ы» from a higher voice score well once calibrated", () => {
    const t = TARGETS.yery;
    const high = result(t.f1.center * 1.2, t.f2.center * 1.2, 30);
    const before = scoreAttempt(t, high).overall;
    setSpeakerScale(1.2);
    expect(getSpeakerScale()).toBe(1.2);
    const after = scoreAttempt(t, high).overall;
    expect(after).toBeGreaterThanOrEqual(85);
    expect(after).toBeGreaterThan(before);
    expect(toReferenceSpace(high).f1).toBeCloseTo(t.f1.center, 5);
  });
});

describe("sound-mode sustain gate", () => {
  it("scores 0 when fewer than ~150 ms were held", () => {
    const t = TARGETS.yery;
    expect(scoreAttempt(t, result(t.f1.center, t.f2.center, 8)).overall).toBe(0);
    expect(scoreAttempt(t, result(t.f1.center, t.f2.center, 30)).overall).toBeGreaterThanOrEqual(85);
  });
});

describe("pickFormants", () => {
  const p = (freq: number, bandwidth = 80) => ({ freq, bandwidth });
  it("skips a spurious low pole instead of calling it F1", () => {
    const r = pickFormants([p(120), p(340), p(1450), p(2500)])!;
    expect([r.f1.freq, r.f2.freq, r.f3]).toEqual([340, 1450, 2500]);
  });
  it("skips a pole hugging F1 and returns null when no F2 exists", () => {
    expect(pickFormants([p(340), p(450), p(1450)])!.f2.freq).toBe(1450);
    expect(pickFormants([p(340)])).toBeNull();
  });
});
