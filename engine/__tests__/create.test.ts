import { buildBones } from "../create";

describe("buildBones", () => {
  it("returns bones with N/R/SR/SSR rarity", () => {
    const bones = buildBones("test project context", {
      ei: "E", sn: "N", tf: "T", jp: "J",
    });
    expect(["N", "R", "SR", "SSR"]).toContain(bones.rarity);
  });

  it("returns valid MBTI type", () => {
    const bones = buildBones("test", { ei: "I", sn: "S", tf: "F", jp: "P" });
    expect(bones.mbti).toBe("ISFP");
  });

  it("returns bazi with 8 elements total", () => {
    const bones = buildBones("test", { ei: "E", sn: "N", tf: "T", jp: "J" });
    const total = Object.values(bones.bazi.elementDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(8);
  });

  it("is deterministic for same context + timestamp", () => {
    const ts = 1743516180000;
    const b1 = buildBones("ctx", { ei: "E", sn: "N", tf: "T", jp: "J" }, ts);
    const b2 = buildBones("ctx", { ei: "E", sn: "N", tf: "T", jp: "J" }, ts);
    expect(b1.tarot.id).toBe(b2.tarot.id);
    expect(b1.rarity).toBe(b2.rarity);
  });
});
