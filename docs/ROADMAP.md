# Roadmap — future plans

Grouped by theme; ordered roughly by value/effort within each. See
[ASSESSMENT.md](ASSESSMENT.md) for the weaknesses these address.

## Pedagogy / content

- **Resolve ты/дым (and the general fronting question)** — decide whether
  exercises teach the *canonical* Ы (~1500) or the *contextual* reality (fronted
  after coronal stops). This drives whether manual overrides stay. _Needs a
  product call._
- **Expand the word list** — more contexts and minimal pairs (e.g. ы vs и:
  бык/бик, мыл/мил), grouped into themed sets. Re-run `npm run calibrate` after.
- **Ain word exercises** — Arabic/Hebrew words containing ע/ع. Harder: the
  pharyngeal is low-energy, so the energy-nucleus heuristic won't locate it;
  needs a constriction/transition detector or alignment.

## Analysis / DSP

- **Better segmentation for multisyllabic words** — energy-nucleus is loose
  there. Options: pick the steadiest (lowest-variance) sustained region, or a
  lightweight forced-alignment against the known phoneme sequence.
- **Per-word / per-speaker tolerance** — derive the target zone *width* from the
  spread across several native recordings instead of one global tolerance.
- **Fuller Ain model** — add a frication/spectral-balance cue alongside the
  formant signature so it's not purely vowel-like.
- **Live (real-time) feedback** — show the formant dot moving while the user
  sustains the sound, not only after release.
- **High-pitch robustness** — current LPC struggles on sparse-harmonic voices;
  consider cepstral smoothing or pitch-synchronous analysis.

## Quality / process

- **Automate the Praat check** — run `praat:compare` (or a cached-baseline diff)
  in CI to catch DSP regressions like the accidental LPC-order slip.
- **Whole-word verification (stretch)** — optional ASR pass to confirm the
  learner said the right word before grading the vowel.
- **UI: show the analysed segment** — highlight the located nucleus on a
  waveform/spectrogram so the user sees *what* was scored.

## Platform

- **Android via Capacitor** — wrap the static build; add `RECORD_AUDIO`
  permission. Steps in the README.
- **Progress & persistence** — `localStorage` for streaks/scores per word;
  later, optional accounts and structured lessons.
- **i18n** — UI strings are mixed RU/EN; consider a proper language toggle
  (there's a `/lang` skill in the wider toolset).

## Nice-to-haves

- Color-code the chart into "too front / too back" zones for Ы.
- A dashed guide line from the contrast vowel (и) to the target.
- Downloadable session report / formant history.
