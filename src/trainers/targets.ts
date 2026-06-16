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
    // High, central vowel: low F1, mid F2 (between front [i] ~2200 and back [u] ~850).
    f1: { center: 350, tolerance: 130 },
    f2: { center: 1500, tolerance: 280 },
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
    f1: { center: 700, tolerance: 180 },
    f2: { center: 1150, tolerance: 250 },
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

export function scoreAttempt(target: SoundTarget, result: AnalysisResult): Score {
  if (result.voicedRatio < 0.15 || result.frames.length < 3) {
    return {
      overall: 0,
      f1Score: 0,
      f2Score: 0,
      feedback: "I did not hear a sustained voiced sound. Hold the sound steady for about a second.",
    };
  }

  const f1Score = dimensionScore(result.f1, target.f1);
  const f2Score = dimensionScore(result.f2, target.f2);
  // F2 (front/back position) is the decisive cue for both sounds, so weight it.
  const overall = Math.round(0.4 * f1Score + 0.6 * f2Score);

  return { overall, f1Score, f2Score, feedback: buildFeedback(target, result, overall) };
}

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

  const notes: string[] = [];
  if (result.f2 > target.f2.center + target.f2.tolerance) notes.push(target.mistakes.f2TooHigh);
  else if (result.f2 < target.f2.center - target.f2.tolerance) notes.push(target.mistakes.f2TooLow);

  if (result.f1 > target.f1.center + target.f1.tolerance) notes.push(target.mistakes.f1TooHigh);
  else if (result.f1 < target.f1.center - target.f1.tolerance) notes.push(target.mistakes.f1TooLow);

  if (notes.length === 0) return "Close — nudge it a little nearer the center of the target.";
  return notes.join(" ");
}
