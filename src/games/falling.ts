// 🌧 Дождь слов — words (мыло/мало/мило/мел) fall; pronounce each before it lands.
// We classify the vowel you produced and pop the word if it matches.

import type { Recorder } from "../audio/recorder";
import { analyzeBuffer } from "../dsp/analyze";
import { classifyVowel, FALLING_WORDS, type FallingWord } from "../trainers/vowels";
import { holdToRecord } from "../ui/record";
import type { View } from "../views/types";

const START_MS = 6500;
const MIN_MS = 3000;
const CHIP_H = 52;

export function createFalling(recorder: Recorder): View {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="game-head"><div class="game-title">🌧 Дождь слов</div><div id="f-lives">♥♥♥</div></div>
    <p class="hint">Say each falling word before it lands. We listen for its vowel.</p>
    <div class="fall-field" id="f-field"></div>
    <p class="status" id="f-fb">Hold the button and say the word.</p>
    <div class="game-score">score <b id="f-score">0</b></div>
    <button class="record" id="f-rec">🎙️ hold &amp; speak</button>`;
  const q = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
  const field = q("f-field");

  let lives = 3,
    score = 0,
    fallMs = START_MS,
    over = false,
    raf = 0;
  let cur: { word: FallingWord; start: number; chip: HTMLElement } | null = null;

  function spawn(): void {
    const word = FALLING_WORDS[Math.floor(Math.random() * FALLING_WORDS.length)];
    const chip = document.createElement("div");
    chip.className = "fall-chip";
    chip.innerHTML = `<span class="fall-emoji">${word.emoji}</span> ${word.text}`;
    chip.style.top = "0px";
    field.appendChild(chip);
    cur = { word, start: performance.now(), chip };
  }

  function setLives(): void {
    q("f-lives").textContent = "♥".repeat(Math.max(0, lives)) + "·".repeat(3 - Math.max(0, lives));
  }

  function loseLife(msg: string): void {
    lives -= 1;
    setLives();
    cur?.chip.remove();
    cur = null;
    if (lives <= 0) {
      over = true;
      q("f-fb").textContent = `💀 ${msg} — score ${score}. Hold to play again.`;
    } else {
      q("f-fb").textContent = msg;
      spawn();
    }
  }

  function loop(ts: number): void {
    if (!over && cur) {
      const h = field.clientHeight || 240;
      const prog = (ts - cur.start) / fallMs;
      cur.chip.style.top = `${Math.min(prog, 1) * (h - CHIP_H)}px`;
      if (prog >= 1) loseLife(`«${cur.word.text}» landed!`);
    }
    raf = requestAnimationFrame(loop);
  }

  function restart(): void {
    field.querySelectorAll(".fall-chip").forEach((c) => c.remove());
    lives = 3;
    score = 0;
    fallMs = START_MS;
    over = false;
    setLives();
    q("f-score").textContent = "0";
    spawn();
  }

  const teardown = holdToRecord(q("f-rec"), recorder, {
    onError: () => (q("f-fb").textContent = "Mic error — check permissions."),
    onResult: ({ samples, sampleRate }) => {
      if (over) {
        restart();
        return;
      }
      if (!cur) return;
      const r = analyzeBuffer(samples, sampleRate);
      const v = classifyVowel(r.f1, r.f2);
      if (v === cur.word.vowel) {
        score += 100;
        q("f-score").textContent = String(score);
        q("f-fb").textContent = `✓ ${cur.word.text}!`;
        q("f-fb").className = "status hit";
        cur.chip.remove();
        cur = null;
        fallMs = Math.max(MIN_MS, fallMs - 300);
        spawn();
      } else {
        q("f-fb").textContent = `heard «${v ?? "?"}» — that word needs «${cur.word.vowel}»`;
        q("f-fb").className = "status miss";
      }
    },
  });

  spawn();
  raf = requestAnimationFrame(loop);
  return {
    element: el,
    destroy: () => {
      cancelAnimationFrame(raf);
      teardown();
    },
  };
}
