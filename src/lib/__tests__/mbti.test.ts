import { buildMbti, MBTI_PROFILES, getMbtiFromAnswers } from "../mbti";

describe("getMbtiFromAnswers", () => {
  it("returns INTJ from [I, N, T, J]", () => {
    expect(getMbtiFromAnswers("I", "N", "T", "J")).toBe("INTJ");
  });

  it("returns ENFP from [E, N, F, P]", () => {
    expect(getMbtiFromAnswers("E", "N", "F", "P")).toBe("ENFP");
  });
});

describe("MBTI_PROFILES", () => {
  it("has 16 types", () => {
    expect(Object.keys(MBTI_PROFILES)).toHaveLength(16);
  });

  it("each profile has description and wuxing", () => {
    for (const [type, profile] of Object.entries(MBTI_PROFILES)) {
      expect(profile.description).toBeTruthy();
      expect(["wood", "fire", "earth", "metal", "water"]).toContain(profile.wuxing);
      expect(type).toHaveLength(4);
    }
  });
});

describe("buildMbti", () => {
  it("returns full profile for INFJ", () => {
    const result = buildMbti("INFJ");
    expect(result.type).toBe("INFJ");
    expect(result.description).toBeTruthy();
    expect(result.wuxing).toBe("water");
  });
});
