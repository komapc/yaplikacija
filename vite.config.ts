import { defineConfig } from "vite";

// Two build targets share one config:
//   - Web (GitHub Pages): served from the root of the custom domain
//     https://yaplikacija.lipu.dev/ — an absolute base keeps asset and audio
//     URLs valid on nested pages too.
//   - App (Capacitor): the Android WebView serves the bundle from the root of a
//     `https://localhost` origin, so a RELATIVE base ('./') is required —
//     otherwise absolute '/...' asset URLs 404 inside the app. Selected with
//     BUILD_TARGET=app (see the `build:app` npm script).
const isApp = process.env.BUILD_TARGET === "app";
export default defineConfig({
  base: isApp ? "./" : "/",
});
