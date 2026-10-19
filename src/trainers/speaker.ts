// Per-speaker vowel-space scale. Target zones and vowel centroids are adult-male
// midpoints, so a shorter vocal tract (women, children) reads systematically
// high and loses points on a correct vowel. One sustained «а» measures how far
// this speaker's formants sit from the reference «а»; scoring then divides the
// measured F1/F2 by that scale before comparing with the shared targets.

/** Reference «а» (same centroid as trainers/vowels.ts). */
const REF_A = { f1: 700, f2: 1300 } as const;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.4;
const KEY = "speaker-scale";

/** Scale factor from a measured «а»: mean of the F1 and F2 ratios, clamped to a
 * plausible vocal-tract range. Null when the measurement is unusable. */
export function scaleFromA(f1: number, f2: number): number | null {
  if (!(f1 > 0) || !(f2 > 0)) return null;
  const s = (f1 / REF_A.f1 + f2 / REF_A.f2) / 2;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

let scale = 1;
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const v = Number(localStorage.getItem(KEY));
    if (v >= MIN_SCALE && v <= MAX_SCALE) scale = v;
  } catch {
    /* storage unavailable: stay uncalibrated */
  }
}

export function getSpeakerScale(): number {
  load();
  return scale;
}

/** Set (or, with null, clear) the scale and persist it on this device only. */
export function setSpeakerScale(s: number | null): void {
  loaded = true;
  scale = s === null ? 1 : s;
  try {
    if (s === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(s));
  } catch {
    /* ignore */
  }
}

export function isCalibrated(): boolean {
  return getSpeakerScale() !== 1;
}
