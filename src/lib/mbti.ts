export type MbtiProfile = {
  description: string;
  keywords: string[];
  wuxing: "wood" | "fire" | "earth" | "metal" | "water";
};

export type MbtiResult = { type: string } & MbtiProfile;

export const MBTI_QUESTIONS = [
  {
    dimension: "EI" as const,
    question: "这个项目/bot 的能量来源更像：",
    optionA: { label: "E", text: "外向活跃，主动出击，热爱互动" },
    optionB: { label: "I", text: "内省深思，安静专注，独立工作" },
  },
  {
    dimension: "SN" as const,
    question: "它处理信息的方式：",
    optionA: { label: "S", text: "注重细节和实际，按步骤来" },
    optionB: { label: "N", text: "看全局和模式，跳跃思维" },
  },
  {
    dimension: "TF" as const,
    question: "它做决策更靠：",
    optionA: { label: "T", text: "逻辑分析，客观规则，系统思维" },
    optionB: { label: "F", text: "价值观，共情，人际关系" },
  },
  {
    dimension: "JP" as const,
    question: "它的工作风格：",
    optionA: { label: "J", text: "有计划有条理，喜欢确定性" },
    optionB: { label: "P", text: "灵活随性，拥抱开放性" },
  },
] as const;

export function getMbtiFromAnswers(
  ei: "E" | "I",
  sn: "S" | "N",
  tf: "T" | "F",
  jp: "J" | "P",
): string {
  return `${ei}${sn}${tf}${jp}`;
}

export const MBTI_PROFILES: Record<string, MbtiProfile> = {
  INTJ: { description: "战略大师，长远谋划，追求完美系统", keywords: ["战略", "独立", "决断"], wuxing: "metal" },
  INTP: { description: "逻辑学家，痴迷于理论与可能性", keywords: ["分析", "理论", "创新"], wuxing: "water" },
  ENTJ: { description: "指挥官，天生领导者，善于组织", keywords: ["领导", "效率", "目标"], wuxing: "fire" },
  ENTP: { description: "辩论家，思维敏锐，挑战一切规则", keywords: ["创新", "辩论", "多元"], wuxing: "fire" },
  INFJ: { description: "提倡者，深邃洞察，有强烈的使命感", keywords: ["洞察", "使命", "神秘"], wuxing: "water" },
  INFP: { description: "调停者，理想主义，忠于内心价值观", keywords: ["理想", "共情", "创作"], wuxing: "wood" },
  ENFJ: { description: "主人公，天生导师，激励他人成长", keywords: ["激励", "沟通", "感召"], wuxing: "fire" },
  ENFP: { description: "竞选者，充满热情，能量无限", keywords: ["热情", "创意", "自由"], wuxing: "wood" },
  ISTJ: { description: "物流师，可靠稳重，坚守规则与职责", keywords: ["可靠", "秩序", "踏实"], wuxing: "earth" },
  ISFJ: { description: "守护者，无私奉献，守护所爱之人", keywords: ["守护", "细心", "忠诚"], wuxing: "earth" },
  ESTJ: { description: "总经理，高效执行，善于管理资源", keywords: ["执行", "管理", "标准"], wuxing: "earth" },
  ESFJ: { description: "执政官，热心助人，维系和谐关系", keywords: ["和谐", "合作", "关怀"], wuxing: "earth" },
  ISTP: { description: "鉴赏家，冷静分析，精通各类技能", keywords: ["技艺", "冷静", "实践"], wuxing: "metal" },
  ISFP: { description: "探险家，随性艺术，活在当下", keywords: ["艺术", "自由", "感性"], wuxing: "wood" },
  ESTP: { description: "企业家，大胆冒险，直接行动", keywords: ["行动", "冒险", "敏锐"], wuxing: "fire" },
  ESFP: { description: "表演者，热爱生活，感染力极强", keywords: ["活力", "表演", "乐趣"], wuxing: "fire" },
};

export function buildMbti(type: string): MbtiResult {
  const profile = MBTI_PROFILES[type];
  if (!profile) {
    throw new Error(`Unknown MBTI type: ${type}`);
  }
  return { type, ...profile };
}
