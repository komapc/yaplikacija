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

## Four-speaker validation; и/у calibration tested, NOT adopted

To check the speaker-dependence worry, we collected и/ы/у (+ words) from four
speakers spanning a wide vocal-tract range:

| speaker | age/sex | и F2 | у F2 | **ы F2** | midpoint k = (ы−у)/(и−у) |
|---------|---------|------|------|----------|--------------------------|
| mark    | M 46    | 2040 | 840  | **1430** | 0.49 |
| P       | M 85    | 1856 | 711  | **1224** | 0.45 |
| Лена    | F       | 2600 | 610  | **1560** | 0.48 |
| Yana    | F       | 3191 | (mis-measured) | **1340** | ≈0.29 |

Two findings:

1. **The fixed absolute-F2 window already covers everyone.** All four speakers'
   ы fall in **1224–1560**, inside the deployed target `1450 ± 230` = [1220, 1680];
   every non-ы vowel (у 610–840, о ~1050, э ~1960, и 1856–3191) is outside it.
   The cross-speaker ы spread is far narrower than raw formant-scaling implied —
   incl. **two female speakers**.

2. **A per-speaker и↔у calibration would have *hurt*, not helped.** Three
   speakers put ы at the и/у midpoint (k ≈ 0.47), but **Yana's ы (a confirmed,
   clean ы by listening) sits at k ≈ 0.29** — a real individual difference. A
   fixed-k calibration would place her target ~1800 and **reject her good ы**,
   whereas absolute F2 accepts it. (Yana's у also mis-measured — F2 1457, above
   her ы — the back-vowel LPC merge again.)

**Conclusion:** keep **absolute F2**; do not ship the и/у (or F2/F3) calibration.
The `f2f3`/`adaptTarget` scaffolding stays dormant. Re-open only with a more
robust formant tracker (closed-phase / weighted-LP) that measures back vowels
and very high voices reliably.

## Remaining limitation

The fixed window is validated across **4 adult voices (2 M, 2 F)** but **not a
child** — a young child's ы (F2 well above 1680) would still fall outside and
under-score. That, plus the ~5–10% back-vowel measurement outliers, are the open
items; both need better formant estimation rather than scoring tweaks.

## Open corpus vs. samples: word-token analysis (Commons + Lingua Libre)

After assembling the open reference corpus (`corpus/` — 12 Ы words, Wikimedia
Commons + Lingua Libre; see `corpus/ATTRIBUTION.md`), we re-measured **every**
corpus and sample recording through the app pipeline (`analyzeBuffer` +
`findVowelNucleus`) to compare native *word* tokens against the *sustained* vowels.

**Reliability gap up front.** The samples are sustained vowels — 100–2200 voiced
frames, voiced-ratio 0.3–0.85 → stable medians. The corpus words are short native
tokens — only **15–53 voiced frames**, voiced-ratio 0.17–0.47. A median over ~20
frames of a word is fragile and the nucleus can land on a transition, so per-word
corpus numbers are **noisy single tokens, not distributions**.

### Per-word Ы (nucleus F2, Hz)

| word | onset context | Commons (M) | Lingua Libre (F) | reading |
|------|---------------|-------------|------------------|---------|
| мы   | labial [m]    | **1606**    | —    | clean Ы |
| вы   | labial [v]    | **1525**    | —    | clean Ы |
| мыло | labial [m]    | **1615**    | —    | clean Ы |
| бык  | labial [b]    | **1404**    | 1634 | clean Ы |
| сын  | sibilant [s]  | **1520**    | 2158 | commons clean; LL garbage |
| сыр  | sibilant [s]  | **1668**    | 1994 | commons clean; LL high |
| мышь | lab.+retroflex| 1122 ↓      | —    | pulled **low** by [ʂ] |
| мыться | lab.+[ts]   | 1225 ↓      | —    | pulled **low** |
| ты   | coronal [t]   | 1988 ↑      | —    | fronted → [i]-like |
| дым  | coronal [d]   | 2091 ↑      | 2530 | fronted → [i]-like |
| язык | palatal [j]   | 1985 ↑      | —    | fronted → [i]-like |
| рыба | trill [r]     | 1948 ↑      | —    | raised by [r] |

Sustained Ы (samples, for reference): mark 1261–1307, P 1224–1267, Yana 1340,
Lena 1560–1916 (all in/at the deployed window).

### Findings

1. **Sustained Ы matches the literature; word-embedded Ы does not measure
   reliably.** Published Russian [ɨ] ≈ F1 300–340 / F2 1350–1600 (men), higher for
   women — our sustained tokens land there. The word tokens scatter F2 from
   **1122 to 2530**, too unstable to trust individually.
2. **This reproduces the generated targets exactly.** The 6 words that calibrated
   to real values (мы, вы, мыло, бык, сын, сыр) are precisely those whose token
   fell inside the plausible band `[1250, 1800]`; the 6 that reverted to the seed
   (ты, дым, язык, рыба, мышь, мыться) are the ones coarticulation pushed out.
   The clamp in `scripts/calibrate-exercises.ts` is doing genuine work.
3. **Coarticulation is systematic by onset** — the key practical result:
   - **Coronal/palatal** onsets ([t],[d],[j]) front Ы toward [i] (~2000): ты, дым, язык.
   - **Labial** onsets ([m],[v],[b]) leave Ы near citation value (1400–1620): the
     **trustworthy** words.
   - **Retroflex/affricate** codas ([ʂ],[ts]) pull F2 *down*: мышь 1122, мыться 1225.

   ⇒ Build per-word targets only from **labial-context** words; keep the canonical
   seed for the rest. (This is effectively what the clamp already enforces.)
4. **Two-speaker averaging backfires.** Where both speakers exist the tokens
   *disagree* rather than corroborate: сын 1520↔2158, сыр 1668↔1994, дым 2091↔2530,
   бык 1404↔1634. The female (Lingua Libre) token is consistently higher/noisier,
   so averaging would bias targets **upward toward [i]**. Prefer the more reliable
   token (higher frame count), do not average.
5. **The pipeline is male-tuned; female back vowels break it** (re-confirmed):
   Yana [u]→3191, LL сын→2158, Yana [u]→1457 above her own ы. Higher female F0 →
   LPC formant merging. A cross-gender fix needs a better tracker, not more data.
6. **Voiced-frame count is a clean reliability gate** — every trustworthy
   measurement has >100 frames, every garbage one <55. Future calibration should
   weight/gate by frame count rather than treating all tokens equally.

**Conclusion:** more native *word* data will not sharpen these targets — the
ceiling is measurement reliability on short, coarticulated, sometimes-female
tokens. The honest improvement path is a better formant tracker (or per-speaker
sustained-vowel calibration), not a bigger corpus. The current "calibrate labial
words, seed the rest" behaviour is, per this analysis, the right call.

## Measurement improvements implemented

Acting on the analysis above (the ceiling is measurement reliability, not corpus
size), we added robustness to the tracker and a reliability gate to calibration.
This is the "more robust formant tracker" the earlier sections said to wait for;
all 58 tests still pass and the validated cases below did not regress.

**1. Lag-windowed autocorrelation (`src/dsp/lpc.ts`).** A Gaussian lag window
(≈50 Hz broadening, Tohkura) is applied to the autocorrelation before
Levinson-Durbin. It damps spurious razor-sharp poles and the F1/F2 pole-merging
that high-F0/back vowels suffer — the benefit of closed-phase analysis without
fragile glottal-closure detection.

**2. Continuity smoothing (`src/dsp/analyze.ts`).** A 3-point median filter on
each formant trajectory removes single-frame LPC outliers before aggregation.

**3. Stability-based nucleus + confidence (`findVowelNucleus`).** Instead of a
blind 20 % edge trim, the nucleus is now the steadiest sub-window (lowest F2
variation) of the loudest run — the held vowel target, not the consonant→vowel
transition that fronts it toward [i]. The window's F2 standard deviation is
returned as a `spread` confidence signal.

**4. Reliability-gated calibration + Praat cross-check (`scripts/calibrate-exercises.ts`,
`scripts/praat.ts`).** A per-word target is adopted only if the nucleus is steady
(`spread ≤ 200`), in the plausible Ы envelope, and either long (≥ 8 frames) or
tightly corroborated by Praat (≤ 100 Hz) on a still-usable window (≥ 5 frames).
Praat is used automatically when `~/.local/bin/praat_barren` is present, and
skipped gracefully otherwise.

### Measured effect

- **Worst merge fixed:** Yana's [u] nucleus, which mis-measured **F2 3191**
  (above her own ы — impossible), now reads **596**. mark's У median 1744 → 1530.
- **No regression on the validated ы:** mark 1307→1308, P 1224→1240, Yana
  1340→1354, сын 1482→1571 — all still inside `1450 ± 230`. сэн still rejected
  (F1 stays ~480).
- **Calibration is now principled:** 5 words get empirical, Praat-corroborated
  targets (вы 1656, сын 1593, сыр 1688, бык 1409, мыло 1717); the other 7 fall to
  the safe seed for explicit reasons — coronal/palatal fronting (ты, дым, язык,
  рыба ≈ 2000), retroflex lowering (мышь 1133), or Praat disagreement (мы: ours
  1606 vs Praat 1322 → seeded). The Praat check both **rejected a wrong target**
  (мы) and **recovered short but solid ones** (сыр Δ11, бык Δ93).

**Still open** (unchanged): cross-gender back vowels and very high voices remain
the hard cases; a child's ы (F2 > 1680) would under-score. These now degrade more
gracefully but a closed-phase/GCI tracker is still the eventual fix.

_Dataset: see `samples/DATASET.md` (gitignored). Open corpus: `corpus/` +
`corpus/ATTRIBUTION.md` (committed)._
