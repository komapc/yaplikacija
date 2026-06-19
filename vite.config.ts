import { defineConfig } from "vite";

// Two build targets share one config:
//   - Web (GitHub Pages): served from the project subpath
//     https://komapc.github.io/yaplikacija/ — needs an absolute base so asset
//     and audio URLs resolve under the subpath (and `vite preview` mirrors it).
//   - App (Capacitor): the Android WebView serves the bundle from the root of a
//     `https://localhost` origin, so a RELATIVE base ('./') is required —
//     otherwise '/yaplikacija/...' asset URLs 404 inside the app. Selected with
//     BUILD_TARGET=app (see the `build:app` npm script).
const isApp = process.env.BUILD_TARGET === "app";
export default defineConfig({
  base: isApp ? "./" : "/yaplikacija/",
});
