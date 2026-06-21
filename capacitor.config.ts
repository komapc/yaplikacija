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
};

export default config;
