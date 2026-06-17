// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";

const click = (sel: string) => (document.querySelector(sel) as HTMLElement).click();
const go = (id: string) => {
  location.hash = "#" + id;
  window.dispatchEvent(new Event("hashchange"));
};

describe("app boot (jsdom)", () => {
  beforeAll(async () => {
    // jsdom has no canvas 2D context; return null so drawFormantChart bails
    // quietly (and we don't spam "getContext not implemented").
    (HTMLCanvasElement.prototype as unknown as { getContext: () => null }).getContext = () => null;
    document.body.innerHTML = '<div id="app"></div>';
    await import("../src/main"); // runs the tab shell + mounts the default tab
  });

  it("renders five tabs as hash links", () => {
    const tabs = document.querySelectorAll<HTMLAnchorElement>("a.tab");
    expect(tabs).toHaveLength(5);
    expect(tabs[0].getAttribute("href")).toBe("#sound");
  });

  it("defaults to the Ы sound trainer", () => {
    expect(document.querySelector("#view .glyph")?.textContent).toBe("Ы");
  });

  it("routes each game tab via the URL hash without crashing", () => {
    go("bullseye");
    expect(document.querySelector("#view")!.textContent).toContain("Мишень");
    go("duel");
    expect(document.querySelector("#view")!.textContent).toContain("Дуэль");
    go("falling");
    expect(document.querySelector("#view .fall-field")).not.toBeNull();
    go("word");
    expect((document.querySelector("#view .word-text")?.textContent ?? "").length).toBeGreaterThan(0);
    go("sound"); // back to a non-animating tab (tears down falling's loop)
    expect(document.querySelector("#view .glyph")?.textContent).toBe("Ы");
  });

  it("opens and closes the About modal", () => {
    const modal = document.getElementById("about") as HTMLElement;
    expect(modal.hidden).toBe(true);
    click("#about-btn");
    expect(modal.hidden).toBe(false);
    expect(modal.textContent).toContain("formants");
    click("#about-close");
    expect(modal.hidden).toBe(true);
  });
});
