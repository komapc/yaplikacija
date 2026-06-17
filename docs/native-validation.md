# Native-speaker validation (Ы)

A native Russian speaker recorded a controlled minimal set — the consonant frame
held constant (с…н), walking the vowel space — to diagnose "sometimes quite
wrong" reports. Recordings live in `samples/` (gitignored); re-run the analysis
with `npm run analyze:samples` (needs the Praat barren binary).

## Method
Each recording → our pipeline (`analyzeBuffer` + `findVowelNucleus`) for F1/F2/F3
over the vowel nucleus, **and** Praat's Burg tracker over the *same* window, so
the diff isolates scoring/segmentation from measurement.

## Results (absolute-F2 scoring, as deployed)

| word | vowel | our F1/F2/F3 | Praat F1/F2/F3 | F2/F3 | Ы-score |
|------|-------|--------------|----------------|-------|---------|
| **сын** | [ɨ] | 336 / **1482** / 2057 | 351 / 1461 / 2034 | 0.72 | **98** ✅ |
| сан | [a] | 688 / 1300 / 2024 | 646 / 1284 / 1850 | 0.64 | 48 |
| сюн | [ʉ] | 327 / 973 / 2253 | 326 / 1072 / 2364 | 0.43 | 47 |
| син | [i] | 327 / 2040 / 2887 | 330 / 1983 / 2623 | 0.71 | 45 |
| сон | [o] | 503 / 1081 / 2205 | 467 / 1079 / 2216 | 0.49 | 42 |
| сён | [ɵ] | 497 / 1056 / 2156 | 441 / 1057 / 2099 | 0.49 | 41 |
| сун | [u] | 325 / 839 / 2854 | 332 / 930 / 2421 | 0.29 | 38 |

## Findings

1. **Scoring is correct, both directions.** The real ы scores **98**; every other
   vowel scores **≤ 48** — a clean ~50-point gap. No tolerance tuning needed.
2. **Measurement is accurate.** Our F1/F2 track Praat within ~20 Hz on сын
   (F1 Δ15, F2 Δ21, F3 Δ23). F1/F2 across the set agree closely; F3 is shakier on
   the short/transition cases (e.g. сюн, сан).
3. **The F2/F3 ratio cannot separate ы from и for this speaker** — сын ratio
   **0.72** ≈ син ratio **0.71** (F3 rises with F2 from ы→и, so the ratio is
   ~flat). This is why the earlier ratio "speaker normalisation" let и score 73
   as ы; reverting to **absolute F2** fixed it (и now 45). See the note in
   `src/trainers/targets.ts`.
4. **The nucleus sometimes lands on a low-F2 segment** (сён measured 1056, which
   Praat confirms over that window — i.e. the window sits on the [n]/rounded
   offglide, not the [ɵ] peak). This does **not** hurt the goal here: those words
   must be *rejected* anyway, and they are.

## Decision: no algorithm change

The deployed absolute-F2 + steady-nucleus pipeline classifies this speaker's
vowels correctly (ы 98, others ≤48) and matches Praat. Changing it now would add
regression risk for no measured benefit (an experimental "loudest-window" nucleus
tried during this investigation made false-accepts *worse*). Left as-is.

## Distribution test (60 takes) → non-compensatory scoring

A second native batch (20× Ы, 20× У, 10× each сын/сун/сэн; `samples/dist/`,
`npm run dist-analyze`) split into per-take Звук-mode scores exposed two issues:

1. **[e]/сэн scored as ы (~78).** [e] has ы-like F2 (~1700) but a much higher
   **F1 (~452 vs ы ~300–340)**. The old **weighted-average** scoring let the good
   F2 mask the wrong F1.
2. **Back-vowel F2 instability.** [u] (У) read bimodally (~570 *or* ~2200) — LPC
   merging F1/F2 on back vowels — so a few takes land mid and mis-score. This is
   a measurement limit, only partly addressable.

Fix: **combine F1/F2 non-compensatively** (weighted Euclidean distance in
tolerance units, not a weighted average), and tighten the Ы F1 zone (F1 is the
cue that separates ы from open vowels). Result on the labelled set —
**Ы 76 / сын 84 (pass); У 11, сун 30, сэн 55, и/о/а ≤46 (reject)** — clean
separation with no сэн take reaching 70. A handful of back-vowel measurement
outliers still slip through (~5–10%).

## Known limitation / future work

Absolute F2 is **speaker-dependent**: validated on one (male-range) speaker.
A woman's or child's ы (~15–20% higher F2) would score lower against the fixed
~1500 Hz target. The principled fix (vocal-tract-length normalisation) needs a
more robust F3 than we get on short CVC words, or a brief per-user vowel-space
calibration. The `f2f3`/`adaptTarget` scaffolding remains dormant for that.
