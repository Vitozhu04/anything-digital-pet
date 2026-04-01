# Anything Digital Pet — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code Skill that generates a "digital pet" for any project or URL — with a BaZi-based species, tarot-drawn rarity, MBTI personality, DiceBear avatar, and a beautiful web card page.

**Architecture:** Next.js 15 app serves the pet card at `localhost:3002/pet/[name]`. Claude Code Skills gather context, determine MBTI answers, then POST to `/api/pet/create` which runs BaZi + tarot + LLM generation. All visual/personality traits are deterministically derived from `hash(name + timestamp)` — same inputs always produce the same pet (Bones), while the LLM-generated description is persisted once in `.pet/[name].json` (Soul).

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, lunar-javascript (BaZi), @ai-sdk/anthropic (LLM), Zod (validation), DiceBear HTTP API (avatar via URL)

---

## File Map

```
/Users/vito/Dev/anything-digital-pet/
├── src/
│   ├── lib/
│   │   ├── hash.ts                  - FNV-1a hash → 32-bit integer seed
│   │   ├── bazi.ts                  - Current timestamp → 四柱 + 五行 (adapted from mingzi)
│   │   ├── tarot.ts                 - 22 major arcana data + deterministic draw
│   │   ├── mbti.ts                  - MBTI 4-dimension types + wuxing mapping
│   │   ├── avatar.ts                - DiceBear URL from element + hash seed
│   │   └── persona.ts               - LLM call: name + description + system prompt
│   ├── types/
│   │   └── pet.ts                   - Pet, PetBones, PetSoul Zod schemas + TS types
│   └── app/
│       ├── layout.tsx               - Root layout
│       ├── page.tsx                 - Pet list (reads .pet/*.json)
│       ├── api/
│       │   └── pet/
│       │       └── create/
│       │           └── route.ts     - POST /api/pet/create
│       └── pet/
│           └── [name]/
│               └── page.tsx         - Pet card display page
├── .claude/
│   └── skills/
│       ├── create-pet-link.md       - Skill: /create-pet:link <url>
│       ├── create-pet-cli.md        - Skill: /create-pet:cli
│       └── pet.md                   - Skill: /pet [name]
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── CLAUDE.md
```

---

## Task 0: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `CLAUDE.md`

- [ ] **Step 1: Init Next.js project**

```bash
cd /Users/vito/Dev
npx create-next-app@latest anything-digital-pet \
  --typescript --tailwind --app --no-src-dir --no-eslint \
  --import-alias "@/*"
cd anything-digital-pet
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add lunar-javascript @ai-sdk/anthropic ai zod
pnpm add -D @types/node
```

- [ ] **Step 3: Create src directory structure**

```bash
mkdir -p src/lib src/types src/app/api/pet/create src/app/pet/[name] .claude/skills
```

- [ ] **Step 4: Update next.config.ts to use port 3002**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002"
  }
}
```

- [ ] **Step 5: Set up Jest**

```bash
pnpm add -D jest @types/jest ts-jest jest-environment-node
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testPathPattern": "src/lib/__tests__",
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    }
  }
}
```

- [ ] **Step 6: Create .env.local.example**

```bash
cat > .env.local.example << 'EOF'
ANTHROPIC_API_KEY=sk-ant-your-key-here
EOF
cp .env.local.example .env.local
```

- [ ] **Step 7: Write CLAUDE.md**

```markdown
# Anything Digital Pet

## Stack
- Next.js 15 App Router + Tailwind + TypeScript
- LLM: Vercel AI SDK + Anthropic Claude (claude-haiku-4-5-20251001)
- BaZi: lunar-javascript (copied from mingzi)
- Avatar: DiceBear HTTP API (URL-based, no npm needed)

## Architecture
- Bones (deterministic): hash(name+ts) → BaZi → species, tarot → rarity, DiceBear URL
- Soul (LLM, persisted): MBTI + bones → name + description + system prompt
- Storage: .pet/[name].json in the user's project directory

## Key Files
- `src/lib/hash.ts` — FNV-1a hash
- `src/lib/bazi.ts` — BaZi calculator (adapted from mingzi)
- `src/lib/tarot.ts` — 22 major arcana + deterministic draw
- `src/lib/mbti.ts` — 4-question MBTI mapping
- `src/lib/avatar.ts` — DiceBear URL generator
- `src/lib/persona.ts` — LLM persona generation
- `src/app/api/pet/create/route.ts` — POST API for pet creation

## Dev
```bash
pnpm dev   # runs on port 3002
```
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold anything-digital-pet Next.js project"
```

---

## Task 1: Hash Utility

**Files:**
- Create: `src/lib/hash.ts`
- Create: `src/lib/__tests__/hash.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/hash.test.ts
import { fnv1a32, mulberry32 } from "../hash";

describe("fnv1a32", () => {
  it("returns consistent hash for same input", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
  });

  it("returns different hashes for different inputs", () => {
    expect(fnv1a32("abc")).not.toBe(fnv1a32("xyz"));
  });

  it("returns known value for 'test'", () => {
    // FNV-1a 32-bit of "test" = 0xbc2c0be9 = 3157003241
    expect(fnv1a32("test")).toBe(3157003241);
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/__tests__/hash.test.ts
```
Expected: FAIL — "Cannot find module '../hash'"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/hash.ts

/**
 * FNV-1a 32-bit hash. Deterministic, no external deps.
 * Same algorithm used by Claude Code Buddy for avatar generation.
 */
export function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // keep 32-bit unsigned
  }
  return hash;
}

/**
 * Mulberry32 PRNG seeded with fnv1a32 hash.
 * Returns a function that yields floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * One-shot: hash a string into a float in [0, 1).
 */
export function hashFloat(str: string): number {
  return mulberry32(fnv1a32(str))();
}

/**
 * One-shot: hash a string into an integer in [0, max).
 */
export function hashInt(str: string, max: number): number {
  return Math.floor(hashFloat(str) * max);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/lib/__tests__/hash.test.ts
```
Expected: PASS (3 suites, 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/hash.ts src/lib/__tests__/hash.test.ts
git commit -m "feat: add FNV-1a hash and Mulberry32 PRNG utility"
```

---

## Task 2: BaZi Calculator

**Files:**
- Create: `src/lib/bazi.ts`
- Create: `src/lib/__tests__/bazi.test.ts`

> Adapted from `/Users/vito/Dev/mingzi/src/lib/bazi-calculator.ts`. Key change: add `calculateCurrentBaZi()` that takes a `Date` (defaults to `new Date()`), and expose a simpler `dominantElement` string.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/bazi.test.ts
import { calculateBaZiFromDate, getDominantElement } from "../bazi";

describe("calculateBaZiFromDate", () => {
  it("returns four pillars with celestial and terrestrial", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const result = calculateBaZiFromDate(date);
    expect(result.year.celestial).toBeTruthy();
    expect(result.year.terrestrial).toBeTruthy();
    expect(result.month.celestial).toBeTruthy();
    expect(result.day.celestial).toBeTruthy();
    expect(result.hour.celestial).toBeTruthy();
  });

  it("returns consistent result for same date", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const r1 = calculateBaZiFromDate(date);
    const r2 = calculateBaZiFromDate(date);
    expect(r1.fullString).toBe(r2.fullString);
  });

  it("returns element distribution summing to 8", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const result = calculateBaZiFromDate(date);
    const total = Object.values(result.elementDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(8);
  });
});

describe("getDominantElement", () => {
  it("returns one of the five elements", () => {
    const date = new Date("2026-04-01T14:23:00Z");
    const bazi = calculateBaZiFromDate(date);
    const el = getDominantElement(bazi.elementDistribution);
    expect(["wood", "fire", "earth", "metal", "water"]).toContain(el);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/__tests__/bazi.test.ts
```
Expected: FAIL — "Cannot find module '../bazi'"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/bazi.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require("lunar-javascript");

export type BaZiPillar = { celestial: string; terrestrial: string };

export type ElementDistribution = {
  wood: number; fire: number; earth: number; metal: number; water: number;
};

export type BaZiResult = {
  year: BaZiPillar;
  month: BaZiPillar;
  day: BaZiPillar;
  hour: BaZiPillar;
  fullString: string;
  elementDistribution: ElementDistribution;
};

const STEM_ELEMENT: Record<string, keyof ElementDistribution> = {
  甲: "wood", 乙: "wood",
  丙: "fire", 丁: "fire",
  戊: "earth", 己: "earth",
  庚: "metal", 辛: "metal",
  壬: "water", 癸: "water",
};

const BRANCH_ELEMENT: Record<string, keyof ElementDistribution> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood",
  辰: "earth", 巳: "fire", 午: "fire", 未: "earth",
  申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};

export function calculateBaZiFromDate(date: Date = new Date()): BaZiResult {
  const solar = Solar.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0
  );
  const eightChar = solar.getLunar().getEightChar();

  const yearStr: string = eightChar.getYear();
  const monthStr: string = eightChar.getMonth();
  const dayStr: string = eightChar.getDay();
  const hourStr: string = eightChar.getTime();

  const pillars: BaZiPillar[] = [
    { celestial: yearStr[0], terrestrial: yearStr[1] },
    { celestial: monthStr[0], terrestrial: monthStr[1] },
    { celestial: dayStr[0], terrestrial: dayStr[1] },
    { celestial: hourStr[0], terrestrial: hourStr[1] },
  ];

  const dist: ElementDistribution = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const p of pillars) {
    const s = STEM_ELEMENT[p.celestial];
    if (s) dist[s]++;
    const b = BRANCH_ELEMENT[p.terrestrial];
    if (b) dist[b]++;
  }

  return {
    year: pillars[0],
    month: pillars[1],
    day: pillars[2],
    hour: pillars[3],
    fullString: `${yearStr} ${monthStr} ${dayStr} ${hourStr}`,
    elementDistribution: dist,
  };
}

/** Returns the element with the highest count. Ties broken by order: wood > fire > earth > metal > water */
export function getDominantElement(dist: ElementDistribution): keyof ElementDistribution {
  const order: (keyof ElementDistribution)[] = ["wood", "fire", "earth", "metal", "water"];
  return order.reduce((max, el) => (dist[el] > dist[max] ? el : max), order[0]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/lib/__tests__/bazi.test.ts
```
Expected: PASS (2 suites, 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/bazi.ts src/lib/__tests__/bazi.test.ts
git commit -m "feat: add BaZi calculator adapted from lunar-javascript"
```

---

## Task 3: Tarot Data & Deterministic Draw

**Files:**
- Create: `src/lib/tarot.ts`
- Create: `src/lib/__tests__/tarot.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/tarot.test.ts
import { MAJOR_ARCANA, drawTarot, getRarity } from "../tarot";

describe("MAJOR_ARCANA", () => {
  it("has exactly 22 cards", () => {
    expect(MAJOR_ARCANA).toHaveLength(22);
  });

  it("each card has required fields", () => {
    for (const card of MAJOR_ARCANA) {
      expect(card.id).toBeGreaterThanOrEqual(0);
      expect(card.id).toBeLessThanOrEqual(21);
      expect(card.name).toBeTruthy();
      expect(card.positive).toBeTruthy();
      expect(card.negative).toBeTruthy();
      expect(card.trait).toBeTruthy();
    }
  });
});

describe("drawTarot", () => {
  it("returns a card from the deck", () => {
    const draw = drawTarot("myproject", 1743516180000);
    expect(draw.card.id).toBeGreaterThanOrEqual(0);
    expect(draw.card.id).toBeLessThanOrEqual(21);
    expect(typeof draw.upright).toBe("boolean");
  });

  it("is deterministic — same name+timestamp yields same card", () => {
    const d1 = drawTarot("myproject", 1743516180000);
    const d2 = drawTarot("myproject", 1743516180000);
    expect(d1.card.id).toBe(d2.card.id);
    expect(d1.upright).toBe(d2.upright);
  });

  it("different names yield different cards", () => {
    const d1 = drawTarot("alphaproject", 1743516180000);
    const d2 = drawTarot("betaproject", 1743516180000);
    // Not guaranteed, but overwhelmingly likely with 22 cards
    expect(d1.card.id !== d2.card.id || d1.upright !== d2.upright).toBe(true);
  });
});

describe("getRarity", () => {
  it("card 0-7 is common", () => expect(getRarity(3)).toBe("common"));
  it("card 8-12 is uncommon", () => expect(getRarity(10)).toBe("uncommon"));
  it("card 13-17 is rare", () => expect(getRarity(15)).toBe("rare"));
  it("card 18-20 is epic", () => expect(getRarity(19)).toBe("epic"));
  it("card 21 is legendary", () => expect(getRarity(21)).toBe("legendary"));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/__tests__/tarot.test.ts
```
Expected: FAIL — "Cannot find module '../tarot'"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/tarot.ts
import { fnv1a32, mulberry32 } from "./hash";

export type TarotCard = {
  id: number;
  name: string;
  emoji: string;
  positive: string;   // 正位含义
  negative: string;   // 逆位含义
  trait: string;      // 命运特质标签 (正位)
  traitNeg: string;   // 命运特质标签 (逆位)
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

/**
 * Deterministic tarot draw from pet name + creation timestamp.
 */
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

/**
 * Map tarot card id to rarity tier.
 * 0-7: common, 8-12: uncommon, 13-17: rare, 18-20: epic, 21: legendary
 */
export function getRarity(cardId: number): Rarity {
  if (cardId <= 7) return "common";
  if (cardId <= 12) return "uncommon";
  if (cardId <= 17) return "rare";
  if (cardId <= 20) return "epic";
  return "legendary";
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/lib/__tests__/tarot.test.ts
```
Expected: PASS (3 suites, 10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tarot.ts src/lib/__tests__/tarot.test.ts
git commit -m "feat: add 22 major arcana tarot data and deterministic draw"
```

---

## Task 4: MBTI Mapping

**Files:**
- Create: `src/lib/mbti.ts`
- Create: `src/lib/__tests__/mbti.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/mbti.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/__tests__/mbti.test.ts
```
Expected: FAIL — "Cannot find module '../mbti'"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/mbti.ts

export type MbtiDimension = { EI: "E" | "I"; SN: "S" | "N"; TF: "T" | "F"; JP: "J" | "P" };

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

export function getMbtiFromAnswers(ei: "E"|"I", sn: "S"|"N", tf: "T"|"F", jp: "J"|"P"): string {
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
  if (!profile) throw new Error(`Unknown MBTI type: ${type}`);
  return { type, ...profile };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/lib/__tests__/mbti.test.ts
```
Expected: PASS (3 suites, 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mbti.ts src/lib/__tests__/mbti.test.ts
git commit -m "feat: add MBTI 4-question module with 16 type profiles"
```

---

## Task 5: Avatar URL Generator

**Files:**
- Create: `src/lib/avatar.ts`
- Create: `src/lib/__tests__/avatar.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/avatar.test.ts
import { getDiceBearUrl, ELEMENT_SPECIES } from "../avatar";

describe("ELEMENT_SPECIES", () => {
  it("has all five elements", () => {
    expect(ELEMENT_SPECIES.wood).toBeDefined();
    expect(ELEMENT_SPECIES.fire).toBeDefined();
    expect(ELEMENT_SPECIES.earth).toBeDefined();
    expect(ELEMENT_SPECIES.metal).toBeDefined();
    expect(ELEMENT_SPECIES.water).toBeDefined();
  });
});

describe("getDiceBearUrl", () => {
  it("returns a valid URL string", () => {
    const url = getDiceBearUrl("water", "myseed123");
    expect(url).toMatch(/^https:\/\/api\.dicebear\.com/);
  });

  it("uses correct style for each element", () => {
    expect(getDiceBearUrl("wood", "s")).toContain("lorelei");
    expect(getDiceBearUrl("fire", "s")).toContain("adventurer");
    expect(getDiceBearUrl("earth", "s")).toContain("avataaars");
    expect(getDiceBearUrl("metal", "s")).toContain("bottts");
    expect(getDiceBearUrl("water", "s")).toContain("fun-emoji");
  });

  it("is deterministic", () => {
    expect(getDiceBearUrl("water", "seed")).toBe(getDiceBearUrl("water", "seed"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/__tests__/avatar.test.ts
```
Expected: FAIL — "Cannot find module '../avatar'"

- [ ] **Step 3: Write implementation**

```typescript
// src/lib/avatar.ts
import type { ElementDistribution } from "./bazi";

type Element = keyof ElementDistribution;

export type SpeciesInfo = {
  name: string;      // e.g. "深渊章鱼"
  nameEn: string;    // e.g. "Octopus"
  emoji: string;
  diceBearStyle: string;
};

export const ELEMENT_SPECIES: Record<Element, SpeciesInfo> = {
  wood:  { name: "苍龙",   nameEn: "Dragon",  emoji: "🐉", diceBearStyle: "lorelei" },
  fire:  { name: "烈焰狐", nameEn: "Fox",     emoji: "🦊", diceBearStyle: "adventurer" },
  earth: { name: "土灵熊", nameEn: "Bear",    emoji: "🐻", diceBearStyle: "avataaars" },
  metal: { name: "铁甲兽", nameEn: "Mech",    emoji: "🤖", diceBearStyle: "bottts" },
  water: { name: "深渊章鱼", nameEn: "Octopus", emoji: "🐙", diceBearStyle: "fun-emoji" },
};

/**
 * Returns a DiceBear v9 HTTP API URL.
 * No npm needed — avatar is loaded as an <img src> in the browser.
 */
export function getDiceBearUrl(element: Element, seed: string): string {
  const { diceBearStyle } = ELEMENT_SPECIES[element];
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/${diceBearStyle}/svg?seed=${encodedSeed}&size=200`;
}

export function getAvatarSeed(name: string, timestampMs: number): string {
  return `${name}:${timestampMs}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/lib/__tests__/avatar.test.ts
```
Expected: PASS (2 suites, 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/avatar.ts src/lib/__tests__/avatar.test.ts
git commit -m "feat: add DiceBear avatar URL generator with element→species mapping"
```

---

## Task 6: Pet Types (Zod Schema)

**Files:**
- Create: `src/types/pet.ts`

- [ ] **Step 1: Write the schema**

```typescript
// src/types/pet.ts
import { z } from "zod";

export const BaZiPillarSchema = z.object({
  celestial: z.string(),
  terrestrial: z.string(),
});

export const ElementDistributionSchema = z.object({
  wood: z.number(), fire: z.number(), earth: z.number(),
  metal: z.number(), water: z.number(),
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
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  avatarUrl: z.string().url(),
  avatarSeed: z.string(),
});

export const PetSoulSchema = z.object({
  name: z.string(),
  nameEn: z.string(),
  species: z.string(),
  speciesEn: z.string(),
  emoji: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
});

export const PetSchema = z.object({
  version: z.literal("1.0"),
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/pet.ts
git commit -m "feat: add Pet Zod schema and TypeScript types"
```

---

## Task 7: LLM Persona Generator

**Files:**
- Create: `src/lib/persona.ts`

> Requires `ANTHROPIC_API_KEY` in `.env.local`. Uses `claude-haiku-4-5-20251001` for cost-efficiency (fast, cheap, still very capable for creative writing).

- [ ] **Step 1: Create .env.local**

```bash
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=your_key_here
EOF
```

- [ ] **Step 2: Write implementation**

```typescript
// src/lib/persona.ts
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { PetBones } from "../types/pet";
import { ELEMENT_SPECIES } from "./avatar";

const PersonaOutputSchema = z.object({
  name: z.string().describe("Pet's Chinese name, 2-3 characters, evocative"),
  nameEn: z.string().describe("Pet's English name, 1-2 words"),
  description: z.string().describe("2-3 sentence personality description in Chinese"),
  systemPrompt: z.string().describe("System prompt in Chinese for the pet to use in conversations (100-150 words)"),
});

export type PersonaOutput = z.infer<typeof PersonaOutputSchema>;

export async function generatePersona(
  bones: PetBones,
  projectContext: string
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
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: PersonaOutputSchema,
    prompt,
  });

  return result.object;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/persona.ts .env.local
git commit -m "feat: add LLM persona generator using claude-haiku"
```

---

## Task 8: API Route — POST /api/pet/create

**Files:**
- Create: `src/app/api/pet/create/route.ts`

> This route is the core engine: takes context + MBTI + name suggestion → runs all deterministic calculations → calls LLM → returns full Pet JSON.

- [ ] **Step 1: Write implementation**

```typescript
// src/app/api/pet/create/route.ts
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
  timestampMs: z.number().optional(), // allow override for testing; defaults to now
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreatePetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.message },
      { status: 400 }
    );
  }

  const { source, sourceUrl, projectContext, mbti, timestampMs } = parsed.data;
  const now = new Date(timestampMs ?? Date.now());
  const ts = now.getTime();

  // — Bones: deterministic calculations —
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

  // — Soul: LLM generation —
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
```

- [ ] **Step 2: Start dev server and test with curl**

```bash
pnpm dev &
sleep 3
curl -s -X POST http://localhost:3002/api/pet/create \
  -H "Content-Type: application/json" \
  -d '{
    "source": "cli",
    "projectContext": "A Next.js web framework for building modern applications with TypeScript and React",
    "mbti": {"ei": "E", "sn": "N", "tf": "T", "jp": "J"}
  }' | python3 -m json.tool | head -60
```
Expected: JSON response with `success: true` and full pet data

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pet/create/route.ts
git commit -m "feat: add POST /api/pet/create API route"
```

---

## Task 9: Pet Card Web Page

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/pet/[name]/page.tsx`

> The pet card page accepts the pet data via query param `?data=<base64-encoded-json>` so it can be opened directly by the skill without a database.

- [ ] **Step 1: Write the pet card page**

```typescript
// src/app/pet/[name]/page.tsx
import { Suspense } from "react";
import PetCardClient from "./PetCardClient";

export default function PetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Loading...</div>}>
      <PetCardClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: Create PetCardClient**

```typescript
// src/app/pet/[name]/PetCardClient.tsx
"use client";
import { useSearchParams } from "next/navigation";
import type { Pet } from "@/types/pet";

const RARITY_STYLES: Record<string, { bg: string; border: string; badge: string; glow: string }> = {
  common:    { bg: "from-gray-800 to-gray-900",   border: "border-gray-500",   badge: "bg-gray-500",   glow: "shadow-gray-500/20" },
  uncommon:  { bg: "from-green-900 to-gray-900",  border: "border-green-500",  badge: "bg-green-500",  glow: "shadow-green-500/30" },
  rare:      { bg: "from-blue-900 to-gray-900",   border: "border-blue-500",   badge: "bg-blue-500",   glow: "shadow-blue-500/30" },
  epic:      { bg: "from-purple-900 to-gray-900", border: "border-purple-500", badge: "bg-purple-500", glow: "shadow-purple-500/30" },
  legendary: { bg: "from-yellow-900 to-gray-900", border: "border-yellow-400", badge: "bg-yellow-400", glow: "shadow-yellow-400/40" },
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: "text-green-400", fire: "text-red-400",
  earth: "text-yellow-400", metal: "text-slate-400", water: "text-blue-400",
};

export default function PetCardClient() {
  const params = useSearchParams();
  const raw = params.get("data");

  if (!raw) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        No pet data. Add <code>?data=&lt;base64&gt;</code> to the URL.
      </div>
    );
  }

  let pet: Pet;
  try {
    pet = JSON.parse(atob(raw));
  } catch {
    return <div className="text-red-400 p-8">Invalid pet data.</div>;
  }

  const rStyle = RARITY_STYLES[pet.bones.rarity];
  const elColor = ELEMENT_COLORS[pet.bones.dominantElement];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className={`w-full max-w-md rounded-2xl bg-gradient-to-b ${rStyle.bg} border ${rStyle.border} shadow-2xl ${rStyle.glow} overflow-hidden`}>

        {/* Header */}
        <div className="p-6 text-center border-b border-white/10">
          <img
            src={pet.bones.avatarUrl}
            alt={pet.soul.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 bg-white/5"
          />
          <h1 className="text-3xl font-bold text-white">{pet.soul.name}</h1>
          <p className="text-gray-400 text-sm mt-1">{pet.soul.nameEn} · {pet.soul.species} {pet.soul.emoji}</p>
          <span className={`inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wider ${rStyle.badge}`}>
            {pet.bones.rarity}
          </span>
        </div>

        {/* Stats */}
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-16">五行</span>
            <span className={`font-semibold ${elColor}`}>
              {pet.bones.dominantElement} · 木{pet.bones.bazi.elementDistribution.wood} 火{pet.bones.bazi.elementDistribution.fire} 土{pet.bones.bazi.elementDistribution.earth} 金{pet.bones.bazi.elementDistribution.metal} 水{pet.bones.bazi.elementDistribution.water}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-16">MBTI</span>
            <span className="text-white font-semibold">{pet.bones.mbti}</span>
            <span className="text-gray-400 text-xs">{pet.bones.mbtiDescription}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-16">命牌</span>
            <span className="text-white">
              {pet.bones.tarot.name}{pet.bones.tarot.upright ? " 正位" : " 逆位"} — <em className="text-gray-300">{pet.bones.tarot.trait}</em>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-16">八字</span>
            <span className="text-gray-300 font-mono">{pet.bones.bazi.fullString}</span>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-4">
          <p className="text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-4">
            {pet.soul.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-xs text-gray-600 flex justify-between">
          <span>创建于 {new Date(pet.meta.createdAt).toLocaleDateString("zh-CN")}</span>
          <span>anything-digital-pet</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update root page to show instructions**

```typescript
// src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-4xl font-bold">🐾 Anything Digital Pet</h1>
        <p className="text-gray-400">Give any project or URL a soul.</p>
        <div className="bg-gray-900 rounded-xl p-6 text-left text-sm space-y-2 font-mono">
          <p className="text-green-400"># In your project:</p>
          <p className="text-white">/create-pet:cli</p>
          <p className="text-gray-500 font-sans">Generate a pet from current project</p>
          <br />
          <p className="text-white">/create-pet:link https://github.com/...</p>
          <p className="text-gray-500 font-sans">Generate a pet from a URL</p>
          <br />
          <p className="text-white">/pet</p>
          <p className="text-gray-500 font-sans">Summon your pet for a chat</p>
        </div>
        <p className="text-gray-600 text-xs">Server running on port 3002</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Update layout with dark background**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anything Digital Pet",
  description: "Give any project or URL a soul",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-gray-950 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "feat: add pet card page with rarity-themed design"
```

---

## Task 10: Claude Code Skills

**Files:**
- Create: `.claude/skills/create-pet-link.md`
- Create: `.claude/skills/create-pet-cli.md`
- Create: `.claude/skills/pet.md`

> These are SKILL.md files that instruct Claude to orchestrate the pet creation flow. They are placed in `.claude/skills/` of this project, and users should symlink or copy them to `~/.claude/skills/` for global availability.

- [ ] **Step 1: Create /create-pet:cli skill**

```markdown
<!-- .claude/skills/create-pet-cli.md -->
# Skill: /create-pet:cli

Generate a digital pet that represents the current project.

## Steps

1. **Read project context**
   - Read README.md (first 500 chars)
   - Read CLAUDE.md if it exists
   - Run `git log --oneline -10` to understand recent activity
   - Summarize the project in 2-3 sentences (this is the `projectContext`)

2. **Answer MBTI questions** — based on the project's character:
   - Q1 (E/I): Is this project active/outward (E) or focused/internal (I)?
   - Q2 (S/N): Does it deal with concrete details (S) or abstract systems (N)?
   - Q3 (T/F): Is it logic-driven (T) or values/people-driven (F)?
   - Q4 (J/P): Is it structured/planned (J) or flexible/exploratory (P)?
   - Pick the single best answer for each. Do NOT ask the user.

3. **Ensure pet server is running**
   - Check: `curl -s http://localhost:3002 -o /dev/null -w "%{http_code}"`
   - If not 200: remind user to run `pnpm dev` in the anything-digital-pet project

4. **Create the pet via API**
   ```bash
   curl -s -X POST http://localhost:3002/api/pet/create \
     -H "Content-Type: application/json" \
     -d '{
       "source": "cli",
       "projectContext": "<projectContext>",
       "mbti": {"ei": "<E_or_I>", "sn": "<S_or_N>", "tf": "<T_or_F>", "jp": "<J_or_P>"}
     }'
   ```

5. **Save pet to .pet/ directory**
   - Create `.pet/` directory if it doesn't exist
   - Save the response JSON as `.pet/<soul.name>.json`
   - The filename is the pet's Chinese name (e.g. `.pet/玄默.json`)

6. **Open pet card in browser**
   - Base64-encode the pet JSON: `python3 -c "import base64,json,sys; print(base64.b64encode(sys.stdin.read().encode()).decode())" < .pet/<name>.json`
   - Open: `open "http://localhost:3002/pet/<name>?data=<base64>"`

7. **Announce the pet**
   - Print a summary: name, species, rarity, MBTI, tarot card
   - Example: "🐙 玄默 (Xuanmo) has been born! Epic Deep-sea Octopus · INFJ · 月亮逆位"
```

- [ ] **Step 2: Create /create-pet:link skill**

```markdown
<!-- .claude/skills/create-pet-link.md -->
# Skill: /create-pet:link <url>

Generate a digital pet from a URL (GitHub repo, website, documentation, etc.)

## Steps

1. **Fetch URL content**
   - Use WebFetch to retrieve the page/README
   - Extract: title, description, key features, purpose
   - Summarize in 2-3 sentences as `projectContext`

2. **Answer MBTI questions** — based on the content's character:
   - Q1 (E/I): Active/social tool (E) vs. focused/internal tool (I)?
   - Q2 (S/N): Practical/concrete (S) vs. abstract/theoretical (N)?
   - Q3 (T/F): Logic/performance focused (T) vs. human/community focused (F)?
   - Q4 (J/P): Structured/opinionated (J) vs. flexible/open-ended (P)?
   - Pick the single best answer. Do NOT ask the user.

3. **Ensure pet server is running**
   - Check: `curl -s http://localhost:3002 -o /dev/null -w "%{http_code}"`
   - If not 200: remind user to run `pnpm dev` in the anything-digital-pet project

4. **Create the pet via API**
   ```bash
   curl -s -X POST http://localhost:3002/api/pet/create \
     -H "Content-Type: application/json" \
     -d '{
       "source": "link",
       "sourceUrl": "<url>",
       "projectContext": "<projectContext>",
       "mbti": {"ei": "<E_or_I>", "sn": "<S_or_N>", "tf": "<T_or_F>", "jp": "<J_or_P>"}
     }'
   ```

5. **Save pet to .pet/ directory**
   - Create `.pet/` directory if it doesn't exist
   - Parse the API response JSON to get `soul.name` (the Chinese name)
   - Save response JSON as `.pet/<soul.name>.json`

6. **Open pet card in browser**
   - Base64-encode the pet JSON: `python3 -c "import base64,sys; print(base64.b64encode(open('.pet/<soul.name>.json').read().encode()).decode())"`
   - Open: `open "http://localhost:3002/pet/<soul.name>?data=<base64>"`

7. **Announce the pet**
   - Print: `{emoji} {soul.name} ({soul.nameEn}) has been born! {bones.rarity} {soul.species} · {bones.mbti} · {tarot.name} {"正位" if upright else "逆位"}`
```

- [ ] **Step 3: Create /pet skill**

```markdown
<!-- .claude/skills/pet.md -->
# Skill: /pet [name]

Summon your digital pet for conversation and play.

## Steps

1. **Find the pet**
   - List `.pet/*.json` files
   - If `[name]` was provided, find matching file
   - If no argument or only one pet exists, use it
   - If multiple pets exist and no name given, list them and ask user to choose

2. **Load pet data**
   - Read the `.pet/<name>.json` file
   - Extract: `soul.systemPrompt`, `soul.name`, `soul.species`, `bones.rarity`, `bones.mbti`, `bones.tarot.name`

3. **Announce your pet**
   - Print: `{emoji} {name} ({nameEn}) — {rarity} {species} · {mbti} · {tarot} {"正位" if upright else "逆位"}`
   - Example: `🐙 玄默 (Xuanmo) — Epic 深渊章鱼 · INFJ · 月亮逆位`

4. **Enter pet conversation mode**
   - Adopt the pet's system prompt and personality
   - Stay in character until user says "bye" or "/exit"
   - Respond as the pet would, with its unique voice and perspective

5. **Open card** (optional)
   - If user says "show card" or "看卡片":
     - Base64-encode the JSON and open: `open "http://localhost:3002/pet/<name>?data=<base64>"`
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/
git commit -m "feat: add Claude Code skills for /create-pet and /pet"
```

---

## Task 11: Integration Test

- [ ] **Step 1: Ensure server is running on port 3002**

```bash
curl -s http://localhost:3002 -o /dev/null -w "%{http_code}"
```
Expected: `200`

- [ ] **Step 2: Create a test pet via API**

```bash
curl -s -X POST http://localhost:3002/api/pet/create \
  -H "Content-Type: application/json" \
  -d '{
    "source": "link",
    "sourceUrl": "https://github.com/anthropics/claude-code",
    "projectContext": "Claude Code is an AI coding assistant that lives in your terminal. It understands your codebase, writes code, runs tests, and helps you ship faster using natural language.",
    "mbti": {"ei": "E", "sn": "N", "tf": "T", "jp": "J"}
  }' | python3 -m json.tool
```
Expected: Full pet JSON with all fields populated

- [ ] **Step 3: Save pet JSON and open card**

```bash
mkdir -p /tmp/test-pet
curl -s -X POST http://localhost:3002/api/pet/create \
  -H "Content-Type: application/json" \
  -d '{
    "source": "cli",
    "projectContext": "Claude Code is a terminal-based AI coding assistant that understands your full codebase",
    "mbti": {"ei": "E", "sn": "N", "tf": "T", "jp": "J"}
  }' > /tmp/test-pet/pet.json

# Open the card
DATA=$(python3 -c "import base64,sys; print(base64.b64encode(open('/tmp/test-pet/pet.json').read().encode()).decode())")
open "http://localhost:3002/pet/test?data=${DATA}"
```
Expected: Browser opens with a beautiful pet card

- [ ] **Step 4: Run all unit tests**

```bash
pnpm test
```
Expected: All tests pass (hash, bazi, tarot, mbti, avatar)

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verify integration test and finalize MVP"
```

---

## Setup Instructions (README)

After plan complete, add to README:

```markdown
## Quick Start

1. Clone: `git clone https://github.com/you/anything-digital-pet`
2. Install: `pnpm install`
3. Configure: copy `.env.local.example` → `.env.local`, add `ANTHROPIC_API_KEY`
4. Run: `pnpm dev` (port 3002)
5. Install skills globally:
   ```bash
   mkdir -p ~/.claude/skills
   cp .claude/skills/*.md ~/.claude/skills/
   ```
6. In any project: `/create-pet:cli`
```
