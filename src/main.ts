// Fonts are bundled (no requests to Google Fonts: the app must not contact any server).
import "@fontsource/onest/latin-400.css";
import "@fontsource/onest/latin-ext-400.css";
import "@fontsource/onest/cyrillic-400.css";
import "@fontsource/onest/latin-500.css";
import "@fontsource/onest/latin-ext-500.css";
import "@fontsource/onest/cyrillic-500.css";
import "@fontsource/onest/latin-600.css";
import "@fontsource/onest/latin-ext-600.css";
import "@fontsource/onest/cyrillic-600.css";
import "@fontsource/onest/latin-700.css";
import "@fontsource/onest/latin-ext-700.css";
import "@fontsource/onest/cyrillic-700.css";
import "@fontsource/unbounded/latin-600.css";
import "@fontsource/unbounded/cyrillic-600.css";
import "@fontsource/unbounded/latin-700.css";
import "@fontsource/unbounded/cyrillic-700.css";
import "@fontsource/unbounded/latin-800.css";
import "@fontsource/unbounded/cyrillic-800.css";
import "./styles.css";
import { Recorder } from "./audio/recorder";
import { createSound } from "./views/sound";
import { createWord } from "./views/word";
import { createBullseye } from "./games/bullseye";
import { createDuel } from "./games/duel";
import { createFalling } from "./games/falling";
import { LANGS, dirOf, getLang, onLangChange, setLang, t, type Key, type Lang } from "./i18n";
import type { View } from "./views/types";

// Ы-only for now (Ain trainer hidden — its target still lives in trainers/targets.ts).
const recorder = new Recorder();
const TABS: { id: string; label: Key; make: (r: Recorder) => View }[] = [
  { id: "sound", label: "tab.sound", make: createSound },
  { id: "word", label: "tab.word", make: createWord },
  { id: "bullseye", label: "tab.bullseye", make: createBullseye },
  { id: "duel", label: "tab.duel", make: createDuel },
  { id: "falling", label: "tab.falling", make: createFalling },
];

const app = document.querySelector<HTMLDivElement>("#app")!;
let tabsEl: HTMLElement;
let viewEl: HTMLElement;
let aboutModal: HTMLElement;
let current: View | null = null;
let activeId = "";

function open(id: string): void {
  if (id === activeId) return;
  current?.destroy();
  viewEl.replaceChildren();
  const tab = TABS.find((x) => x.id === id)!;
  current = tab.make(recorder);
  viewEl.appendChild(current.element);
  // The element is now laid out — let views redraw their chart at real size
  // (charts drawn during mount, while detached, are skipped at zero size).
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  activeId = id;
  tabsEl.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
}

// Route from the URL hash so tabs are linkable / bookmarkable and Back works.
function route(): void {
  const id = location.hash.replace(/^#/, "");
  open(TABS.some((x) => x.id === id) ? id : TABS[0].id);
}

const setAbout = (show: boolean) => (aboutModal.hidden = !show);

// (Re)build the whole shell in the active language. Views are created on open(),
// so resetting activeId and routing again re-creates the current one translated.
function mount(): void {
  const langOptions = LANGS.map(
    (l) => `<option value="${l}"${l === getLang() ? " selected" : ""}>${l.toUpperCase()}</option>`,
  ).join("");
  app.innerHTML = `
  <header class="topbar">
    <div class="brand">Аппликация Ы</div>
    <select class="about-btn lang-sel" id="lang-btn" aria-label="${t("app.switchLang")}">${langOptions}</select>
    <button class="about-btn" id="about-btn" aria-label="${t("app.about")}">ⓘ</button>
  </header>
  <nav class="tabs" id="tabs"></nav>
  <main class="trainer" id="view"></main>
  <div class="modal" id="about" hidden>
    <div class="modal-card">
      <button class="modal-close" id="about-close" aria-label="${t("app.close")}">×</button>
      ${t("about.html")}
    </div>
  </div>`;
  tabsEl = document.getElementById("tabs")!;
  viewEl = document.getElementById("view")!;
  aboutModal = document.getElementById("about")!;

  for (const tab of TABS) {
    const a = document.createElement("a");
    a.className = "tab";
    a.dataset.id = tab.id;
    a.href = "#" + tab.id; // each tab is a real link (#sound, #bullseye, …)
    a.textContent = t(tab.label);
    tabsEl.appendChild(a);
  }

  const langSel = document.getElementById("lang-btn") as HTMLSelectElement;
  langSel.addEventListener("change", () => setLang(langSel.value as Lang));
  document.getElementById("about-btn")!.addEventListener("click", () => setAbout(true));
  document.getElementById("about-close")!.addEventListener("click", () => setAbout(false));
  aboutModal.addEventListener("click", (e) => {
    if (e.target === aboutModal) setAbout(false); // click backdrop closes
  });
}

function start(): void {
  current?.destroy();
  current = null;
  activeId = "";
  mount();
  route(); // open the tab named in the URL hash (or the first tab)
}

window.addEventListener("hashchange", route);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setAbout(false);
});
// On the web build each language has its own page (/, /ru/, /he/, /ar/); keep
// the address in step with a switch so a reload or a shared link stays in the
// chosen language. The app build (relative base, single page) has no such pages.
function syncPath(): void {
  if (import.meta.env.BASE_URL !== "/") return;
  const l = getLang();
  history.replaceState(null, "", (l === "en" ? "/" : `/${l}/`) + location.hash);
}

onLangChange(() => {
  syncPath();
  start();
});
document.documentElement.lang = getLang();
document.documentElement.dir = dirOf(getLang());
start();
