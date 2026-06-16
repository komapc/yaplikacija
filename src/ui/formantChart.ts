// Canvas "vowel chart": F2 on the X axis (high→low, left→right, the linguistic
// convention) and F1 on the Y axis (low→high, top→bottom). Draws the target
// zone as an ellipse and the user's attempt as a dot, plus reference anchors.

import type { SoundTarget } from "../trainers/targets";
import type { AnalysisResult } from "../dsp/analyze";

// Axis ranges chosen to comfortably hold both sounds and the [i a u] anchors.
const F2_MIN = 600;
const F2_MAX = 2600;
const F1_MIN = 200;
const F1_MAX = 1000;

const ANCHORS: { label: string; f1: number; f2: number }[] = [
  { label: "и/i", f1: 300, f2: 2200 },
  { label: "у/u", f1: 320, f2: 850 },
  { label: "а/a", f1: 750, f2: 1300 },
  { label: "э/e", f1: 500, f2: 1900 },
];

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

  const pad = 36;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  const x = (f2: number) => pad + (1 - (f2 - F2_MIN) / (F2_MAX - F2_MIN)) * plotW;
  const y = (f1: number) => pad + ((f1 - F1_MIN) / (F1_MAX - F1_MIN)) * plotH;

  // Frame + grid.
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, plotW, plotH);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("F2 (front ← → back)", pad, pad - 14);
  ctx.save();
  ctx.translate(14, pad + plotH);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("F1 (close ← → open)", 0, 0);
  ctx.restore();

  // Reference vowel anchors.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (const a of ANCHORS) {
    const ax = x(a.f2);
    const ay = y(a.f1);
    ctx.beginPath();
    ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(a.label, ax + 5, ay + 4);
  }

  // Target zone ellipse (radii from tolerances).
  const cx = x(target.f2.center);
  const cy = y(target.f1.center);
  const rx = (target.f2.tolerance / (F2_MAX - F2_MIN)) * plotW;
  const ry = (target.f1.tolerance / (F1_MAX - F1_MIN)) * plotH;
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

  // Faint trail of every voiced frame, then a bold dot at the median.
  ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
  for (const f of result.frames) {
    if (f.f2 < F2_MIN || f.f2 > F2_MAX || f.f1 < F1_MIN || f.f1 > F1_MAX) continue;
    ctx.beginPath();
    ctx.arc(x(f.f2), y(f.f1), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const ux = x(result.f2);
  const uy = y(result.f1);
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
