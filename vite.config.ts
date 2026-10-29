import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { LANGS } from "./src/i18n";
import { pathOf, renderPage, renderSitemap } from "./src/seo";

// Two build targets share one config:
//   - Web (GitHub Pages): served from the root of the custom domain
//     https://yaplikacija.lipu.dev/ — an absolute base keeps asset and audio
//     URLs valid on nested pages too.
//   - App (Capacitor): the Android WebView serves the bundle from the root of a
//     `https://localhost` origin, so a RELATIVE base ('./') is required —
//     otherwise absolute '/...' asset URLs 404 inside the app. Selected with
//     BUILD_TARGET=app (see the `build:app` npm script).
const isApp = process.env.BUILD_TARGET === "app";

// Static SEO pages (src/seo.ts). index.html is always filled with the English
// page; the web build also writes /ru/, /he/, /ar/ (same bundle, translated
// static content, own lang/dir/canonical/hreflang) and sitemap.xml. The app
// build stays a single page.
function seoPages(): Plugin {
  let outDir = "dist";
  return {
    name: "yaplikacija-seo-pages",
    configResolved(c) {
      outDir = c.build.outDir;
    },
    transformIndexHtml: (html) => renderPage(html, "en", !isApp),
    closeBundle() {
      if (isApp) return;
      const template = readFileSync(join(outDir, "index.html"), "utf8");
      for (const l of LANGS) {
        const dir = join(outDir, pathOf(l));
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "index.html"), renderPage(template, l));
      }
      writeFileSync(join(outDir, "sitemap.xml"), renderSitemap(lastmod()));
    },
  };
}

// Date of the last commit (so lastmod only moves when the site changes); today as a fallback.
function lastmod(): string {
  try {
    return execSync("git log -1 --format=%cs", { encoding: "utf8" }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default defineConfig({
  base: isApp ? "./" : "/",
  plugins: [seoPages()],
});
