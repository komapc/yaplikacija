// Voicing / pitch estimation via normalised autocorrelation.
//
// We only score frames that are actually voiced — both target sounds (Ы and
// Ain) are voiced, and unvoiced/silent frames would otherwise feed garbage
// formants into the chart.

export interface Voicing {
  voiced: boolean;
  f0: number; // Hz, 0 when unvoiced
  rms: number;
}

export function analyzeVoicing(
  frame: Float32Array,
  sampleRate: number,
  rmsThreshold = 0.012,
): Voicing {
  let energy = 0;
  for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
  const rms = Math.sqrt(energy / frame.length);
  if (rms < rmsThreshold) return { voiced: false, f0: 0, rms };

  // Search the lag range for human pitch: ~70–400 Hz.
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.min(Math.floor(sampleRate / 70), frame.length - 1);

  let bestLag = -1;
  let bestCorr = 0;
  const r0 = energy || 1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = lag; i < frame.length; i++) sum += frame[i] * frame[i - lag];
    const norm = sum / r0;
    if (norm > bestCorr) {
      bestCorr = norm;
      bestLag = lag;
    }
  }

  // A clear periodic peak (> ~0.3 normalised) marks a voiced frame.
  if (bestLag > 0 && bestCorr > 0.3) {
    return { voiced: true, f0: sampleRate / bestLag, rms };
  }
  return { voiced: false, f0: 0, rms };
}
