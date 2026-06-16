import { describe, it, expect } from "vitest";
import { highpassFilter, lowpassFilter } from "../src/dsp/filter";
import { sine } from "./helpers/synth";

const FS = 16000;

/** Peak amplitude of the settled portion (skip the filter's startup transient). */
function settledPeak(x: Float32Array): number {
  let peak = 0;
  for (let i = Math.floor(x.length / 2); i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  return peak;
}

describe("highpassFilter", () => {
  it("removes a DC offset", () => {
    const dc = new Float32Array(FS).fill(0.5);
    const out = highpassFilter(dc, FS);
    // After the transient, the constant component is gone.
    let sum = 0;
    for (let i = FS / 2; i < FS; i++) sum += out[i];
    expect(Math.abs(sum / (FS / 2))).toBeLessThan(0.01);
  });

  it("strongly attenuates sub-cutoff rumble (40 Hz)", () => {
    const out = highpassFilter(sine(40, 0.5, FS, 0.8), FS);
    expect(settledPeak(out)).toBeLessThan(0.2); // >12 dB down
  });

  it("attenuates mains hum (50 Hz)", () => {
    const out = highpassFilter(sine(50, 0.5, FS, 0.8), FS);
    expect(settledPeak(out)).toBeLessThan(0.3);
  });

  it("passes the formant band (1000 Hz) almost unchanged", () => {
    const out = highpassFilter(sine(1000, 0.5, FS, 0.8), FS);
    expect(settledPeak(out)).toBeGreaterThan(0.7);
  });

  it("leaves the lowest formant region (300 Hz) largely intact", () => {
    const out = highpassFilter(sine(300, 0.5, FS, 0.8), FS);
    expect(settledPeak(out)).toBeGreaterThan(0.6);
  });
});

describe("lowpassFilter (anti-aliasing for downsampling)", () => {
  it("passes in-band content (1 kHz) when cutoff is 7.2 kHz", () => {
    const out = lowpassFilter(sine(1000, 0.5, 48000, 0.8), 48000, 7200);
    expect(settledPeak(out)).toBeGreaterThan(0.7);
  });

  it("attenuates above-Nyquist content (12 kHz) that would otherwise alias", () => {
    const out = lowpassFilter(sine(12000, 0.5, 48000, 0.8), 48000, 7200);
    expect(settledPeak(out)).toBeLessThan(0.3);
  });
});
