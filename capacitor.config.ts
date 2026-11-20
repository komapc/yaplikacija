import type { CapacitorConfig } from "@capacitor/cli";

// Native shell config. The web build is produced with a relative base
// (BUILD_TARGET=app, see vite.config.ts) into `dist`, then copied into the
// Android project by `cap sync`. `androidScheme: "https"` keeps the WebView a
// secure context so getUserMedia (microphone) is permitted.
const config: CapacitorConfig = {
  appId: "com.komapc.yaplikacija",
  appName: "Аппликация Ы",
  webDir: "dist",
  android: {
    backgroundColor: "#0a0c10",
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    // Capacitor 8 core plugin. targetSdk 36 forces edge-to-edge on Android 15+,
    // so the WebView would otherwise be drawn under the status/nav bars.
    // "css" (the default, set explicitly): on WebView < 140 Capacitor pads the
    // WebView natively; on >= 140 it follows viewport-fit (index.html sets
    // `cover`) and the layout pads itself with --sa-* in src/styles.css
    // (the larger of env(safe-area-inset-*) and the injected --safe-area-inset-*). "DARK" = light bar icons, for the dark #0a0c10 background.
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
    },
  },
};

export default config;
