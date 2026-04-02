import { fnv1a32, mulberry32 } from "./hash";

export type TarotCard = {
  id: number;
  name: string;
  emoji: string;
  positive: string;
  negative: string;
  trait: string;
  traitNeg: string;
};

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const MAJOR_ARCANA: TarotCard[] = [
  { id: 0,  name: "愚者",   emoji: "🃏", positive: "新的开始、自由、冒险精神",  negative: "鲁莽、缺乏方向、不负责任",   trait: "天真冒险者",   traitNeg: "迷途的旅人" },
  { id: 1,  name: "魔术师", emoji: "🎩", positive: "意志力、技艺、天赋创造",    negative: "欺骗、操纵、资源浪费",      trait: "天赋异禀",     traitNeg: "虚有其表" },
  { id: 2,  name: "女祭司", emoji: "🌙", positive: "直觉、神秘知识、内在智慧",  negative: "压抑感受、秘而不宣、浅薄",   trait: "直觉先知",     traitNeg: "沉默的谜" },
  { id: 3,  name: "皇后",   emoji: "🌿", positive: "丰饶、创造力、母性滋养",   negative: "依赖、停滞、创造力受阻",     trait: "创造丰盛",     traitNeg: "过度依赖" },
  { id: 4,  name: "皇帝",   emoji: "👑", positive: "权威、稳定、有序领导",      negative: "僵化、独裁、控制欲",        trait: "稳固权威",     traitNeg: "铁腕专制" },
  { id: 5,  name: "教皇",   emoji: "📜", positive: "传统智慧、精神引导、传承",  negative: "教条、盲从、墨守成规",       trait: "智慧传承",     traitNeg: "教条束缚" },
  { id: 6,  name: "恋人",   emoji: "💞", positive: "和谐、选择、价值观对齐",    negative: "犹豫不决、价值观冲突",       trait: "和谐共振",     traitNeg: "选择困境" },
  { id: 7,  name: "战车",   emoji: "⚡", positive: "意志征服、自律、胜利前行",  negative: "失控、蛮力、方向偏差",       trait: "意志征服",     traitNeg: "失控冲撞" },
  { id: 8,  name: "力量",   emoji: "🦁", positive: "内在勇气、耐心、温柔坚韧",  negative: "软弱、自我怀疑、放弃",       trait: "温柔坚韧",     traitNeg: "内心软弱" },
  { id: 9,  name: "隐士",   emoji: "🕯️", positive: "独行探索、内省、寻找真理", negative: "孤立、拒绝帮助、过度退缩",   trait: "独行探索者",   traitNeg: "自我放逐" },
  { id: 10, name: "命运之轮", emoji: "🎡", positive: "转机、循环、顺势而为", negative: "厄运、抗拒变化、受困命运",     trait: "乘势而起",     traitNeg: "困于轮回" },
  { id: 11, name: "正义",   emoji: "⚖️", positive: "公正、平衡、因果真理",   negative: "不公正、推诿责任、不诚实",    trait: "公正守护者",   traitNeg: "失衡裁判" },
  { id: 12, name: "倒吊人", emoji: "🙃", positive: "牺牲换取顿悟、新视角",     negative: "无意义牺牲、拖延、执念",      trait: "牺牲觉悟者",   traitNeg: "无谓耗损" },
  { id: 13, name: "死神",   emoji: "🌑", positive: "终结后的重生、蜕变转化",   negative: "抗拒改变、停滞、恐惧失去",   trait: "涅槃重生",     traitNeg: "拒绝蜕变" },
  { id: 14, name: "节制",   emoji: "🌊", positive: "平衡调和、耐心、中庸之道", negative: "极端、失调、缺乏耐心",        trait: "平衡调和师",   traitNeg: "失调极端" },
  { id: 15, name: "恶魔",   emoji: "🔗", positive: "欲望驱动、突破束缚的勇气", negative: "沉迷、自我囚禁、消极执念",   trait: "欲望解放者",   traitNeg: "自我囚禁" },
  { id: 16, name: "塔",     emoji: "⛈️", positive: "颠覆旧秩序、激烈重建",   negative: "灾难、混乱、无法掌控的崩塌", trait: "颠覆重建者",   traitNeg: "灾难崩塌" },
  { id: 17, name: "星星",   emoji: "⭐", positive: "希望、启迪、指引方向",     negative: "绝望、迷失、对未来恐惧",      trait: "希望灯塔",     traitNeg: "希望熄灭" },
  { id: 18, name: "月亮",   emoji: "🌕", positive: "直觉、潜意识、神秘探索",   negative: "幻觉、迷惑、恐惧的阴影",     trait: "潜意识向导",   traitNeg: "幻象迷途" },
  { id: 19, name: "太阳",   emoji: "☀️", positive: "光明、成功、充沛活力",   negative: "自负、过度乐观、能量过剩",    trait: "光明使者",     traitNeg: "灼热过剩" },
  { id: 20, name: "审判",   emoji: "🔔", positive: "觉醒、重生、回应内心召唤", negative: "自我怀疑、拒绝面对过去",      trait: "觉醒重生者",   traitNeg: "逃避审判" },
  { id: 21, name: "世界",   emoji: "🌍", positive: "圆满完成、整合、宇宙合一", negative: "未竟之事、半途而废",          trait: "圆满完成者",   traitNeg: "近而未达" },
];

export type TarotDraw = {
  card: TarotCard;
  upright: boolean;
  trait: string;
  meaning: string;
};

export function drawTarot(name: string, timestampMs: number): TarotDraw {
  const seed = `${name}:${timestampMs}`;
  const hash = fnv1a32(seed);
  const rng = mulberry32(hash);

  const cardIndex = Math.floor(rng() * 22);
  const upright = rng() > 0.5;
  const card = MAJOR_ARCANA[cardIndex];

  return {
    card,
    upright,
    trait: upright ? card.trait : card.traitNeg,
    meaning: upright ? card.positive : card.negative,
  };
}

export function getRarity(cardId: number): Rarity {
  if (cardId <= 7) return "common";
  if (cardId <= 12) return "uncommon";
  if (cardId <= 17) return "rare";
  if (cardId <= 20) return "epic";
  return "legendary";
}
