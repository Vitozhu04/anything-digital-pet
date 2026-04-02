import { fnv1a32, mulberry32 } from "../hash";

describe("fnv1a32", () => {
  it("returns consistent hash for same input", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
  });

  it("returns different hashes for different inputs", () => {
    expect(fnv1a32("abc")).not.toBe(fnv1a32("xyz"));
  });

  it("returns a positive 32-bit integer", () => {
    const h = fnv1a32("test");
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});

describe("mulberry32", () => {
  it("returns a number between 0 and 1", () => {
    const rng = mulberry32(12345);
    const val = rng();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it("is deterministic with same seed", () => {
    const rng1 = mulberry32(999);
    const rng2 = mulberry32(999);
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
  });
});
