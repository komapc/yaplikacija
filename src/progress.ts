// Per-exercise best scores, kept in localStorage (device-local, never uploaded).
// Every access is guarded: storage can be blocked (private mode) or full, and
// the app must work without it.

const PREFIX = "best:";

export function getBest(id: string): number | null {
  try {
    const v = Number(localStorage.getItem(PREFIX + id));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Store `score` if it beats the saved best. `improved` is false for a first-ever 0 or a tie. */
export function recordScore(id: string, score: number): { best: number; improved: boolean } {
  const prev = getBest(id);
  if (score > (prev ?? 0)) {
    try {
      localStorage.setItem(PREFIX + id, String(score));
    } catch {
      /* storage blocked or full */
    }
    return { best: score, improved: true };
  }
  return { best: prev ?? 0, improved: false };
}

/** Best scores for several ids at once (null where none), e.g. for a word list. */
export function bestOf(ids: string[]): (number | null)[] {
  return ids.map(getBest);
}
