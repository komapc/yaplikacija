// Amplitude envelope of a recording with the analysed segment highlighted, so
// the learner sees WHICH part of the take was scored (the vowel nucleus).

export function drawWaveform(
  canvas: HTMLCanvasElement,
  samples: Float32Array,
  sampleRate: number,
  region: { startSec: number; endSec: number } | null,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w <= 0 || h <= 0 || samples.length === 0) return; // not laid out / nothing to draw
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const durSec = samples.length / sampleRate;
  const xOf = (sec: number) => Math.max(0, Math.min(w, (sec / durSec) * w));

  if (region) {
    // Frames are 25 ms wide: extend the end by one frame so the band covers the last scored frame.
    const x0 = xOf(region.startSec);
    const x1 = Math.max(xOf(region.endSec + 0.025), x0 + 2);
    ctx.fillStyle = "rgba(47, 227, 155, 0.18)";
    ctx.fillRect(x0, 0, x1 - x0, h);
    ctx.strokeStyle = "rgba(47, 227, 155, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, 0.5, x1 - x0 - 1, h - 1);
  }

  // One min/max bar per pixel column: cheap and shows peaks faithfully.
  const mid = h / 2;
  const perCol = samples.length / w;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak === 0) return;
  const scale = (mid - 2) / peak;
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let cx = 0; cx < w; cx++) {
    const lo = Math.floor(cx * perCol);
    const hi = Math.min(samples.length, Math.max(lo + 1, Math.floor((cx + 1) * perCol)));
    let mn = 0;
    let mx = 0;
    for (let i = lo; i < hi; i++) {
      const v = samples[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    ctx.fillRect(cx, mid - mx * scale, 1, Math.max(1, (mx - mn) * scale));
  }
}
