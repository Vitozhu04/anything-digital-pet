import { getDiceBearUrl, ELEMENT_SPECIES, getAvatarSeed } from "../avatar";

describe("ELEMENT_SPECIES", () => {
  it("has all five elements", () => {
    expect(ELEMENT_SPECIES.wood).toBeDefined();
    expect(ELEMENT_SPECIES.fire).toBeDefined();
    expect(ELEMENT_SPECIES.earth).toBeDefined();
    expect(ELEMENT_SPECIES.metal).toBeDefined();
    expect(ELEMENT_SPECIES.water).toBeDefined();
  });

  it("each has name, emoji, and diceBearStyle", () => {
    for (const s of Object.values(ELEMENT_SPECIES)) {
      expect(s.name).toBeTruthy();
      expect(s.emoji).toBeTruthy();
      expect(s.diceBearStyle).toBeTruthy();
    }
  });
});

describe("getDiceBearUrl", () => {
  it("returns a valid URL", () => {
    const url = getDiceBearUrl("water", "myseed123");
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com/);
  });

  it("uses correct style for each element", () => {
    expect(getDiceBearUrl("wood", "s")).toContain("lorelei");
    expect(getDiceBearUrl("fire", "s")).toContain("adventurer");
    expect(getDiceBearUrl("earth", "s")).toContain("avataaars");
    expect(getDiceBearUrl("metal", "s")).toContain("bottts");
    expect(getDiceBearUrl("water", "s")).toContain("fun-emoji");
  });

  it("is deterministic", () => {
    expect(getDiceBearUrl("water", "seed")).toBe(getDiceBearUrl("water", "seed"));
  });
});

describe("getAvatarSeed", () => {
  it("combines name and timestamp", () => {
    const seed = getAvatarSeed("mybot", 1234567890);
    expect(seed).toBe("mybot:1234567890");
  });
});
