import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateBaZiFromDate, getDominantElement } from "@/lib/bazi";
import { drawTarot, getRarity } from "@/lib/tarot";
import { buildMbti, getMbtiFromAnswers } from "@/lib/mbti";
import { getDiceBearUrl, getAvatarSeed, ELEMENT_SPECIES } from "@/lib/avatar";
import { generatePersona } from "@/lib/persona";
import { PetSchema } from "@/types/pet";

const CreatePetRequestSchema = z.object({
  source: z.enum(["link", "cli"]),
  sourceUrl: z.string().url().optional(),
  projectContext: z.string().min(1).max(2000),
  mbti: z.object({
    ei: z.enum(["E", "I"]),
    sn: z.enum(["S", "N"]),
    tf: z.enum(["T", "F"]),
    jp: z.enum(["J", "P"]),
  }),
  timestampMs: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreatePetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400 },
    );
  }

  const { source, sourceUrl, projectContext, mbti, timestampMs } = parsed.data;
  const now = new Date(timestampMs ?? Date.now());
  const ts = now.getTime();

  const bazi = calculateBaZiFromDate(now);
  const dominantElement = getDominantElement(bazi.elementDistribution);
  const mbtiType = getMbtiFromAnswers(mbti.ei, mbti.sn, mbti.tf, mbti.jp);
  const mbtiProfile = buildMbti(mbtiType);
  const tarotDraw = drawTarot(projectContext.slice(0, 50), ts);
  const rarity = getRarity(tarotDraw.card.id);
  const avatarSeed = getAvatarSeed(projectContext.slice(0, 20), ts);
  const avatarUrl = getDiceBearUrl(dominantElement, avatarSeed);
  const species = ELEMENT_SPECIES[dominantElement];

  const bones = {
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
    avatarUrl,
    avatarSeed,
  };

  const persona = await generatePersona(bones, projectContext);

  const pet = PetSchema.parse({
    version: "1.0",
    meta: {
      createdAt: now.toISOString(),
      source,
      sourceUrl,
      projectContext,
    },
    bones,
    soul: {
      ...persona,
      species: species.name,
      speciesEn: species.nameEn,
      emoji: species.emoji,
    },
  });

  return NextResponse.json({ success: true, data: pet });
}
