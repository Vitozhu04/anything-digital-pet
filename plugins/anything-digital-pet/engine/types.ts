import { z } from "zod";

export const BaZiPillarSchema = z.object({
  celestial: z.string(),
  terrestrial: z.string(),
});

export const ElementDistributionSchema = z.object({
  wood: z.number(),
  fire: z.number(),
  earth: z.number(),
  metal: z.number(),
  water: z.number(),
});

export const TarotDrawSchema = z.object({
  id: z.number(),
  name: z.string(),
  upright: z.boolean(),
  trait: z.string(),
  meaning: z.string(),
});

export const PetBonesSchema = z.object({
  bazi: z.object({
    year: BaZiPillarSchema,
    month: BaZiPillarSchema,
    day: BaZiPillarSchema,
    hour: BaZiPillarSchema,
    fullString: z.string(),
    elementDistribution: ElementDistributionSchema,
  }),
  dominantElement: z.enum(["wood", "fire", "earth", "metal", "water"]),
  mbti: z.string().length(4),
  mbtiDescription: z.string(),
  tarot: TarotDrawSchema,
  rarity: z.enum(["N", "R", "SR", "SSR"]),
});

export const PetSoulSchema = z.object({
  species: z.string(),
  speciesEn: z.string(),
  emoji: z.string(),
  name: z.string(),
  nameEn: z.string(),
  asciiArt: z.array(z.string()).length(5),
  description: z.string(),
  systemPrompt: z.string(),
});

export const PetSchema = z.object({
  version: z.literal("2.0"),
  meta: z.object({
    createdAt: z.string(),
    source: z.enum(["link", "cli"]),
    sourceUrl: z.string().optional(),
    projectContext: z.string(),
  }),
  bones: PetBonesSchema,
  soul: PetSoulSchema,
});

export type Pet = z.infer<typeof PetSchema>;
export type PetBones = z.infer<typeof PetBonesSchema>;
export type PetSoul = z.infer<typeof PetSoulSchema>;
