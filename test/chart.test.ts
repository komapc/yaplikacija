import { describe, it, expect, beforeAll } from "vitest";
import { drawFormantChart } from "../src/ui/formantChart";
import { TARGETS } from "../src/trainers/targets";
import type { AnalysisResult } from "../src/dsp/analyze";

function resultWithCloud(f1: number, f2: number): AnalysisResult {
  const frames = Array.from({ length: 12 }, (_, i) => ({
    timeSec: i * 0.01,
    f0: 120,
    f1: f1 + (i % 3) * 8,
    f2: f2 + (i % 4) * 12,
    f3: 2500,
    rms: 0.2,
    b1: 80,
    b2: 100,
  }));
  return { f1, f2, f3: 2500, voicedRatio: 1, spread: 40, frames };
}

// A canvas whose 2D context throws on negative radii, like real browsers — to
// guard against the "drawn while detached (0×0) → negative ellipse radius →
// DOMException → blank page" regression.
function canvas(w: number, h: number): HTMLCanvasElement {
  const ctx = new Proxy(
    {},
    {
      get: (_t, p) => {
        if (p === "ellipse") return (...a: number[]) => { if (a[2] < 0 || a[3] < 0) throw new Error("IndexSizeError"); };
        if (p === "arc") return (...a: number[]) => { if (a[2] < 0) throw new Error("IndexSizeError"); };
        if (p === "measureText") return () => ({ width: 10 });
        return () => {};
      },
    },
  );
  return { clientWidth: w, clientHeight: h, width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

describe("drawFormantChart", () => {
  beforeAll(() => {
    (globalThis as unknown as { window: unknown }).window = { devicePixelRatio: 1 };
  });

  it("does not throw when the canvas has no size (drawn before attach)", () => {
    expect(() => drawFormantChart(canvas(0, 0), TARGETS.yery, null)).not.toThrow();
  });

  it("draws at a real size without throwing", () => {
    expect(() => drawFormantChart(canvas(360, 240), TARGETS.yery, null)).not.toThrow();
  });

  it("draws the dartboard rings + attempt ellipse for an in-view result", () => {
    expect(() => drawFormantChart(canvas(360, 240), TARGETS.yery, resultWithCloud(350, 1500))).not.toThrow();
  });

  it("draws the off-chart arrow without throwing for a far result", () => {
    expect(() => drawFormantChart(canvas(360, 240), TARGETS.yery, resultWithCloud(350, 3200))).not.toThrow();
  });
});
