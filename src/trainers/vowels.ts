// Rough multi-vowel classifier for the games (Duel, Falling). Nearest centroid
// in (F1, F2), normalised by approximate per-formant spreads. Centroids are
// adult-range midpoints — fine for a game (looser than the trainer's scoring).

export type VowelId = "и" | "ы" | "э" | "а" | "о" | "у";

/** Canonical Ы centre (Hz) — single source: the trainer's target zone and the
 * vowel-classifier centroid below both use it, so they cannot drift apart. */
export const YERY_CENTER = { f1: 340, f2: 1450 } as const;

interface Centroid {
  id: VowelId;
  f1: number;
  f2: number;
}

const CENTROIDS: Centroid[] = [
  { id: "и", f1: 330, f2: 2100 },
  { id: "э", f1: 500, f2: 1800 },
  { id: "ы", ...YERY_CENTER },
  { id: "а", f1: 700, f2: 1300 },
  { id: "о", f1: 480, f2: 1000 },
  { id: "у", f1: 330, f2: 800 },
];

// Normalisers ≈ how much a Hz step "matters" per formant (F1 range is smaller).
const N1 = 120;
const N2 = 320;

/** Nearest-centroid vowel for a measured (F1, F2); null if no formants. */
export function classifyVowel(f1: number, f2: number): VowelId | null {
  if (!(f1 > 0) || !(f2 > 0)) return null;
  let best: VowelId | null = null;
  let bestD = Infinity;
  for (const c of CENTROIDS) {
    const d = ((f1 - c.f1) / N1) ** 2 + ((f2 - c.f2) / N2) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c.id;
    }
  }
  return best;
}

/** Normalised distance from (F1,F2) to a vowel centroid, in the same units as
 * `classifyVowel` (so F1 and F2 are weighted by their perceptual spread). */
function centroidDist(f1: number, f2: number, c: Centroid): number {
  return Math.sqrt(((f1 - c.f1) / N1) ** 2 + ((f2 - c.f2) / N2) ** 2);
}

/**
 * How dominant «ы» is over the nearest OTHER vowel at (F1, F2), as a 0..1 gain.
 * 1 when ы is clearly the closest Russian vowel; it falls toward 0 as another
 * vowel (usually э or и) becomes closer. Multiplying the Ы score by this rejects
 * an attempt that is really э/и even when it happens to sit near the ы target in
 * raw distance — the failure the absolute-distance scorer can't see. Speaker-
 * INDEPENDENT: uses the shared literature centroids, not any per-user tuning, so
 * it discriminates by *relative* vowel geometry rather than absolute Hz.
 */
export function yeryDominance(f1: number, f2: number): number {
  if (!(f1 > 0) || !(f2 > 0)) return 0;
  const yy = CENTROIDS.find((c) => c.id === "ы")!;
  const dY = centroidDist(f1, f2, yy);
  let dOther = Infinity;
  for (const c of CENTROIDS) if (c.id !== "ы") dOther = Math.min(dOther, centroidDist(f1, f2, c));
  const margin = dOther - dY; // > 0 when ы is the nearest vowel
  // Map the margin (normalised-distance units) to a gain. The knee sits just
  // below 0 so a ы that is nearest-but-close-to-a-neighbour (e.g. a back ы
  // brushing у, or a fronted ы brushing и) keeps partial credit, while an
  // attempt a competitor clearly owns (э/и, margin ≪ 0) is driven to ~0.
  return Math.max(0, Math.min(1, (margin + 0.2) / 0.45));
}

export interface FallingWord {
  text: string;
  emoji: string;
  vowel: VowelId; // stressed vowel the speaker must produce
  gloss: string;
}

// Minimal set spanning а/ы/и/э — the words the falling game drops.
export const FALLING_WORDS: FallingWord[] = [
  { text: "мыло", emoji: "🧼", vowel: "ы", gloss: "soap" },
  { text: "мало", emoji: "🤏", vowel: "а", gloss: "(a) little" },
  { text: "мило", emoji: "🥰", vowel: "и", gloss: "cute" },
  { text: "мел", emoji: "🖍️", vowel: "э", gloss: "chalk" },
];
