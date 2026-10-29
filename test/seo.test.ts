import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LANGS } from "../src/i18n";
import { SITE, pageText, pathOf, renderPage, renderSitemap } from "../src/seo";

const template = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("build-time language pages", () => {
  for (const l of LANGS) {
    const html = renderPage(template, l);

    it(`${l}: lang/dir, self-canonical and the full hreflang set`, () => {
      expect(html).toContain(`<html lang="${l}" dir="${l === "he" || l === "ar" ? "rtl" : "ltr"}">`);
      expect(html).toContain(`<link rel="canonical" href="${SITE}${pathOf(l)}" />`);
      for (const x of LANGS) expect(html).toContain(`hreflang="${x}" href="${SITE}${pathOf(x)}"`);
      expect(html).toContain(`hreflang="x-default" href="${SITE}/"`);
      expect(html).not.toContain("<!--seo:");
    });

    it(`${l}: one h1, guide sections under h2, statement headings, OG image`, () => {
      expect(html.match(/<h1>/g)).toHaveLength(1);
      expect((html.match(/<h2>/g) ?? []).length).toBeGreaterThanOrEqual(3);
      for (const h of html.match(/<h[23]>[^<]*<\/h[23]>/g) ?? []) expect(h).not.toMatch(/[?؟]/);
      expect(html).toContain('property="og:image" content="https://yaplikacija.lipu.dev/og-image.png"');
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
    });

    it(`${l}: title <= 60 and description ~150-160 chars`, () => {
      const p = pageText(l);
      expect(p.title.length).toBeLessThanOrEqual(60);
      expect(p.description.length).toBeGreaterThanOrEqual(120);
      expect(p.description.length).toBeLessThanOrEqual(160);
    });
  }

  it("lists every language page in the sitemap", () => {
    const xml = renderSitemap("2026-10-29");
    for (const l of LANGS) expect(xml).toContain(`<loc>${SITE}${pathOf(l)}</loc>`);
    expect(xml).toContain("<lastmod>2026-10-29</lastmod>");
  });
});
