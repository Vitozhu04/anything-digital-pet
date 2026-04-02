import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { PetBones } from "./types";

const SPECIES_POOL = [
  "水豚", "耳廓狐", "六角恐龙", "独角鲸", "水熊虫", "蘑菇精灵", "珊瑚精",
  "星尘猫", "雷云兔", "琥珀蜥", "冰晶鹿", "苔藓龟", "极光鱼", "熔岩蛙",
  "竹节虫精", "云端水母", "铁杉狸", "深海鹦鹉螺", "月光蛾", "沙漠玫瑰蛇",
  "霜翼蝠", "岩浆甲虫", "晨雾鹤", "潮汐海马", "琉璃蜗牛", "雷霆貂",
  "翡翠蛙", "烈阳鹰", "暗影猫头鹰", "虹光蜂鸟", "深渊灯笼鱼", "星辰刺猬",
  "赤焰蝾螈", "银河鲸", "雨林变色龙", "极地海豹", "幻梦蝴蝶", "青铜犀牛",
  "流沙蝎", "雪莲兔", "磁力水母", "琥珀蚁", "紫晶蜻蜓", "朱砂锦鲤",
  "松烟鸦", "金丝猴精", "碧波龟仙", "焰尾狐仙", "寒铁熊灵",
].join("、");

const PersonaOutputSchema = z.object({
  species: z.string().describe("物种名, 2-4字, 可从候选池选或自创"),
  speciesEn: z.string().describe("Species English name, 1-3 words"),
  emoji: z.string().describe("最能代表这个物种的 emoji, 1个字符"),
  name: z.string().describe("宠物中文名, 2-3字, 古朴有意境"),
  nameEn: z.string().describe("Pet English name, 1-2 words"),
  asciiArt: z.array(z.string()).length(5).describe("5行ASCII art, 每行≤20个字符, 用 /\\\\|_-.~^oO*() 等字符画出物种形象"),
  description: z.string().describe("2-3句人格描述(中文)"),
  systemPrompt: z.string().describe("100-150字中文对话系统提示词"),
});

export type PersonaOutput = z.infer<typeof PersonaOutputSchema>;

export async function generatePersona(
  bones: PetBones,
  projectContext: string,
): Promise<PersonaOutput> {
  const tarotInfo = `${bones.tarot.name}${bones.tarot.upright ? "正位" : "逆位"}（${bones.tarot.trait}）`;

  const elementHints: Record<string, string> = {
    wood: "植物系/生长系/森林系",
    fire: "火焰系/热情系/光明系",
    earth: "大地系/稳定系/矿石系",
    metal: "金属系/机械系/冰冷系",
    water: "深海系/流动系/冰雪系",
  };

  const rarityHints: Record<string, string> = {
    N: "偏向常见动物，朴素可爱",
    R: "独特动物，有个性",
    SR: "奇幻混合体，带有魔法元素",
    SSR: "神话级生物，极其稀有且华丽",
  };

  const prompt = `你是一位数字宠物创造大师。请根据占卜数据，创造一个独一无二的数字宠物。

## 项目上下文
${projectContext}

## 占卜数据
- 八字：${bones.bazi.fullString}
- 五行：木${bones.bazi.elementDistribution.wood} 火${bones.bazi.elementDistribution.fire} 土${bones.bazi.elementDistribution.earth} 金${bones.bazi.elementDistribution.metal} 水${bones.bazi.elementDistribution.water}（主元素：${bones.dominantElement}）
- MBTI：${bones.mbti}（${bones.mbtiDescription}）
- 塔罗命牌：${tarotInfo}（含义：${bones.tarot.meaning}）
- 稀有度：${bones.rarity}

## 物种选择
从以下候选中选择或自由创造：${SPECIES_POOL}
倾向：${elementHints[bones.dominantElement]}
风格：${rarityHints[bones.rarity]}

## ASCII Art 要求
- 正好5行，每行不超过20个半角字符
- 只用ASCII字符: / \\ | _ - . ~ ^ o O * ( ) [ ] { } < > @ # + = x X
- 画出物种的正面或侧面轮廓，要可爱
- 参考风格（但不要照抄）:
  /\\  *  /\\
 / .\\~/\\. \\
 \\  ^w^  /
  \\~/ \\~/
   \\) (/

## 其他要求
- 名字古朴有意境，符合物种气质
- 人格描述体现MBTI类型和塔罗命运
- System prompt 让它在对话中保持独特性格`;

  const result = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: PersonaOutputSchema,
    prompt,
  });

  return result.object;
}
