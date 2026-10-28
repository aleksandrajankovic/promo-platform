import { describe, expect, it } from "vitest";
import { mergeLocalizedSeo, mergeLocalizedText } from "./localizedText";

describe("mergeLocalizedText", () => {
  it("updates only the sent languages and keeps the others", () => {
    expect(mergeLocalizedText({ sw: "Promosheni" }, { en: " Promos " }, ["sw", "en"])).toEqual({ sw: "Promosheni", en: "Promos" });
  });

  it("removes a language when its text is emptied", () => {
    expect(mergeLocalizedText({ sw: "X", en: "Y" }, { en: "" }, ["sw", "en"])).toEqual({ sw: "X" });
    expect(mergeLocalizedText({ sw: "X" }, { sw: "  " }, ["sw"])).toBeNull();
  });

  it("ignores languages the market doesn't have", () => {
    expect(mergeLocalizedText(null, { sr: "Srpski", pt: "Português" }, ["pt"])).toEqual({ pt: "Português" });
  });
});

describe("mergeLocalizedSeo", () => {
  it("stores only filled fields and drops empty languages", () => {
    expect(mergeLocalizedSeo(null, { en: { title: "T", description: "" } }, ["en"])).toEqual({ en: { title: "T" } });
    expect(mergeLocalizedSeo({ en: { title: "T" } }, { en: { title: "", description: "" } }, ["en"])).toBeNull();
  });
});
