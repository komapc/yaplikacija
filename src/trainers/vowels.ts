// Rough multi-vowel classifier for the games (Duel, Falling). Nearest centroid
// in (F1, F2), normalised by approximate per-formant spreads. Centroids are
// adult-range midpoints — fine for a game (looser than the trainer's scoring).

export type VowelId = "и" | "ы" | "э" | "а" | "о" | "у";

interface Centroid {
  id: VowelId;
  f1: number;
  f2: number;
}

const CENTROIDS: Centroid[] = [
  { id: "и", f1: 330, f2: 2100 },
  { id: "э", f1: 500, f2: 1800 },
  { id: "ы", f1: 340, f2: 1450 },
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
