# Assessment — what's good, what's weak

An honest appraisal of the current state. See [STATUS.md](STATUS.md) for what
exists and [ROADMAP.md](ROADMAP.md) for plans.

## Strengths

- **Privacy & cost** — 100% client-side. No backend, no audio upload, no API
  keys, no per-use cost; works offline once loaded; free static hosting.
- **Validated DSP** — the formant tracker (Burg's method, as Praat uses) agrees
  with Praat to ~16 Hz on F1, ~71 Hz on F2 (see `praat:compare`, `validate:f3`).
  A labelled minimal-pair eval (`samples/eval-corpus/`, `scripts/eval-variants.ts`)
  scores clean-ы vs non-ы at AUC 0.94 with zero false accepts.
- **Validated on a native speaker** — a controlled minimal set (сон/сун/син/
  сан/сюн/сён) confirmed scoring rejects non-ы vowels with absolute F2 (~38–48),
  and exposed that the F2/F3-ratio speaker-normalisation made it *worse* (wrong
  vowels 55–73) because F3 is too noisy on short words — so it was reverted.
- **Self-consistent scoring** — per-word targets are measured by the *same*
  tracker that grades the learner, so systematic estimator bias (e.g. the F2
  offset vs Praat) is common-mode and cancels.
- **Empirical, not hand-waved targets** — word targets come from native
  recordings, capturing real coarticulation per word.
- **Discriminative word scoring** — grading the energy-based vowel nucleus
  (target-independent) means a wrong vowel scores low; an earlier
  best-matching-window approach cherry-picked and scored almost anything 90%+.
- **Test + CI discipline** — 65 tests gate every deploy; Praat regression tools
  (`praat:compare`, `validate:f3`) exist; a synthetic-vowel harness validates the
  estimator against ground truth.

## Weaknesses & known limitations

- **Ain is under-served** — no word exercises, and it's modeled only by its
  sustained voiced formants (raised F1 / low F2), not frication or the dynamic
  constriction. Fine as a "hold the sound" trainer; not a full consonant model.
- **Multisyllabic word grading is loose** — the energy nucleus reliably finds Ы
  in monosyllables, but in рыба / мыться / язык the loudest region isn't always
  the Ы, so those scores are softer and can disagree with calibration.
- **ты / дым target-vs-reference mismatch** — their native Ы genuinely measures
  fronted (~1900 Hz, coronal-stop coarticulation), but we teach a canonical
  ~1500 Hz target. So imitating the native reference scores only ~50–70. An
  unresolved pedagogy choice (teach canonical vs contextual Ы).
- **No whole-word verification** — scoring judges only the target vowel; it
  can't tell whether the rest of the word was said correctly (would need ASR).
- **LPC limits** — formant tracking is unreliable for very high-pitched voices
  (sparse harmonics) and very short, heavily coarticulated vowels; junk frames
  are filtered but not recovered.
- **Noise-suppression trade-off** — the browser's denoiser is on (it removed
  audible hiss the user reported); it can subtly reshape formants. Chosen
  deliberately; the generous tolerances absorb it.
- **Single global Ы tolerance** reused for every word — no per-speaker / per-word
  spread, so the "good zone" width isn't tuned to each context.
- **Corpus fragility** — calibration depends on a `Ru-<word>.ogg` existing on
  Commons (`был` has none) and on CC-BY licensing; re-running can shift targets.
- **No persistence / progression** — no accounts, saved progress, streaks, or
  lesson structure; each session starts fresh.
- **Not yet on Android** — only the web build exists.

## Risk notes

- A `git add -A` during DSP experimentation once swept a non-optimal LPC order
  into a commit; `praat:compare` caught it. Treat that tool as the guard for any
  DSP change.
- Manual target overrides live in `trainers/exercises.ts` and are easy to forget
  when re-calibrating — they intentionally take precedence over generated values.
