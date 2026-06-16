import { defineConfig } from "vite";

// Served from a GitHub Pages project subpath (https://komapc.github.io/yaplikacija/),
// so the base is set consistently for dev, preview and build — that way local
// `vite preview` mirrors production and asset/audio paths resolve identically.
export default defineConfig({
  base: "/yaplikacija/",
});
