import { calculateBaZiFromDate, getDominantElement } from "../bazi";

describe("calculateBaZiFromDate", () => {
  it("returns four pillars with celestial and terrestrial", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const result = calculateBaZiFromDate(date);
    expect(result.year.celestial).toBeTruthy();
    expect(result.year.terrestrial).toBeTruthy();
    expect(result.month.celestial).toBeTruthy();
    expect(result.day.celestial).toBeTruthy();
    expect(result.hour.celestial).toBeTruthy();
  });

  it("returns consistent result for same date", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const r1 = calculateBaZiFromDate(date);
    const r2 = calculateBaZiFromDate(date);
    expect(r1.fullString).toBe(r2.fullString);
  });

  it("returns element distribution summing to 8", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const result = calculateBaZiFromDate(date);
    const total = Object.values(result.elementDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(8);
  });
});

describe("getDominantElement", () => {
  it("returns one of the five elements", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const bazi = calculateBaZiFromDate(date);
    const el = getDominantElement(bazi.elementDistribution);
    expect(["wood", "fire", "earth", "metal", "water"]).toContain(el);
  });
});
