// Phonetic targets for each trainable sound.
//
// Formant reference values are adult-speaker midpoints from the phonetics
// literature; ranges are deliberately generous because LPC estimates from a
// browser mic are noisy. Tuning these is the main "knob" for difficulty.

import type { AnalysisResult } from "../dsp/analyze";
import { YERY_CENTER, yeryDominance } from "./vowels";
import { t } from "../i18n";
import { getSpeakerScale } from "./speaker";

export interface FormantTarget {
  center: number; // Hz
  tolerance: number; // Hz, full half-width of the "good" zone
}

export interface SoundTarget {
  id: "yery" | "ain";
  letter: string; // big glyph shown in UI
  title: string; // localized app name
  ipa: string;
  language: string;
  prompt: string; // what to say
  hint: string; // articulatory cue
  f1: FormantTarget;
  f2: FormantTarget;
  /**
   * Relative importance of each formant for THIS sound (should sum to 1).
   * The decisive cue differs by sound: tongue front/back (F2) defines Ы,
   * whereas pharyngeal constriction (raised F1) defines Ain.
   */
  weights: { f1: number; f2: number };
  /**
   * DORMANT (see the note on `yery`): no target sets this today.
   * Optional target F2/F3 ratio. When set and the attempt has a usable F3, the
   * F2 target centre is taken as `f2f3 × F3` instead of the absolute `f2.center`
   * — a speaker-normalised "frontness" target (the ratio cancels vocal-tract
   * length, so the same value works for men/women/children without calibration).
   */
  f2f3?: number;
  /** Direction of the most common mistake, used for targeted feedback. */
  mistakes: {
    f2TooHigh: string; // F2 above zone
    f2TooLow: string; // F2 below zone
    f1TooHigh: string;
    f1TooLow: string;
  };
}

export const TARGETS: Record<SoundTarget["id"], SoundTarget> = {
  yery: {
    id: "yery",
    letter: "Ы",
    title: "Аппликация Ы",
    ipa: "[ɨ]",
    // Localised text is read through getters so it follows the active language.
    get language() { return t("yery.language"); },
    get prompt() { return t("yery.prompt"); },
    get hint() { return t("yery.hint"); },
    // High, central vowel: low F1 (tight — F1 is what separates ы from open
    // vowels like [e]/сэн), mid F2 between front [i] ~2200 and back [u] ~850.
    f1: { center: YERY_CENTER.f1, tolerance: 65 },
    f2: { center: YERY_CENTER.f2, tolerance: 230 },
    // F2 (tongue front/back) is the decisive cue: confusing «и»/«у» is an F2 error.
    weights: { f1: 0.4, f2: 0.6 },
    // NOTE: F2/F3-ratio scoring (speaker normalisation) was tried and reverted —
    // F3 is too noisy on short CVC words (±200-450 Hz vs Praat), and dividing by
    // it let wrong vowels pass (и scored 73 as ы). Absolute F2 rejects them (~45).
    // Re-enable by setting `f2f3` once F3 estimation is robust enough.
    mistakes: {
      get f2TooHigh() { return t("yery.f2TooHigh"); },
      get f2TooLow() { return t("yery.f2TooLow"); },
      get f1TooHigh() { return t("yery.f1TooHigh"); },
      get f1TooLow() { return t("yery.f1TooLow"); },
    },
  },
  ain: {
    id: "ain",
    letter: "ע",
    title: "עפליקציה ע",
    ipa: "[ʕ]",
    get language() { return t("ain.language"); },
    get prompt() { return t("ain.prompt"); },
    get hint() { return t("ain.hint"); },
    // KNOWN LIMITATION (trainer is hidden in the app for this reason): this zone
    // nearly coincides with plain [a] (700/1300), so an ordinary «а» scores high.
    // Formants alone cannot separate pharyngealisation; it would need spectral
    // tilt / intensity / creak cues before this target can be shown to users.
    // Pharyngeal constriction: raised F1, low F2 — the two move toward each other.
    f1: { center: 700, tolerance: 125 },
    f2: { center: 1150, tolerance: 175 },
    // A consonant ([ʕ]), but voiced and continuant, so its formants are
    // measurable. The signature of pharyngeal constriction is a RAISED F1,
    // so F1 is the decisive cue here — the opposite weighting from Ы.
    weights: { f1: 0.6, f2: 0.4 },
    mistakes: {
      get f2TooHigh() { return t("ain.f2TooHigh"); },
      get f2TooLow() { return t("ain.f2TooLow"); },
      get f1TooHigh() { return t("ain.f1TooHigh"); },
      get f1TooLow() { return t("ain.f1TooLow"); },
    },
  },
};

export interface Score {
  overall: number; // 0..100
  f1Score: number;
  f2Score: number;
  feedback: string;
}

/**
 * DORMANT scaffolding — a no-op until a target sets `f2f3`.
 * Speaker-normalise the F2 target: when the sound defines a target F2/F3 ratio
 * and the attempt has a usable F3, place the F2 target at `f2f3 × F3`. This
 * cancels vocal-tract length, so a man, woman or child are all judged against
 * the right F2 for their own tract — no per-user calibration. Falls back to the
 * absolute F2 centre when no F3 is available.
 */
export function adaptTarget(target: SoundTarget, result: { f3: number }): SoundTarget {
  if (target.f2f3 && result.f3 > 0) {
    return { ...target, f2: { ...target.f2, center: Math.round(target.f2f3 * result.f3) } };
  }
  return target;
}

/** Map this speaker's formants into the reference vowel space the targets are
 * defined in (a no-op until the user calibrates). Used for scoring and so the
 * chart plots the attempt where the scorer saw it. */
export function toReferenceSpace(measured: AnalysisResult): AnalysisResult {
  const k = getSpeakerScale();
  if (k === 1) return measured;
  return { ...measured, f1: measured.f1 / k, f2: measured.f2 / k, f3: measured.f3 / k };
}

export function scoreAttempt(target: SoundTarget, measured: AnalysisResult): Score {
  const result = toReferenceSpace(measured);

  if (result.voicedRatio < 0.15 || result.frames.length < 3) {
    return {
      overall: 0,
      f1Score: 0,
      f2Score: 0,
      feedback: t("score.none"),
    };
  }

  // Sound mode: a click of voicing is not a held vowel. Word results carry no
  // `sustainedFrames` (their nucleus has its own minimum duration).
  if (result.sustainedFrames !== undefined && result.sustainedFrames < MIN_SUSTAINED_FRAMES) {
    return { overall: 0, f1Score: 0, f2Score: 0, feedback: t("score.short") };
  }

  const tg = adaptTarget(target, result);
  const f1Score = dimensionScore(result.f1, tg.f1);
  const f2Score = dimensionScore(result.f2, tg.f2);
  // Combine the two formants NON-compensatively (weighted Euclidean distance in
  // tolerance units): being off in either formant lowers the score. A plain
  // weighted average let a good F2 mask a wrong F1 — e.g. [e] (сэн), which has
  // ы-like F2 but a much higher F1, scored as ы.
  const { f1: w1, f2: w2 } = tg.weights;
  const d1 = (result.f1 - tg.f1.center) / tg.f1.tolerance;
  const d2 = (result.f2 - tg.f2.center) / tg.f2.tolerance;
  const dist = Math.sqrt((w1 * d1 * d1 + w2 * d2 * d2) / (w1 + w2));
  let overall = Math.max(0, Math.round(100 * (1 - dist / 3)));
  // Competitor gate (Ы only): distance-to-target alone can't tell "near the ы
  // zone" from "actually a different vowel that overlaps it" — e.g. a back
  // speaker whose э sits in the ы F2 band. Suppress the score unless ы is the
  // NEAREST Russian vowel, so an attempt that is really э/и can't read as a good
  // ы. Uses shared centroids (relative geometry), not per-user calibration.
  if (tg.id === "yery") {
    overall = Math.round(overall * yeryDominance(result.f1, result.f2));
  }

  let feedback = buildFeedback(tg, result, overall);
  // If the vowel was not held steadily (F2 wandered more than a tolerance width),
  // the reading is shaky regardless of where it landed — say so first.
  if (overall < 85 && result.spread > STEADY_SPREAD) {
    feedback = t("score.steadier", { rest: feedback });
  }
  return { overall, f1Score, f2Score, feedback };
}

/** Minimum steady voiced frames (10 ms hop ⇒ ~150 ms) for a sound-mode score. */
const MIN_SUSTAINED_FRAMES = 15;

/** F2 spread (Hz) above which an attempt counts as "not held steady". Roughly a
 * full F2 tolerance width — by then the sound moved more than the target zone. */
const STEADY_SPREAD = 250;

function dimensionScore(value: number, ft: FormantTarget): number {
  const dist = Math.abs(value - ft.center);
  if (dist <= ft.tolerance) {
    // Within zone: 80–100 based on closeness to center.
    return Math.round(100 - 20 * (dist / ft.tolerance));
  }
  // Outside: decay toward 0 over another two tolerances.
  const over = (dist - ft.tolerance) / (2 * ft.tolerance);
  return Math.max(0, Math.round(80 * (1 - over)));
}

function buildFeedback(target: SoundTarget, result: AnalysisResult, overall: number): string {
  if (overall >= 85) return t("score.excellent");

  const f1Note = dimensionNote(result.f1, target.f1, target.mistakes.f1TooHigh, target.mistakes.f1TooLow);
  const f2Note = dimensionNote(result.f2, target.f2, target.mistakes.f2TooHigh, target.mistakes.f2TooLow);

  // Lead with the note for the formant that matters most for this sound.
  const ordered = target.weights.f1 >= target.weights.f2 ? [f1Note, f2Note] : [f2Note, f1Note];
  const notes = ordered.filter((n): n is string => n !== null);

  if (notes.length === 0) return t("score.close");
  return notes.join(" ");
}

function dimensionNote(value: number, ft: FormantTarget, tooHigh: string, tooLow: string): string | null {
  if (value > ft.center + ft.tolerance) return tooHigh;
  if (value < ft.center - ft.tolerance) return tooLow;
  return null;
}
