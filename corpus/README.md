# corpus/ — open reference recordings

Native-speaker recordings of the Ы word-exercise list, gathered from open sources
for **per-word target calibration** (see `scripts/calibrate-exercises.ts`) and as the
in-app reference audio.

## Layout
- `<slug>/commons.ogg` — Wiktionary pronunciation file from Wikimedia Commons (CC BY).
- `<slug>/lingualibre.wav` — Lingua Libre recording, speaker Tatiana Kerbush (CC BY-SA 4.0).
- `MANIFEST.json` — machine-readable: slug, word, source, url, author, license per file.
- `ATTRIBUTION.md` — human-readable credits (required by the CC BY / BY-SA licenses).

## Provenance
- 12 words have a Commons recording; 4 of those (сын, сыр, дым, бык) also have a
  second speaker via Lingua Libre.
- `был` has no open isolated recording (see ATTRIBUTION.md "Missing").

Raw sources are kept here unmodified; the calibration step resamples to 16 kHz mono
and the app's playback copies live in `public/audio/exercises/`.
