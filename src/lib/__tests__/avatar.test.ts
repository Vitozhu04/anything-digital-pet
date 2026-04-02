import { getDiceBearUrl, ELEMENT_SPECIES, getAvatarSeed, getAsciiArt } from "../avatar";

describe("ELEMENT_SPECIES", () => {
  it("has all five elements", () => {
    expect(ELEMENT_SPECIES.wood).toBeDefined();
    expect(ELEMENT_SPECIES.fire).toBeDefined();
    expect(ELEMENT_SPECIES.earth).toBeDefined();
    expect(ELEMENT_SPECIES.metal).toBeDefined();
    expect(ELEMENT_SPECIES.water).toBeDefined();
  });

  it("each has name, emoji, ascii, and color", () => {
    for (const s of Object.values(ELEMENT_SPECIES)) {
      expect(s.name).toBeTruthy();
      expect(s.emoji).toBeTruthy();
      expect(s.ascii.length).toBeGreaterThan(0);
      expect(s.color).toBeTruthy();
    }
  });
});

describe("getAsciiArt", () => {
  it("returns string array for each element", () => {
    for (const el of ["wood", "fire", "earth", "metal", "water"] as const) {
      const art = getAsciiArt(el);
      expect(Array.isArray(art)).toBe(true);
      expect(art.length).toBe(5);
    }
  });
});

describe("getDiceBearUrl", () => {
  it("returns a valid URL", () => {
    const url = getDiceBearUrl("water", "myseed123");
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com/);
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
