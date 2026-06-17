import { describe, it, expect } from "vitest";
import {
  preEmphasis,
  hammingWindow,
  autocorrelate,
  lagWindow,
  levinsonDurbin,
  polynomialRoots,
  estimateFormants,
} from "../src/dsp/lpc";
import { synthVowel } from "./helpers/synth";

describe("preEmphasis", () => {
  it("passes the first sample through and applies y[n] = x[n] - 0.97·x[n-1]", () => {
    const out = preEmphasis(new Float32Array([1, 1, 1]), 0.97);
    expect(out[0]).toBeCloseTo(1, 6);
    expect(out[1]).toBeCloseTo(0.03, 6);
    expect(out[2]).toBeCloseTo(0.03, 6);
  });
});

describe("hammingWindow", () => {
  it("tapers the endpoints to ~0.08 and leaves the centre near full scale", () => {
    const w = hammingWindow(new Float32Array(9).fill(1));
    expect(w[0]).toBeCloseTo(0.08, 4);
    expect(w[8]).toBeCloseTo(0.08, 4);
    expect(w[4]).toBeCloseTo(1, 4); // centre of a length-9 window
  });

  it("is symmetric", () => {
    const w = hammingWindow(new Float32Array(16).fill(1));
    for (let i = 0; i < 8; i++) expect(w[i]).toBeCloseTo(w[15 - i], 6);
  });
});

describe("autocorrelate", () => {
  it("matches hand-computed lags for [1,2,3]", () => {
    const r = autocorrelate(new Float64Array([1, 2, 3]), 2);
    expect(r[0]).toBeCloseTo(14, 6); // 1+4+9
    expect(r[1]).toBeCloseTo(8, 6); //  1·2 + 2·3
    expect(r[2]).toBeCloseTo(3, 6); //  1·3
  });
});

describe("levinsonDurbin", () => {
  it("returns null for a zero-energy frame", () => {
    expect(levinsonDurbin(new Float64Array([0, 0, 0]), 2)).toBeNull();
  });

  it("produces a monic polynomial (a[0] === 1)", () => {
    const r = autocorrelate(hammingWindow(synthVowel(120, [{ f: 800, bw: 80 }], 0.05, 16000)), 10);
    const a = levinsonDurbin(r, 10);
    expect(a).not.toBeNull();
    expect(a![0]).toBe(1);
  });
});

describe("polynomialRoots", () => {
  it("finds the real roots of z² - 0.25 (±0.5)", () => {
    // coeffs ascending: -0.25 + 0·z + 1·z²
    const roots = polynomialRoots(new Float64Array([-0.25, 0, 1]));
    const mags = roots.map((r) => Math.hypot(r.re, r.im)).sort();
    expect(roots).toHaveLength(2);
    expect(mags[0]).toBeCloseTo(0.5, 4);
    expect(mags[1]).toBeCloseTo(0.5, 4);
  });

  it("finds the imaginary roots of z² + 1 (±i)", () => {
    const roots = polynomialRoots(new Float64Array([1, 0, 1]));
    expect(roots).toHaveLength(2);
    for (const r of roots) {
      expect(Math.abs(r.re)).toBeCloseTo(0, 3);
      expect(Math.abs(r.im)).toBeCloseTo(1, 3);
    }
  });
});

describe("lagWindow", () => {
  it("leaves R[0] unchanged and monotonically attenuates higher lags", () => {
    const r = new Float64Array([10, 10, 10, 10, 10]);
    const w = lagWindow(r, 16000, 50);
    expect(w[0]).toBeCloseTo(10, 9); // exp(0) = 1
    for (let k = 1; k < w.length; k++) {
      expect(w[k]).toBeLessThan(w[k - 1]); // weight strictly decreasing
      expect(w[k]).toBeGreaterThan(0);
    }
  });

  it("attenuates more aggressively with a wider broadening bandwidth", () => {
    const r = new Float64Array([1, 1, 1, 1]);
    const mild = lagWindow(r, 16000, 30);
    const strong = lagWindow(r, 16000, 120);
    expect(strong[3]).toBeLessThan(mild[3]);
  });
});

describe("estimateFormants", () => {
  it("recovers a single resonator's centre frequency", () => {
    const sig = synthVowel(120, [{ f: 1000, bw: 80 }, { f: 2800, bw: 120 }], 0.3, 16000);
    const frame = sig.subarray(2000, 2400);
    const formants = estimateFormants(frame, 16000);
    expect(formants.length).toBeGreaterThanOrEqual(1);
    expect(formants[0].freq).toBeGreaterThan(850);
    expect(formants[0].freq).toBeLessThan(1150);
  });

  it("reports positive bandwidths (the sign-of-pole-radius regression)", () => {
    const sig = synthVowel(120, [{ f: 700, bw: 90 }, { f: 1800, bw: 110 }], 0.3, 16000);
    const formants = estimateFormants(sig.subarray(2000, 2400), 16000);
    expect(formants.length).toBeGreaterThan(0);
    for (const f of formants) expect(f.bandwidth).toBeGreaterThan(0);
  });
});
