import { defineConfig } from "vite";

// Served from a GitHub Pages project subpath (https://komapc.github.io/yaplikacija/),
// so production assets must be referenced relative to that base. The dev server
// keeps "/" for convenience.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/yaplikacija/" : "/",
}));
