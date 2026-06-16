# Yaplikacija — pronunciation trainer

One web app, two trainers for sounds that are hard for non-native speakers:

- **Аппликация Ы** — the Russian vowel **Ы** `[ɨ]`
- **עפליקציה ע** — the Hebrew/Arabic **Ain** `ע / ع` `[ʕ]`

Both share one record → analyze → feedback engine. The app records your voice,
estimates the first two formants (F1, F2) via LPC, and scores the result
against a per-sound target zone, plotting it on a vowel chart.

## How the analysis works

1. **Capture** — `getUserMedia` + `MediaRecorder`, then decode and resample to
   16 kHz with an `OfflineAudioContext` (`src/audio/recorder.ts`).
2. **Voicing** — normalised autocorrelation marks voiced frames and estimates
   F0; only voiced frames are scored (`src/dsp/voicing.ts`).
3. **Formants** — per frame: pre-emphasis → Hamming window → autocorrelation →
   Levinson-Durbin → roots of the LPC polynomial (Durand-Kerner) → formant
   frequencies (`src/dsp/lpc.ts`). The median over voiced frames gives a robust
   (F1, F2) (`src/dsp/analyze.ts`).
4. **Scoring** — distance from each sound's target formant zone; F2 (tongue
   front/back) is weighted higher because it is the decisive cue for both
   sounds (`src/trainers/targets.ts`).

The target formant values in `src/trainers/targets.ts` are the main tuning
knob — adjust `center`/`tolerance` if scoring feels too strict or lenient.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173  (needs https or localhost for mic)
npm run build    # type-check + static build into dist/
```

> Microphone access requires a secure context: `localhost` works in dev; deploy
> over HTTPS.

## Android (later)

The build output is static, so wrapping with Capacitor is straightforward:

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android
npx cap init && npx cap add android && npm run build && npx cap sync
```

Add the `RECORD_AUDIO` permission to the Android manifest.
