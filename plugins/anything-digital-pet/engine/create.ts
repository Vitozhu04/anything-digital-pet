import { calculateBaZiFromDate, getDominantElement } from "./bazi";
import { drawTarot, getRarity } from "./tarot";
import { getMbtiFromAnswers, buildMbti } from "./mbti";
import { generatePersona } from "./persona";
import { PetSchema } from "./types";
import type { PetBones, Pet } from "./types";

type MbtiAnswers = {
  ei: "E" | "I";
  sn: "S" | "N";
  tf: "T" | "F";
  jp: "J" | "P";
};

export function buildBones(
  projectContext: string,
  mbtiAnswers: MbtiAnswers,
  timestampMs?: number,
): PetBones {
  const now = new Date(timestampMs ?? Date.now());
  const ts = now.getTime();

  const bazi = calculateBaZiFromDate(now);
  const dominantElement = getDominantElement(bazi.elementDistribution);
  const mbtiType = getMbtiFromAnswers(mbtiAnswers.ei, mbtiAnswers.sn, mbtiAnswers.tf, mbtiAnswers.jp);
  const mbtiProfile = buildMbti(mbtiType);
  const tarotDraw = drawTarot(projectContext.slice(0, 50), ts);
  const rarity = getRarity(tarotDraw.card.id);

  return {
    bazi,
    dominantElement,
    mbti: mbtiType,
    mbtiDescription: mbtiProfile.description,
    tarot: {
      id: tarotDraw.card.id,
      name: tarotDraw.card.name,
      upright: tarotDraw.upright,
      trait: tarotDraw.trait,
      meaning: tarotDraw.meaning,
    },
    rarity,
  };
}

export async function createPet(
  source: "cli" | "link",
  projectContext: string,
  mbtiAnswers: MbtiAnswers,
  sourceUrl?: string,
  timestampMs?: number,
): Promise<Pet> {
  const bones = buildBones(projectContext, mbtiAnswers, timestampMs);
  const soul = await generatePersona(bones, projectContext);

  return PetSchema.parse({
    version: "2.0",
    meta: {
      createdAt: new Date(timestampMs ?? Date.now()).toISOString(),
      source,
      sourceUrl,
      projectContext,
    },
    bones,
    soul,
  });
}
