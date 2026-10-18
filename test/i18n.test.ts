import { describe, it, expect, afterEach } from "vitest";
import { getLang, setLang, t } from "../src/i18n";
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
