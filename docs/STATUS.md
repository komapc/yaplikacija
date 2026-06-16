# Status — what's built

_Last updated: 2026-06-16. Live: <https://komapc.github.io/yaplikacija/>_

Yaplikacija is a browser pronunciation trainer for two sounds that are hard for
non-native speakers: the Russian vowel **Ы** `[ɨ]` and the Hebrew/Arabic **Ain**
`ע / ع` `[ʕ]`. Everything runs **client-side** — audio never leaves the device.

## Features

- **Two trainers**, one shared record→analyze→feedback engine.
- **Two modes:**
  - **Звук (Sound)** — sustain an isolated Ы or Ain; scored against its formant
    target zone.
  - **Слова Ы (Words)** — 13 short Russian words; the app locates the Ы inside
    the word and scores it, with a native-speaker reference to listen to.
- **Visual feedback:** a vowel chart (F2 ×, F1 y) that zooms to the target,
  shows reference vowels (и/у/э…) as orientation, plots your attempt, and draws
  an edge arrow if you land off-chart. Score ring + targeted text feedback.
- **Mobile-friendly** responsive layout.

## Analysis pipeline (`src/dsp`, `src/audio`)

1. **Capture** — `getUserMedia` + `MediaRecorder`, browser noise suppression
   ON; decode + resample to 16 kHz via `OfflineAudioContext` (`audio/recorder.ts`).
2. **Noise filter** — 80 Hz Butterworth high-pass (`dsp/filter.ts`).
3. **Voicing** — normalised autocorrelation; only voiced frames scored
   (`dsp/voicing.ts`).
4. **Formants** — per 25 ms frame / 10 ms hop: pre-emphasis (0.97) → Hamming →
   autocorrelation → Levinson-Durbin (order `2 + fs/1000` = 18 @ 16 kHz) →
   Durand-Kerner polynomial roots → F1/F2, with an implausible-frame reject
   (`dsp/lpc.ts`, `dsp/analyze.ts`).
5. **Aggregate** — sound mode: median over voiced frames. Word mode:
   `findVowelNucleus` picks the loudest sustained voiced region (the stressed Ы)
   **without** reference to the target, then scores that.
6. **Score** — distance from the target zone, weighted per sound: F2 dominates
   for Ы, F1 (pharyngeal constriction) for Ain (`trainers/targets.ts`).

## Corpus calibration (`scripts/calibrate-exercises.ts`)

`npm run calibrate` downloads native `Ru-<word>.ogg` recordings from Wikimedia
Commons, anti-alias-resamples to 16 kHz, and measures each word's Ы target with
the **same DSP that grades the learner**, bundling the audio + attribution. 9 of
13 words are calibrated from audio; `ты`/`дым` use manual targets (their native
Ы is genuinely fronted); `был` has no Commons recording.

## Validation (`scripts/praat-compare.ts`)

`npm run praat:compare` cross-checks our tracker against Praat's Burg tracker
over the same windows. Latest: **mean |ΔF1| ≈ 18 Hz, |ΔF2| ≈ 131 Hz** — F1
excellent; F2 a small common-mode bias (cancels in scoring).

## Engineering

- **Stack:** Vite + TypeScript, no UI framework. Static output.
- **Tests:** 43 Vitest unit tests over the pure DSP/scoring core.
- **CI/CD:** GitHub Actions, Node 24, `test → build → deploy` to GitHub Pages;
  deploys gated on tests.
- **Android:** not yet built; static output is Capacitor-ready (see README).
