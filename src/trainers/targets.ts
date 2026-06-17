// Phonetic targets for each trainable sound.
//
// Formant reference values are adult-speaker midpoints from the phonetics
// literature; ranges are deliberately generous because LPC estimates from a
// browser mic are noisy. Tuning these is the main "knob" for difficulty.

import type { AnalysisResult } from "../dsp/analyze";

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
    language: "Russian",
    prompt: "Say a long «ы» — as in мы, ты, сын.",
    hint: "Like «и», but pull the tongue back toward your throat and keep lips unrounded. Smile slightly, do not pucker.",
    // High, central vowel: low F1 (tight — F1 is what separates ы from open
    // vowels like [e]/сэн), mid F2 between front [i] ~2200 and back [u] ~850.
    f1: { center: 340, tolerance: 65 },
    f2: { center: 1450, tolerance: 230 },
    // F2 (tongue front/back) is the decisive cue: confusing «и»/«у» is an F2 error.
    weights: { f1: 0.4, f2: 0.6 },
    // NOTE: F2/F3-ratio scoring (speaker normalisation) was tried and reverted —
    // F3 is too noisy on short CVC words (±200-450 Hz vs Praat), and dividing by
    // it let wrong vowels pass (и scored 73 as ы). Absolute F2 rejects them (~45).
    // Re-enable by setting `f2f3` once F3 estimation is robust enough.
    mistakes: {
      f2TooHigh: "That sounded like «и» — your tongue is too far forward. Pull it back toward the throat.",
      f2TooLow: "That drifted toward «у» — relax the back of the tongue and spread the lips a little.",
      f1TooHigh: "Vowel is too open (like «э/а»). Raise the tongue higher, closer to the roof.",
      f1TooLow: "Vowel is very closed — that is fine for «ы»; focus on the front/back position.",
    },
  },
  ain: {
    id: "ain",
    letter: "ע",
    title: "עפליקציה ע",
    ipa: "[ʕ]",
    language: "Hebrew / Arabic",
    prompt: "Produce a voiced «ע / ع» — a tight, voiced sound deep in the throat.",
    hint: "Constrict the pharynx (root of the tongue toward the back wall) and keep voicing, as if gently choking while humming. Not a glottal stop, not an «h».",
    // Pharyngeal constriction: raised F1, low F2 — the two move toward each other.
    f1: { center: 700, tolerance: 125 },
    f2: { center: 1150, tolerance: 175 },
    // A consonant ([ʕ]), but voiced and continuant, so its formants are
    // measurable. The signature of pharyngeal constriction is a RAISED F1,
    // so F1 is the decisive cue here — the opposite weighting from Ы.
    weights: { f1: 0.6, f2: 0.4 },
    mistakes: {
      f2TooHigh: "Too far forward / too vowel-like. Pull the tongue root back and tighten the throat.",
      f2TooLow: "Going toward a back rounded vowel — keep it tense and voiced, do not round the lips.",
      f1TooHigh: "Constriction may be too low (glottal). Move the squeeze up into the pharynx.",
      f1TooLow: "Not enough pharyngeal constriction — squeeze harder at the root of the tongue.",
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

export function scoreAttempt(target: SoundTarget, result: AnalysisResult): Score {
  if (result.voicedRatio < 0.15 || result.frames.length < 3) {
    return {
      overall: 0,
      f1Score: 0,
      f2Score: 0,
      feedback: "I did not hear a sustained voiced sound. Hold the sound steady for about a second.",
    };
  }

  const t = adaptTarget(target, result);
  const f1Score = dimensionScore(result.f1, t.f1);
  const f2Score = dimensionScore(result.f2, t.f2);
  // Combine the two formants NON-compensatively (weighted Euclidean distance in
  // tolerance units): being off in either formant lowers the score. A plain
  // weighted average let a good F2 mask a wrong F1 — e.g. [e] (сэн), which has
  // ы-like F2 but a much higher F1, scored as ы.
  const { f1: w1, f2: w2 } = t.weights;
  const d1 = (result.f1 - t.f1.center) / t.f1.tolerance;
  const d2 = (result.f2 - t.f2.center) / t.f2.tolerance;
  const dist = Math.sqrt((w1 * d1 * d1 + w2 * d2 * d2) / (w1 + w2));
  const overall = Math.max(0, Math.round(100 * (1 - dist / 3)));

  let feedback = buildFeedback(t, result, overall);
  // If the vowel was not held steadily (F2 wandered more than a tolerance width),
  // the reading is shaky regardless of where it landed — say so first.
  if (overall < 85 && result.spread > STEADY_SPREAD) {
    feedback = `Hold the vowel steadier — it wandered a lot. ${feedback}`;
  }
  return { overall, f1Score, f2Score, feedback };
}

/** F2 spread (Hz) above which an attempt counts as "not held steady". Roughly a
 * full F2 tolerance width — by then the sound moved more than the target zone. */
const STEADY_SPREAD = 250;

function dimensionScore(value: number, t: FormantTarget): number {
  const dist = Math.abs(value - t.center);
  if (dist <= t.tolerance) {
    // Within zone: 80–100 based on closeness to center.
    return Math.round(100 - 20 * (dist / t.tolerance));
  }
  // Outside: decay toward 0 over another two tolerances.
  const over = (dist - t.tolerance) / (2 * t.tolerance);
  return Math.max(0, Math.round(80 * (1 - over)));
}

function buildFeedback(target: SoundTarget, result: AnalysisResult, overall: number): string {
  if (overall >= 85) return "Excellent — that is right in the target zone. 🎯";

  const f1Note = dimensionNote(result.f1, target.f1, target.mistakes.f1TooHigh, target.mistakes.f1TooLow);
  const f2Note = dimensionNote(result.f2, target.f2, target.mistakes.f2TooHigh, target.mistakes.f2TooLow);

  // Lead with the note for the formant that matters most for this sound.
  const ordered = target.weights.f1 >= target.weights.f2 ? [f1Note, f2Note] : [f2Note, f1Note];
  const notes = ordered.filter((n): n is string => n !== null);

  if (notes.length === 0) return "Close — nudge it a little nearer the center of the target.";
  return notes.join(" ");
}

function dimensionNote(value: number, t: FormantTarget, tooHigh: string, tooLow: string): string | null {
  if (value > t.center + t.tolerance) return tooHigh;
  if (value < t.center - t.tolerance) return tooLow;
  return null;
}
