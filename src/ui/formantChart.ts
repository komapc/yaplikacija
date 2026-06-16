// Canvas "vowel chart": F2 on the X axis (high→low, left→right, the linguistic
// convention) and F1 on the Y axis (low→high, top→bottom). The view zooms to
// the neighbourhood of the current target so the interesting region fills the
// chart; reference anchors that fall inside the view are drawn for orientation.
// If the user's result lands outside the view, an arrow at the edge points
// toward it instead of dropping it.

import type { SoundTarget } from "../trainers/targets";
import type { AnalysisResult, FrameResult } from "../dsp/analyze";

const ANCHORS: { label: string; f1: number; f2: number }[] = [
  { label: "и/i", f1: 300, f2: 2200 },
  { label: "у/u", f1: 320, f2: 850 },
  { label: "а/a", f1: 750, f2: 1300 },
  { label: "э/e", f1: 500, f2: 1900 },
];

// Drop the onset/offset of the recording and cap the cloud size for legibility.
const STEADY_TRIM = 0.2;
const MAX_CLOUD_DOTS = 24;

export function drawFormantChart(
  canvas: HTMLCanvasElement,
  target: SoundTarget,
  result: AnalysisResult | null,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = 34;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  // View bounds: zoom to the target neighbourhood (a bit beyond its tolerance)…
  const f2Half = Math.max(target.f2.tolerance * 2.4, 520);
  const f1Half = Math.max(target.f1.tolerance * 2.4, 240);
  let f2Min = target.f2.center - f2Half;
  let f2Max = target.f2.center + f2Half;
  let f1Min = target.f1.center - f1Half;
  let f1Max = target.f1.center + f1Half;

  // …then expand each axis to keep nearby contrast vowels on the map (for Ы the
  // и/у anchors must stay visible — confusing them is the whole point), without
  // pulling in distant ones (Ain stays tight).
  const ctxF2 = target.f2.tolerance * 2.6;
  const ctxF1 = target.f1.tolerance * 2.6;
  for (const a of ANCHORS) {
    if (Math.abs(a.f2 - target.f2.center) <= ctxF2) {
      f2Min = Math.min(f2Min, a.f2 - 130);
      f2Max = Math.max(f2Max, a.f2 + 130);
    }
    if (Math.abs(a.f1 - target.f1.center) <= ctxF1) {
      f1Min = Math.min(f1Min, a.f1 - 70);
      f1Max = Math.max(f1Max, a.f1 + 70);
    }
  }
  f1Min = Math.max(110, f1Min);

  const x = (f2: number) => pad + (1 - (f2 - f2Min) / (f2Max - f2Min)) * plotW;
  const y = (f1: number) => pad + ((f1 - f1Min) / (f1Max - f1Min)) * plotH;
  const inView = (f1: number, f2: number) => f2 >= f2Min && f2 <= f2Max && f1 >= f1Min && f1 <= f1Max;

  // Frame + labels.
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, plotW, plotH);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText("F2 (front ← → back)", pad, pad - 12);
  ctx.save();
  ctx.translate(13, pad + plotH);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("F1 (close ← → open)", 0, 0);
  ctx.restore();

  // Reference anchors that fall inside the zoomed view.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "11px system-ui, sans-serif";
  for (const a of ANCHORS) {
    if (!inView(a.f1, a.f2)) continue;
    const ax = x(a.f2);
    const ay = y(a.f1);
    ctx.beginPath();
    ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(a.label, ax + 5, ay + 4);
  }

  // Target zone: axis-aligned ellipse at the true per-formant tolerances.
  const cx = x(target.f2.center);
  const cy = y(target.f1.center);
  const rx = (target.f2.tolerance / (f2Max - f2Min)) * plotW;
  const ry = (target.f1.tolerance / (f1Max - f1Min)) * plotH;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(72, 199, 142, 0.18)";
  ctx.strokeStyle = "rgba(72, 199, 142, 0.7)";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(72, 199, 142, 0.9)";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(`${target.letter} target`, cx - 22, cy + 4);

  if (!result || result.frames.length === 0) return;

  // Faint trail of the steady portion (thinned).
  ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
  for (const f of steadyThinnedFrames(result.frames)) {
    if (!inView(f.f1, f.f2)) continue;
    ctx.beginPath();
    ctx.arc(x(f.f2), y(f.f1), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (inView(result.f1, result.f2)) {
    drawYouDot(ctx, x(result.f2), y(result.f1));
  } else {
    // Off-chart: clamp to the edge and point an arrow toward the true location.
    const tx = x(result.f2);
    const ty = y(result.f1);
    const ex = clamp(tx, pad + 14, pad + plotW - 14);
    const ey = clamp(ty, pad + 14, pad + plotH - 14);
    const angle = Math.atan2(ty - ey, tx - ex);
    drawArrow(ctx, ex, ey, angle);
  }
}

function drawYouDot(ctx: CanvasRenderingContext2D, ux: number, uy: number): void {
  ctx.beginPath();
  ctx.arc(ux, uy, 7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 107, 107, 0.95)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("you", ux + 10, uy + 4);
}

/** Arrowhead at an edge pointing toward the off-chart result. */
function drawArrow(ctx: CanvasRenderingContext2D, ex: number, ey: number, angle: number): void {
  const size = 11;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.7);
  ctx.lineTo(-size * 0.7, -size * 0.7);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 107, 107, 0.95)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("you (off-chart)", clampLabel(ex), ey - 12);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Keep the off-chart label from running past the right edge.
function clampLabel(ex: number): number {
  return Math.max(6, ex - 36);
}

/**
 * Trim the onset/offset of the recording and thin the remaining frames to at
 * most MAX_CLOUD_DOTS, so the cloud shows the stable middle of the sound.
 */
function steadyThinnedFrames(frames: FrameResult[]): FrameResult[] {
  if (frames.length < 8) return frames;

  const t0 = frames[0].timeSec;
  const t1 = frames[frames.length - 1].timeSec;
  const margin = (t1 - t0) * STEADY_TRIM;
  const steady = frames.filter((f) => f.timeSec >= t0 + margin && f.timeSec <= t1 - margin);

  const base = steady.length >= 5 ? steady : frames;
  const step = Math.max(1, Math.ceil(base.length / MAX_CLOUD_DOTS));
  return base.filter((_, i) => i % step === 0);
}
