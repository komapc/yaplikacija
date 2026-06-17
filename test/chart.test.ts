import { describe, it, expect, beforeAll } from "vitest";
import { drawFormantChart } from "../src/ui/formantChart";
import { TARGETS } from "../src/trainers/targets";

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
});
