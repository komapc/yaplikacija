// Optional Praat cross-check (run in Node, dev-only). Praat's Burg tracker is a
// reference formant estimator; when the praat_barren binary is present we use it
// to corroborate our own measurements during calibration. Everything degrades
// gracefully (returns null / false) when the binary is absent, so calibration
// still runs without Praat installed.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

export const PRAAT = `${process.env.HOME}/.local/bin/praat_barren`;
export const hasPraat = (): boolean => existsSync(PRAAT);

const DIR = "/tmp/yaplikacija-praat";

/** Minimal 16-bit PCM mono WAV writer. */
export function writeWav(path: string, samples: Float32Array, fs: number): void {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(fs, 24);
  buf.writeUInt32LE(fs * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

/**
 * Mean F1/F2 (Hz) from Praat's Burg tracker over [startSec, endSec] of the given
 * audio. Returns null when Praat is unavailable or yields no usable formant.
 */
export function praatFormants(
  samples: Float32Array,
  fs: number,
  startSec: number,
  endSec: number,
): { f1: number; f2: number } | null {
  if (!hasPraat()) return null;
  try {
    mkdirSync(DIR, { recursive: true });
    const wav = `${DIR}/seg-${Date.now()}.wav`;
    writeWav(wav, samples, fs);
    const script = `${DIR}/formants.praat`;
    writeFileSync(
      script,
      [
        `Read from file: "${wav}"`,
        `To Formant (burg): 0, 5, 5000, 0.025, 50`,
        `f1 = Get mean: 1, ${startSec.toFixed(3)}, ${endSec.toFixed(3)}, "hertz"`,
        `f2 = Get mean: 2, ${startSec.toFixed(3)}, ${endSec.toFixed(3)}, "hertz"`,
        `writeInfoLine: f1, "|", f2`,
        "",
      ].join("\n"),
    );
    const out = execFileSync(PRAAT, ["--run", script], { encoding: "utf8" });
    const [f1, f2] = out.trim().split("|").map(parseFloat);
    if (!Number.isFinite(f1) || !Number.isFinite(f2)) return null;
    return { f1, f2 };
  } catch {
    return null;
  }
}
