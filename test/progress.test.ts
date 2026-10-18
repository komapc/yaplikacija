// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getBest, recordScore } from "../src/progress";
import { drawWaveform } from "../src/ui/waveform";

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("keeps only the best score", () => {
    expect(getBest("my")).toBeNull();
    expect(recordScore("my", 60)).toEqual({ best: 60, improved: true });
    expect(recordScore("my", 40)).toEqual({ best: 60, improved: false });
    expect(recordScore("my", 60)).toEqual({ best: 60, improved: false });
    expect(recordScore("my", 85)).toEqual({ best: 85, improved: true });
    expect(getBest("my")).toBe(85);
  });

  it("does not record a zero as an improvement", () => {
    expect(recordScore("ty", 0)).toEqual({ best: 0, improved: false });
    expect(getBest("ty")).toBeNull();
  });

  it("still works when storage throws", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
    try {
      expect(() => recordScore("syn", 70)).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});

describe("drawWaveform", () => {
  const canvas = (w: number, h: number) =>
    ({ clientWidth: w, clientHeight: h, width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {} }) }) as unknown as HTMLCanvasElement;
  const tone = new Float32Array(16000).map((_, i) => Math.sin(i / 10));

  it("draws with and without a region, and bails on unsized / empty input", () => {
    expect(() => drawWaveform(canvas(300, 72), tone, 16000, { startSec: 0.2, endSec: 0.5 })).not.toThrow();
    expect(() => drawWaveform(canvas(300, 72), tone, 16000, null)).not.toThrow();
    expect(() => drawWaveform(canvas(0, 0), tone, 16000, null)).not.toThrow();
    expect(() => drawWaveform(canvas(300, 72), new Float32Array(0), 16000, null)).not.toThrow();
    expect(() => drawWaveform(canvas(300, 72), new Float32Array(100), 16000, null)).not.toThrow();
  });
});
