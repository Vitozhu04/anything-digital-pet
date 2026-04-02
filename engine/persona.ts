import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { PetBones } from "../types/pet";
import { ELEMENT_SPECIES } from "./avatar";

const PersonaOutputSchema = z.object({
  name: z.string().describe("Pet's Chinese name, 2-3 characters, evocative"),
  nameEn: z.string().describe("Pet's English name, 1-2 words"),
  description: z
    .string()
    .describe("2-3 sentence personality description in Chinese"),
  systemPrompt: z
    .string()
    .describe(
      "System prompt in Chinese for the pet to use in conversations (100-150 words)",
    ),
});

export type PersonaOutput = z.infer<typeof PersonaOutputSchema>;

export async function generatePersona(
  bones: PetBones,
  projectContext: string,
): Promise<PersonaOutput> {
  const species = ELEMENT_SPECIES[bones.dominantElement];
  const tarotInfo = `${bones.tarot.name}${bones.tarot.upright ? "正位" : "逆位"}（${bones.tarot.trait}）`;

  const prompt = `你是一位宠物命名大师和人格设计师。请根据以下占卜数据，为一个数字宠物设计完整的人格。

## 项目上下文
${projectContext}

## 占卜数据（Bones）
- 物种：${species.name}（${species.nameEn}）${species.emoji}
- 八字：${bones.bazi.fullString}
- 五行：木${bones.bazi.elementDistribution.wood} 火${bones.bazi.elementDistribution.fire} 土${bones.bazi.elementDistribution.earth} 金${bones.bazi.elementDistribution.metal} 水${bones.bazi.elementDistribution.water}（主元素：${bones.dominantElement}）
- MBTI：${bones.mbti}（${bones.mbtiDescription}）
- 塔罗命牌：${tarotInfo}（含义：${bones.tarot.meaning}）
- 稀有度：${bones.rarity}

## 要求
- 名字要古朴有意境，符合物种气质和五行属性
- 人格描述要生动立体，体现MBTI类型和塔罗命运
- System prompt 要让它在对话中始终保持这个独特性格`;

  const result = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: PersonaOutputSchema,
    prompt,
  });

  return result.object;
}
