# Yaplikacija — pronunciation trainer

One web app, two trainers for sounds that are hard for non-native speakers:

- **Аппликация Ы** — the Russian vowel **Ы** `[ɨ]`
- **עפליקציה ע** — the Hebrew/Arabic **Ain** `ע / ع` `[ʕ]`

Both share one record → analyze → feedback engine. The app records your voice,
estimates the first two formants (F1, F2) via LPC, and scores the result
against a per-sound target zone, plotting it on a vowel chart.

There are two modes:

- **Звук (Sound)** — sustain an isolated Ы or Ain and hit its formant zone.
- **Слова Ы (Words)** — say short Russian words (`мы`, `ты`, `сыр`…) and the app
  locates the **Ы inside the word** and scores it against that word's target,
  with a native-speaker reference to listen to.

## How the analysis works

1. **Capture** — `getUserMedia` + `MediaRecorder`, then decode and resample to
   16 kHz with an `OfflineAudioContext` (`src/audio/recorder.ts`). The browser's
   noise suppression / echo cancellation / AGC are enabled to strip broadband
   hiss and room noise from both the analysed and played-back audio.
2. **Noise filter** — a Butterworth high-pass (80 Hz) additionally removes DC
   offset, rumble, handling thumps and mains hum (50/60 Hz) below the formant
   range (`src/dsp/filter.ts`).
3. **Voicing** — normalised autocorrelation marks voiced frames and estimates
   F0; only voiced frames are scored (`src/dsp/voicing.ts`).
4. **Formants** — per frame: pre-emphasis → Hamming window → autocorrelation →
   Levinson-Durbin → roots of the LPC polynomial (Durand-Kerner) → formant
   frequencies (`src/dsp/lpc.ts`). The median over voiced frames gives a robust
   (F1, F2) (`src/dsp/analyze.ts`).
5. **Scoring** — distance from each sound's target formant zone, weighted per
   sound: F2 (tongue front/back) dominates for Ы, F1 (pharyngeal constriction)
   dominates for Ain (`src/trainers/targets.ts`).

The target formant values in `src/trainers/targets.ts` are the main tuning
knob — adjust `center`/`tolerance` if scoring feels too strict or lenient.

### Word exercises

In word mode a recording contains other phonemes, so instead of medianing the
whole clip we **locate the target**: `findBestWindow` (`src/dsp/analyze.ts`)
slides a sustained (~70 ms) window over the voiced frames and picks the one
whose median (F1,F2) best matches the Ы target (weighted, F2-dominant).
`analyzeWord` returns that window as a normal `AnalysisResult`, so the existing
scoring and chart are reused. It is intentionally lenient — it finds your best
moment of Ы and cannot verify the whole word (that would need ASR).

The word list lives in `src/trainers/exercises.ts`. Each word's expected Ы
formants are **calibrated from a native recording** by the same DSP that grades
the learner — see below.

## Corpus calibration & reference audio

```bash
npm run calibrate   # scripts/calibrate-exercises.ts
```

For each word this downloads a native recording (`Ru-<word>.ogg`) from
**Wikimedia Commons**, decodes + resamples it to 16 kHz, measures the Ы formants
with `analyzeBuffer` + `findBestWindow`, and writes
`src/trainers/exercise-targets.generated.ts` (per-word target + bundled audio in
`public/audio/exercises/`). Measurements outside a plausible Ы envelope fall back
to the global Ы target (the native audio is still kept for playback). Re-run when
the word list changes.

Reference audio is © its Wikimedia Commons contributors under the license shown
in each clip's attribution line in the app (CC BY variants); see the generated
file for per-file credit.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173  (needs https or localhost for mic)
npm run build      # type-check + static build into dist/
npm test           # run the Vitest suite once
npm run test:watch # re-run on change
```

> Microphone access requires a secure context: `localhost` works in dev; deploy
> over HTTPS.

## Tests

Vitest unit tests live in `test/`, covering the pure (browser-free) core:

- `lpc.test.ts` — DSP primitives (pre-emphasis, Hamming, autocorrelation,
  Levinson-Durbin, polynomial roots) and formant recovery, incl. the
  positive-bandwidth regression.
- `voicing.test.ts` — voiced/unvoiced/silence detection and f0.
- `analyze.test.ts` — end-to-end F1/F2 recovery for Ы, Ain and [i] against
  synthesized vowels with known formants, the Ы-vs-[i] discrimination, and the
  word-level `findBestWindow`/`analyzeWord` segment search.
- `scoring.test.ts` — target scoring, mistake-specific feedback, and bounds.

Audio capture (`src/audio`) and the canvas UI (`src/ui`) depend on browser-only
APIs (`getUserMedia`, `AudioContext`, canvas) and are exercised manually.

## Android (later)

The build output is static, so wrapping with Capacitor is straightforward:

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android
npx cap init && npx cap add android && npm run build && npx cap sync
```

Add the `RECORD_AUDIO` permission to the Android manifest.
