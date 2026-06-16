// Word-level exercises for the Ы trainer.
//
// Each word drills Ы in a different phonetic context (after labials, dentals,
// sibilants, the trill р…), because coarticulation shifts the vowel's formants.
//
// `target` holds the EXPECTED Ы formants for this word. The values below are
// seeded with the global Ы zone and are meant to be overwritten by the
// calibration step (scripts/calibrate-exercises.ts), which measures them from
// native-speaker recordings using the same DSP that grades the learner.

import { TARGETS, type SoundTarget } from "./targets";
import { CALIBRATED } from "./exercise-targets.generated";

export interface WordExercise {
  id: string; // ascii slug, also the audio filename stem
  text: string; // Cyrillic
  translit: string;
  ipa: string;
  gloss: string;
  audioUrl: string; // relative; "" when no reference recording is available
  target: { f1: number; f2: number }; // expected Ы formants (calibrated or seed)
  attribution: string; // source + license for the reference audio
}

const SEED = { f1: TARGETS.yery.f1.center, f2: TARGETS.yery.f2.center };

// Manual target overrides for ты/дым. Their Ы genuinely measures very fronted
// (F2 ~1900, verified with anti-aliased resampling — not a measurement artifact)
// because the high F2 locus of the coronal stop [t]/[d] colours the short vowel.
// That is real coarticulation, but too [i]-like to use as a teaching target, so
// we pin a canonical, lightly-fronted citation Ы. Native reference audio is kept.
const MANUAL_TARGETS: Record<string, { f1: number; f2: number }> = {
  ty: { f1: 350, f2: 1550 },
  dym: { f1: 350, f2: 1500 },
};

// Merge the curated word with calibration output and any manual override.
function word(
  id: string,
  text: string,
  translit: string,
  ipa: string,
  gloss: string,
): WordExercise {
  const cal = CALIBRATED[id];
  const target = MANUAL_TARGETS[id] ?? (cal ? { f1: cal.f1, f2: cal.f2 } : { ...SEED });
  return {
    id,
    text,
    translit,
    ipa,
    gloss,
    audioUrl: cal?.audio ?? "",
    target,
    attribution: cal?.attribution ?? "",
  };
}

// Starter list — short (1–2 syllable) words spanning Ы contexts.
export const YERY_EXERCISES: WordExercise[] = [
  word("my", "мы", "my", "[mɨ]", "we"),
  word("ty", "ты", "ty", "[tɨ]", "you (sg.)"),
  word("vy", "вы", "vy", "[vɨ]", "you (pl.)"),
  word("syn", "сын", "syn", "[sɨn]", "son"),
  word("syr", "сыр", "syr", "[sɨr]", "cheese"),
  word("dym", "дым", "dym", "[dɨm]", "smoke"),
  word("byl", "был", "byl", "[bɨl]", "was"),
  word("byk", "бык", "byk", "[bɨk]", "bull"),
  word("ryba", "рыба", "ryba", "[ˈrɨbə]", "fish"),
  word("mysh", "мышь", "myš", "[mɨʂ]", "mouse"),
  word("mylo", "мыло", "mylo", "[ˈmɨlə]", "soap"),
  word("mytsya", "мыться", "myt'sja", "[ˈmɨt͡sːə]", "to wash oneself"),
  word("yazyk", "язык", "jazyk", "[jɪˈzɨk]", "tongue / language"),
];

/**
 * Build a per-word scoring target by reusing the global Ы tolerances, weights,
 * mistakes and glyph, but centering on this word's calibrated formants — so
 * `scoreAttempt` and `drawFormantChart` work unchanged.
 */
export function exerciseTarget(ex: WordExercise): SoundTarget {
  const base = TARGETS.yery;
  return {
    ...base,
    f1: { ...base.f1, center: ex.target.f1 },
    f2: { ...base.f2, center: ex.target.f2 },
  };
}
