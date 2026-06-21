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

## Documentation

- [docs/STATUS.md](docs/STATUS.md) — what's built (features, pipeline, tooling).
- [docs/ASSESSMENT.md](docs/ASSESSMENT.md) — honest strengths & limitations.
- [docs/ROADMAP.md](docs/ROADMAP.md) — future plans.
- [docs/native-validation.md](docs/native-validation.md) — native-speaker test results (Ы vs neighbours).

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
> **Speaker normalisation (tried, reverted).** Formants scale with vocal-tract
> length, so a fixed Hz target ought to mis-grade women/children. We tried a
> speaker-normalised F2/F3 ratio target (`adaptTarget`/`f2f3`), but testing
> against a native speaker showed F3 is too noisy on short CVC words (±200–450 Hz
> vs Praat) — dividing by it let wrong vowels pass (и scored 73 as ы), whereas
> absolute F2 rejects them (~45). So scoring uses **absolute F2** for now; the
> F3/`adaptTarget` scaffolding remains dormant for a future, more robust attempt.
> Tools: `npm run validate:f3`, `npm run praat:compare`.

The target formant values in `src/trainers/targets.ts` are the main tuning
knob — adjust `center`/`tolerance` if scoring feels too strict or lenient.

### Word exercises

In word mode a recording contains other phonemes, so instead of medianing the
whole clip we score the **vowel nucleus**: `findVowelNucleus`
(`src/dsp/analyze.ts`) finds the loudest sustained voiced region — the stressed
Ы in every exercise word — **without reference to the target**, and grades that.
This is deliberate: an earlier version used `findBestWindow` (the window closest
to the target), which cherry-picked any transient sweeping past the target and
scored almost anything 90 %+. Grading the nucleus instead means a wrong vowel is
measured as the wrong vowel and scores low. `analyzeWord` returns the nucleus as
a normal `AnalysisResult`, so scoring and the chart are reused.

`findBestWindow` is still used by the calibration step (where we *do* want to
locate the known-correct Ы in a native recording). It still scores only the Ы,
not the whole word (that would need ASR). The energy-nucleus is reliable for the
monosyllabic words; for multisyllabic ones (рыба, мыться…) the loudest region is
not always exactly the Ы, so those scores are looser.

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

## Validation against Praat

```bash
npm run praat:compare    # needs ~/.local/bin/praat_barren
```

Cross-checks our LPC tracker against Praat's Burg tracker. For each recording it
decodes → resamples to 16 kHz → writes a WAV → runs our `findVowelNucleus`, then
asks Praat for its mean F1/F2 over the **same** time window (standard settings:
5 formants, 5000 Hz ceiling). Same segment, two algorithms, so the diff isolates
the estimator. Get the headless Praat binary from
<https://www.fon.hum.uva.nl/praat/download_linux.html> (the `…-barren` build).

Latest run (12 word recordings): **mean |ΔF1| ≈ 18 Hz, mean |ΔF2| ≈ 131 Hz**.
F1 agreement is excellent; our F2 runs ~100–130 Hz higher than Praat on average
(likely the stronger 0.97 pre-emphasis and higher LPC order), well within the
±280 Hz Ы tolerance but a known small bias.

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

## Android (Google Play)

The web app is wrapped in a native shell with [Capacitor](https://capacitorjs.com)
for Google Play. The `android/` native project is committed.

The **app** build uses a relative base (`BUILD_TARGET=app`) so assets resolve from
the WebView root, instead of the `/yaplikacija/` subpath the web deploy needs.

```bash
npm run cap:sync          # build:app (relative base) + cap sync android
npx cap open android      # open in Android Studio
npx cap run android       # build + run on a device/emulator
```

**Microphone:** `RECORD_AUDIO` (+ `MODIFY_AUDIO_SETTINGS`) is declared in the
manifest and requested at runtime in `MainActivity`, so the WebView may grant
`getUserMedia`. Audio is processed on-device and never leaves it (see
[privacy policy](https://komapc.github.io/yaplikacija/privacy.html)).

### Release signing

Releases are signed with an **upload key** (Play App Signing holds the real app
key). Gradle reads credentials from `android/key.properties` (local, git-ignored)
or, failing that, from environment variables (CI):

```
# android/key.properties — do NOT commit
storeFile=/absolute/path/to/upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

Local signed bundle:

```bash
npm run cap:sync
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

### CI

`.github/workflows/android.yml` builds and signs the `.aab` on a `v*` tag (or
manual dispatch) and uploads it as a build artifact. Requires repo **Actions
secrets**: `ANDROID_KEYSTORE_BASE64` (base64 of the keystore),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
`versionName` comes from the tag, `versionCode` from the run number.

```bash
git tag v0.1.0 && git push origin v0.1.0   # triggers a signed build
```

### Publishing

1. Download the `app-release-aab` artifact from the workflow run.
2. Play Console → app → Internal testing → upload the `.aab`.
3. Complete Data Safety (no data collected/shared — on-device only), content
   rating, and the store listing (icon 512, feature graphic 1024×500,
   screenshots) with the privacy-policy URL above.
4. Test via the internal track, then promote to Production.
