import { MAJOR_ARCANA, drawTarot, getRarity } from "../tarot";

describe("MAJOR_ARCANA", () => {
  it("has exactly 22 cards", () => {
    expect(MAJOR_ARCANA).toHaveLength(22);
  });

  it("each card has required fields", () => {
    for (const card of MAJOR_ARCANA) {
      expect(card.id).toBeGreaterThanOrEqual(0);
      expect(card.id).toBeLessThanOrEqual(21);
      expect(card.name).toBeTruthy();
      expect(card.positive).toBeTruthy();
      expect(card.negative).toBeTruthy();
      expect(card.trait).toBeTruthy();
    }
  });
});

describe("drawTarot", () => {
  it("returns a card from the deck", () => {
    const draw = drawTarot("myproject", 1743516180000);
    expect(draw.card.id).toBeGreaterThanOrEqual(0);
    expect(draw.card.id).toBeLessThanOrEqual(21);
    expect(typeof draw.upright).toBe("boolean");
  });

  it("is deterministic", () => {
    const d1 = drawTarot("myproject", 1743516180000);
    const d2 = drawTarot("myproject", 1743516180000);
    expect(d1.card.id).toBe(d2.card.id);
    expect(d1.upright).toBe(d2.upright);
  });

  it("different names yield different draws", () => {
    const d1 = drawTarot("alphaproject", 1743516180000);
    const d2 = drawTarot("betaproject", 1743516180000);
    expect(d1.card.id !== d2.card.id || d1.upright !== d2.upright).toBe(true);
  });
});

describe("getRarity", () => {
  it("card 0-7 is N", () => {
    for (let i = 0; i <= 7; i++) expect(getRarity(i)).toBe("N");
  });
  it("card 8-14 is R", () => {
    for (let i = 8; i <= 14; i++) expect(getRarity(i)).toBe("R");
  });
  it("card 15-19 is SR", () => {
    for (let i = 15; i <= 19; i++) expect(getRarity(i)).toBe("SR");
  });
  it("card 20-21 is SSR", () => {
    expect(getRarity(20)).toBe("SSR");
    expect(getRarity(21)).toBe("SSR");
  });
});
