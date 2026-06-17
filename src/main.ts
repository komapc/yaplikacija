import "./styles.css";
import { Recorder } from "./audio/recorder";
import { createSound } from "./views/sound";
import { createWord } from "./views/word";
import { createBullseye } from "./games/bullseye";
import { createDuel } from "./games/duel";
import { createFalling } from "./games/falling";
import type { View } from "./views/types";

// Ы-only for now (Ain trainer hidden — its target still lives in trainers/targets.ts).
const recorder = new Recorder();
const TABS: { id: string; label: string; make: (r: Recorder) => View }[] = [
  { id: "sound", label: "Звук", make: createSound },
  { id: "word", label: "Слова", make: createWord },
  { id: "bullseye", label: "🎯 Мишень", make: createBullseye },
  { id: "duel", label: "⚔ Дуэль", make: createDuel },
  { id: "falling", label: "🌧 Дождь", make: createFalling },
];

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="topbar">
    <div class="brand">Аппликация Ы</div>
    <nav class="tabs" id="tabs"></nav>
  </header>
  <main class="trainer" id="view"></main>`;

const tabsEl = document.getElementById("tabs")!;
const viewEl = document.getElementById("view")!;
let current: View | null = null;
let activeId = "";

function open(id: string): void {
  if (id === activeId) return;
  current?.destroy();
  viewEl.replaceChildren();
  const tab = TABS.find((t) => t.id === id)!;
  current = tab.make(recorder);
  viewEl.appendChild(current.element);
  activeId = id;
  tabsEl.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
}

for (const t of TABS) {
  const b = document.createElement("button");
  b.className = "tab";
  b.dataset.id = t.id;
  b.textContent = t.label;
  b.addEventListener("click", () => open(t.id));
  tabsEl.appendChild(b);
}

open("sound");
