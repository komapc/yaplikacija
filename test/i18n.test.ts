import { describe, it, expect, afterEach } from "vitest";
import { DICT, LANGS, dirOf, getLang, setLang, t, translate } from "../src/i18n";
import { TARGETS, scoreAttempt } from "../src/trainers/targets";
import { YERY_CENTER, classifyVowel } from "../src/trainers/vowels";

afterEach(() => setLang("en"));

describe("i18n", () => {
  it("fills {placeholders} and leaves unknown ones intact", () => {
    expect(t("falling.ok", { w: "мыло" })).toBe("✓ мыло!");
    expect(t("falling.ok")).toBe("✓ {w}!");
  });

  it("follows the active language, including target text read through getters", () => {
    const en = TARGETS.yery.prompt;
    setLang("ru");
    expect(getLang()).toBe("ru");
    expect(TARGETS.yery.prompt).not.toBe(en);
    expect(scoreAttempt(TARGETS.yery, { f1: 0, f2: 0, f3: 0, voicedRatio: 0, spread: 0, frames: [] }).feedback).toBe(
      t("score.none"),
    );
  });
});

describe("Ы centre", () => {
  it("is shared by the trainer target and the vowel classifier", () => {
    expect(TARGETS.yery.f1.center).toBe(YERY_CENTER.f1);
    expect(TARGETS.yery.f2.center).toBe(YERY_CENTER.f2);
    expect(classifyVowel(YERY_CENTER.f1, YERY_CENTER.f2)).toBe("ы");
  });
});

describe("i18n dictionaries", () => {
  it("translate every key into every language, keeping the {placeholders}", () => {
    const keys = Object.keys(DICT.en) as (keyof typeof DICT.en)[];
    for (const l of LANGS) {
      for (const k of keys) {
        const s = translate(l, k);
        expect(s, `${l}:${k}`).toBeTruthy();
        const ph = (x: string) => (x.match(/\{\w+\}/g) ?? []).sort().join();
        expect(ph(s), `${l}:${k}`).toBe(ph(translate("en", k)));
      }
    }
  });

  it("marks Hebrew and Arabic as right-to-left", () => {
    expect(LANGS.map(dirOf)).toEqual(["ltr", "ltr", "rtl", "rtl"]);
  });
});
