# Desktop Pet v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the pet engine to v2 (N/R/SR/SSR rarity, dynamic species, LLM-generated ASCII art) and build a Tauri 2 desktop pet that responds to agent hooks in real time.

**Architecture:** Two independent modules share `.pet/[name].json`. Phase A updates the TypeScript generation engine (rarity, schema, persona prompt). Phase B builds the Tauri 2 desktop app (transparent window, HTTP server, animations, interactions). A Claude Code hook script bridges any agent to the desktop pet.

**Tech Stack:** TypeScript (engine), Tauri 2 / Rust (desktop backend), vanilla HTML/CSS/JS (WebView frontend), lunar-javascript, @ai-sdk/google, Zod

---

## File Map

```
anything-digital-pet/
├── engine/                           # Pet generation (moved from src/lib)
│   ├── hash.ts                       # FNV-1a + Mulberry32 (unchanged)
│   ├── bazi.ts                       # BaZi calculator (unchanged)
│   ├── tarot.ts                      # Updated: Rarity → N/R/SR/SSR
│   ├── mbti.ts                       # Unchanged
│   ├── persona.ts                    # Updated: dynamic species + asciiArt
│   ├── types.ts                      # New v2 Pet Zod schema
│   ├── create.ts                     # Orchestrator: context → .pet/[name].json
│   └── __tests__/
│       ├── hash.test.ts
│       ├── bazi.test.ts
│       ├── tarot.test.ts             # Updated for N/R/SR/SSR
│       ├── mbti.test.ts
│       └── create.test.ts            # Integration test
├── src-tauri/                        # Tauri 2 Rust backend
│   ├── src/
│   │   ├── lib.rs                    # Tauri plugin setup + commands
│   │   ├── server.rs                 # HTTP server on 23334
│   │   └── tray.rs                   # System tray
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── icons/                        # App icons
├── ui/                               # WebView frontend (plain HTML/CSS/JS)
│   ├── index.html                    # Entry
│   ├── style.css                     # Styles + animations
│   ├── main.js                       # Init, IPC listener, state machine
│   ├── renderer.js                   # ASCII art rendering + animation effects
│   ├── bubble.js                     # Conversation bubble
│   ├── info-card.js                  # Click-to-show info card overlay
│   └── drag.js                       # Window drag via Pointer Capture
├── hooks/
│   └── pet-hook.js                   # Claude Code hook → HTTP POST
├── .claude/skills/
│   ├── create-pet-cli.md             # Updated for v2
│   └── pet.md
└── package.json                      # Scripts: engine test, tauri dev
```

---

## Phase A: Engine Updates

### Task 1: Move engine files and update project structure

**Files:**
- Move: `src/lib/hash.ts` → `engine/hash.ts`
- Move: `src/lib/bazi.ts` → `engine/bazi.ts`
- Move: `src/lib/tarot.ts` → `engine/tarot.ts`
- Move: `src/lib/mbti.ts` → `engine/mbti.ts`
- Move: `src/lib/persona.ts` → `engine/persona.ts`
- Move: `src/lib/__tests__/*` → `engine/__tests__/*`
- Delete: `src/lib/avatar.ts` (replaced by LLM-generated species)
- Create: `engine/types.ts`

- [ ] **Step 1: Create engine directory and move files**

```bash
cd /Users/vito/Dev/anything-digital-pet
mkdir -p engine/__tests__
cp src/lib/hash.ts engine/hash.ts
cp src/lib/bazi.ts engine/bazi.ts
cp src/lib/tarot.ts engine/tarot.ts
cp src/lib/mbti.ts engine/mbti.ts
cp src/lib/persona.ts engine/persona.ts
cp src/lib/__tests__/hash.test.ts engine/__tests__/hash.test.ts
cp src/lib/__tests__/bazi.test.ts engine/__tests__/bazi.test.ts
cp src/lib/__tests__/tarot.test.ts engine/__tests__/tarot.test.ts
cp src/lib/__tests__/mbti.test.ts engine/__tests__/mbti.test.ts
```

- [ ] **Step 2: Update import paths in copied test files**

In each `engine/__tests__/*.test.ts`, change `from "../hash"` to `from "../hash"` (paths stay the same since relative structure is preserved). Verify no `@/` path aliases are used in engine files — engine must be self-contained with relative imports only.

- [ ] **Step 3: Update jest config in package.json**

Change `testMatch` to include engine tests:
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testMatch": ["**/engine/__tests__/**/*.test.ts"],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

- [ ] **Step 4: Run tests to verify move worked**

```bash
pnpm test
```
Expected: All existing tests pass from new location.

- [ ] **Step 5: Commit**

```bash
git add engine/ package.json
git commit -m "refactor: move engine modules to engine/ directory"
```

---

### Task 2: Update rarity system to N/R/SR/SSR

**Files:**
- Modify: `engine/tarot.ts` — change `Rarity` type and `getRarity` function
- Modify: `engine/__tests__/tarot.test.ts` — update rarity tests

- [ ] **Step 1: Update tarot.test.ts with new rarity expectations**

Replace the `getRarity` describe block in `engine/__tests__/tarot.test.ts`:

```typescript
describe("getRarity", () => {
  it("card 0-7 is N", () => {
    for (let i = 0; i <= 7; i++) expect(getRarity(i)).toBe("N");
  });
  it("card 8-14 is R", () => {
    for (let i = 8; i <= 14; i++) expect(getRarity(i)).toBe("R");
  });
  it("card 15-19 is SR", () => {
    for (let i = 15; i <= 19; i++) expect(getRarity(i)).toBe("SR");
  });
  it("card 20-21 is SSR", () => {
    expect(getRarity(20)).toBe("SSR");
    expect(getRarity(21)).toBe("SSR");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- engine/__tests__/tarot.test.ts
```
Expected: FAIL — `getRarity` returns "common" not "N"

- [ ] **Step 3: Update getRarity in engine/tarot.ts**

Replace the `Rarity` type and `getRarity` function:

```typescript
export type Rarity = "N" | "R" | "SR" | "SSR";

// ...existing code...

export function getRarity(cardId: number): Rarity {
  if (cardId <= 7) return "N";
  if (cardId <= 14) return "R";
  if (cardId <= 19) return "SR";
  return "SSR";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- engine/__tests__/tarot.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add engine/tarot.ts engine/__tests__/tarot.test.ts
git commit -m "feat: update rarity system to N/R/SR/SSR"
```

---

### Task 3: Create v2 Pet schema

**Files:**
- Create: `engine/types.ts`

- [ ] **Step 1: Write the v2 schema**

```typescript
// engine/types.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add engine/types.ts
git commit -m "feat: add v2 Pet schema with N/R/SR/SSR and asciiArt"
```

---

### Task 4: Update persona generator for dynamic species + ASCII art

**Files:**
- Modify: `engine/persona.ts`

- [ ] **Step 1: Rewrite persona.ts**

```typescript
// engine/persona.ts
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
  asciiArt: z.array(z.string()).length(5).describe("5行ASCII art, 每行≤20个字符, 用 /\\|_-.~^oO*() 等字符画出物种形象"),
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
```

- [ ] **Step 2: Commit**

```bash
git add engine/persona.ts
git commit -m "feat: update persona for dynamic species, ASCII art, and candidate pool"
```

---

### Task 5: Create engine orchestrator

**Files:**
- Create: `engine/create.ts`
- Create: `engine/__tests__/create.test.ts`

- [ ] **Step 1: Write create.test.ts**

```typescript
// engine/__tests__/create.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- engine/__tests__/create.test.ts
```
Expected: FAIL — "Cannot find module '../create'"

- [ ] **Step 3: Write create.ts**

```typescript
// engine/create.ts
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
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- engine/__tests__/create.test.ts
```
Expected: PASS (4 tests — buildBones is synchronous, doesn't need LLM)

- [ ] **Step 5: Commit**

```bash
git add engine/create.ts engine/__tests__/create.test.ts
git commit -m "feat: add engine orchestrator with buildBones and createPet"
```

---

## Phase B: Tauri 2 Desktop App

### Task 6: Install Rust toolchain and scaffold Tauri project

**Files:**
- Create: `src-tauri/` directory via `cargo tauri init`
- Create: `ui/index.html`

- [ ] **Step 1: Install Rust (if not present)**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version
```
Expected: `rustc 1.x.x`

- [ ] **Step 2: Create minimal UI entry point**

```bash
mkdir -p ui
```

Create `ui/index.html`:
```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pet</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="pet-container">
    <div id="bubble" class="hidden"></div>
    <pre id="ascii-art"></pre>
    <div id="status-icon"></div>
  </div>
  <div id="info-card" class="hidden"></div>
  <script src="main.js" type="module"></script>
</body>
</html>
```

Create `ui/style.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  background: transparent;
  overflow: hidden;
  user-select: none;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
}

#pet-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: grab;
  padding: 8px;
}

#pet-container:active { cursor: grabbing; }

#ascii-art {
  font-size: 14px;
  line-height: 1.2;
  color: #3b82f6;
  text-align: center;
  transition: transform 0.3s ease, opacity 0.3s ease, color 0.3s ease;
}

/* Rarity colors */
.rarity-N  { color: #3b82f6; }
.rarity-R  { color: #a855f7; }
.rarity-SR { color: #eab308; }
.rarity-SSR {
  background: linear-gradient(90deg, #ef4444, #eab308, #ef4444);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ssr-shimmer 2s linear infinite;
}
@keyframes ssr-shimmer {
  to { background-position: 200% center; }
}

/* Animation states */
.state-idle { animation: breathe 3s ease-in-out infinite; }
.state-thinking { animation: sway 0.8s ease-in-out infinite; }
.state-typing { animation: jitter 0.15s linear infinite; }
.state-error { animation: flash-red 0.5s ease-in-out infinite; }
.state-happy { animation: bounce 0.5s ease infinite; }
.state-sleeping { opacity: 0.4; }

@keyframes breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes sway { 0%,100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@keyframes jitter { 0% { transform: translate(0,0); } 25% { transform: translate(1px,-1px); } 50% { transform: translate(-1px,1px); } 75% { transform: translate(1px,0); } }
@keyframes flash-red { 0%,100% { color: inherit; } 50% { color: #ef4444; } }
@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

/* Bubble */
#bubble {
  background: rgba(0,0,0,0.75);
  color: #e5e5e5;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 8px;
  max-width: 180px;
  margin-bottom: 4px;
  word-break: break-all;
  animation: fade-in 0.2s ease;
}
#bubble.hidden { display: none; }
@keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* Status icon */
#status-icon {
  font-size: 12px;
  margin-top: 2px;
  min-height: 16px;
}

/* Info card */
#info-card {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  color: #e5e5e5;
  padding: 16px;
  font-size: 12px;
  overflow-y: auto;
  z-index: 100;
}
#info-card.hidden { display: none; }
#info-card h2 { font-size: 18px; margin-bottom: 8px; }
#info-card .stat { margin: 4px 0; color: #aaa; }
#info-card .stat span { color: #fff; }
```

- [ ] **Step 3: Initialize Tauri project**

```bash
cd /Users/vito/Dev/anything-digital-pet
npx @tauri-apps/cli@latest init \
  --app-name "anything-digital-pet" \
  --window-title "Pet" \
  --frontend-dist "../ui" \
  --before-dev-command "" \
  --before-build-command ""
```

- [ ] **Step 4: Update tauri.conf.json for transparent window**

Edit `src-tauri/tauri.conf.json` and set the window config:

```json
{
  "app": {
    "windows": [
      {
        "title": "Pet",
        "width": 200,
        "height": 200,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "x": 1200,
        "y": 700
      }
    ]
  }
}
```

- [ ] **Step 5: Test Tauri builds**

```bash
cd /Users/vito/Dev/anything-digital-pet
cargo tauri dev
```
Expected: A small transparent window appears with empty content.

- [ ] **Step 6: Commit**

```bash
git add ui/ src-tauri/
git commit -m "feat: scaffold Tauri 2 app with transparent window and UI skeleton"
```

---

### Task 7: Rust HTTP server for hook events

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/server.rs`

- [ ] **Step 1: Add dependencies to Cargo.toml**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:
```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tiny_http = "0.12"
```

- [ ] **Step 2: Create server.rs**

```rust
// src-tauri/src/server.rs
use serde::{Deserialize, Serialize};
use std::sync::mpsc;
use std::thread;
use tiny_http::{Server, Response, Header};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub state: String,
    pub data: Option<EventData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventData {
    pub summary: Option<String>,
}

pub fn start_server(sender: mpsc::Sender<PetEvent>) {
    thread::spawn(move || {
        let server = Server::http("127.0.0.1:23334").expect("Failed to start HTTP server on 23334");
        for mut request in server.incoming_requests() {
            if request.method().as_str() == "POST" && request.url() == "/event" {
                let mut body = String::new();
                if request.as_reader().read_to_string(&mut body).is_ok() {
                    if let Ok(event) = serde_json::from_str::<PetEvent>(&body) {
                        let _ = sender.send(event);
                    }
                }
                let response = Response::from_string("{\"ok\":true}")
                    .with_header(Header::from_bytes("Content-Type", "application/json").unwrap());
                let _ = request.respond(response);
            } else {
                let _ = request.respond(Response::from_string("not found").with_status_code(404));
            }
        }
    });
}
```

- [ ] **Step 3: Wire server into lib.rs**

```rust
// src-tauri/src/lib.rs
mod server;

use std::sync::mpsc;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (tx, rx) = mpsc::channel();
    server::start_server(tx);

    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(event) = rx.recv() {
                    let _ = handle.emit("pet-event", &event);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Test server with curl**

Start the app, then in another terminal:
```bash
curl -X POST http://127.0.0.1:23334/event \
  -H "Content-Type: application/json" \
  -d '{"type":"state_change","state":"thinking","data":{"summary":"Analyzing code..."}}'
```
Expected: `{"ok":true}` response

- [ ] **Step 5: Commit**

```bash
git add src-tauri/
git commit -m "feat: add Rust HTTP server for agent hook events on port 23334"
```

---

### Task 8: WebView frontend — ASCII renderer + state machine

**Files:**
- Create: `ui/main.js`
- Create: `ui/renderer.js`

- [ ] **Step 1: Create renderer.js**

```javascript
// ui/renderer.js
const RARITY_CLASSES = { N: "rarity-N", R: "rarity-R", SR: "rarity-SR", SSR: "rarity-SSR" };
const STATE_CLASSES = {
  idle: "state-idle", thinking: "state-thinking", typing: "state-typing",
  error: "state-error", happy: "state-happy", sleeping: "state-sleeping",
};
const STATUS_ICONS = {
  idle: "", thinking: "...", typing: "⌨️", error: "❗", happy: "✨", sleeping: "zzZ",
};

let currentState = "idle";
let sleepTimer = null;
const SLEEP_TIMEOUT = 60000;

export function initRenderer(petData) {
  const artEl = document.getElementById("ascii-art");
  const iconEl = document.getElementById("status-icon");
  artEl.textContent = petData.soul.asciiArt.join("\n");
  artEl.className = `${RARITY_CLASSES[petData.bones.rarity] || "rarity-N"} state-idle`;
  iconEl.textContent = "";
  resetSleepTimer();
}

export function setState(state) {
  if (currentState === "sleeping" && state !== "sleeping") {
    playWakeAnimation(() => applyState(state));
  } else {
    applyState(state);
  }
  if (state !== "sleeping") resetSleepTimer();
}

function applyState(state) {
  currentState = state;
  const artEl = document.getElementById("ascii-art");
  const iconEl = document.getElementById("status-icon");
  const rarityClass = artEl.className.split(" ").find(c => c.startsWith("rarity-")) || "rarity-N";
  artEl.className = `${rarityClass} ${STATE_CLASSES[state] || "state-idle"}`;
  iconEl.textContent = STATUS_ICONS[state] || "";
}

function playWakeAnimation(callback) {
  const artEl = document.getElementById("ascii-art");
  artEl.style.animation = "jitter 0.1s linear 3";
  setTimeout(() => {
    artEl.style.animation = "";
    callback();
  }, 300);
}

function resetSleepTimer() {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => setState("sleeping"), SLEEP_TIMEOUT);
}
```

- [ ] **Step 2: Create main.js**

```javascript
// ui/main.js
import { initRenderer, setState } from "./renderer.js";
import { initDrag } from "./drag.js";
import { showBubble } from "./bubble.js";
import { initInfoCard } from "./info-card.js";

let petData = null;

async function init() {
  // Load pet data from .pet/ directory via Tauri command
  if (window.__TAURI__) {
    const { invoke } = window.__TAURI__.core;
    petData = await invoke("load_pet");
  } else {
    // Fallback: load from URL param (debug mode)
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("data");
    if (raw) {
      const std = raw.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(std);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      petData = JSON.parse(new TextDecoder().decode(bytes));
    }
  }

  if (!petData) {
    document.getElementById("ascii-art").textContent = "No pet found.\nRun /create-pet:cli";
    return;
  }

  initRenderer(petData);
  initDrag();
  initInfoCard(petData);

  // Listen for events from Tauri backend
  if (window.__TAURI__) {
    const { listen } = window.__TAURI__.event;
    listen("pet-event", (event) => {
      const { state, data } = event.payload;
      setState(state);
      if (data?.summary) showBubble(data.summary);
    });
  }
}

// Mouse enter wakes from sleep
document.addEventListener("mouseenter", () => {
  if (document.getElementById("ascii-art").classList.contains("state-sleeping")) {
    setState("idle");
  }
});

init();
```

- [ ] **Step 3: Commit**

```bash
git add ui/main.js ui/renderer.js
git commit -m "feat: add WebView ASCII renderer with state machine and animations"
```

---

### Task 9: Drag, bubble, and info card

**Files:**
- Create: `ui/drag.js`
- Create: `ui/bubble.js`
- Create: `ui/info-card.js`

- [ ] **Step 1: Create drag.js**

```javascript
// ui/drag.js
export function initDrag() {
  const container = document.getElementById("pet-container");
  let dragging = false;
  let startX, startY;

  container.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.screenX;
    startY = e.screenY;
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener("pointermove", async (e) => {
    if (!dragging) return;
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    startX = e.screenX;
    startY = e.screenY;

    if (window.__TAURI__) {
      const { getCurrentWindow } = window.__TAURI__.window;
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      await win.setPosition({ type: "Physical", x: pos.x + dx, y: pos.y + dy });
    }
  });

  container.addEventListener("pointerup", (e) => {
    dragging = false;
    container.releasePointerCapture(e.pointerId);
  });
}
```

- [ ] **Step 2: Create bubble.js**

```javascript
// ui/bubble.js
let bubbleTimer = null;

export function showBubble(text) {
  const el = document.getElementById("bubble");
  el.textContent = text.slice(0, 50);
  el.classList.remove("hidden");

  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}
```

- [ ] **Step 3: Create info-card.js**

```javascript
// ui/info-card.js
export function initInfoCard(petData) {
  const container = document.getElementById("pet-container");
  const card = document.getElementById("info-card");

  container.addEventListener("click", (e) => {
    if (e.detail === 1) {
      // Single click — show info card
      setTimeout(() => {
        if (!card.classList.contains("hidden")) return;
        card.innerHTML = buildCardHtml(petData);
        card.classList.remove("hidden");
      }, 200);
    }
  });

  card.addEventListener("click", () => {
    card.classList.add("hidden");
  });
}

function buildCardHtml(pet) {
  const b = pet.bones;
  const s = pet.soul;
  const ed = b.bazi.elementDistribution;
  return `
    <h2>${s.emoji} ${s.name} <small style="color:#888">${s.nameEn}</small></h2>
    <p style="color:#aaa">${s.species} (${s.speciesEn}) · <strong>${b.rarity}</strong></p>
    <hr style="border-color:#333;margin:8px 0">
    <div class="stat">五行: <span>木${ed.wood} 火${ed.fire} 土${ed.earth} 金${ed.metal} 水${ed.water} (${b.dominantElement})</span></div>
    <div class="stat">MBTI: <span>${b.mbti}</span> ${b.mbtiDescription}</div>
    <div class="stat">命牌: <span>${b.tarot.name}${b.tarot.upright ? " 正位" : " 逆位"}</span> — ${b.tarot.trait}</div>
    <div class="stat">八字: <span style="font-family:monospace">${b.bazi.fullString}</span></div>
    <hr style="border-color:#333;margin:8px 0">
    <p style="color:#ccc;line-height:1.5">${s.description}</p>
    <p style="color:#555;margin-top:12px;font-size:10px">点击任意处关闭</p>
  `;
}
```

- [ ] **Step 4: Commit**

```bash
git add ui/drag.js ui/bubble.js ui/info-card.js
git commit -m "feat: add drag, conversation bubble, and info card overlays"
```

---

### Task 10: Tauri command to load pet data

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add load_pet command**

Add to `src-tauri/src/lib.rs`:

```rust
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn load_pet() -> Result<serde_json::Value, String> {
    // Look for .pet/*.json in current working directory
    let pet_dir = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join(".pet");

    if !pet_dir.exists() {
        // Try home directory fallback
        let home_pet = dirs::home_dir()
            .ok_or("No home directory")?
            .join(".pet");
        return load_first_pet(&home_pet);
    }

    load_first_pet(&pet_dir)
}

fn load_first_pet(dir: &PathBuf) -> Result<serde_json::Value, String> {
    if !dir.exists() {
        return Err("No .pet directory found".into());
    }

    let entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
        .collect();

    let entry = entries.first().ok_or("No pet files found in .pet/")?;
    let content = fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}
```

Add `dirs` to `Cargo.toml`:
```toml
dirs = "5"
```

Wire the command in the builder:
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![load_pet])
    // ...existing setup code...
```

- [ ] **Step 2: Test with a real pet file**

Create a test `.pet/` file, run `cargo tauri dev`, verify the ASCII art renders.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/
git commit -m "feat: add Tauri load_pet command to read .pet/*.json"
```

---

### Task 11: System tray

**Files:**
- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create tray.rs**

```rust
// src-tauri/src/tray.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show Pet", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Anything Digital Pet")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
```

- [ ] **Step 2: Wire tray into lib.rs**

Add `mod tray;` and call `tray::setup_tray(app)?;` inside the `.setup()` closure.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/
git commit -m "feat: add system tray with show/quit menu"
```

---

### Task 12: Claude Code hook script

**Files:**
- Create: `hooks/pet-hook.js`

- [ ] **Step 1: Write hook script**

```javascript
#!/usr/bin/env node
// hooks/pet-hook.js
// Claude Code hook → HTTP POST to desktop pet on port 23334
// Reads hook payload from stdin, maps to pet state, sends event.

const http = require("http");

const HOOK_TYPE = process.env.CLAUDE_HOOK_TYPE; // PreToolUse, PostToolUse, Stop

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    return; // Not JSON, ignore
  }

  let state = "idle";
  let summary = "";

  if (HOOK_TYPE === "PreToolUse") {
    state = "thinking";
    summary = `Using ${payload.tool_name || "tool"}...`;
  } else if (HOOK_TYPE === "PostToolUse") {
    if (payload.tool_error) {
      state = "error";
      summary = `Error: ${String(payload.tool_error).slice(0, 40)}`;
    } else {
      state = "happy";
      summary = `Done: ${payload.tool_name || "tool"}`;
    }
  } else if (HOOK_TYPE === "Stop") {
    state = "idle";
    summary = "Session ended";
  }

  const body = JSON.stringify({
    type: "state_change",
    state,
    data: { summary },
  });

  const req = http.request({
    hostname: "127.0.0.1",
    port: 23334,
    path: "/event",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    timeout: 1000,
  });

  req.on("error", () => {}); // Silently ignore if pet app isn't running
  req.write(body);
  req.end();
}

main();
```

- [ ] **Step 2: Make executable**

```bash
chmod +x hooks/pet-hook.js
```

- [ ] **Step 3: Test hook manually**

```bash
echo '{"tool_name":"Read"}' | CLAUDE_HOOK_TYPE=PreToolUse node hooks/pet-hook.js
```
Expected: No output (silently posts to 23334 or silently fails if pet app not running)

- [ ] **Step 4: Commit**

```bash
git add hooks/
git commit -m "feat: add Claude Code hook script for pet state events"
```

---

### Task 13: Update skills and README

**Files:**
- Modify: `.claude/skills/create-pet-cli.md`
- Modify: `.claude/skills/pet.md`
- Delete: `.claude/skills/create-pet-link.md` (merge into create-pet-cli)

- [ ] **Step 1: Update create-pet-cli.md for v2**

Update the skill to reference the engine orchestrator and v2 schema. Key changes:
- MBTI answers are optional (LLM auto-determines)
- Rarity output shows N/R/SR/SSR
- Announcement includes ASCII art preview

- [ ] **Step 2: Update pet.md**

Update to reference v2 schema fields (`asciiArt`, dynamic species).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/
git commit -m "docs: update skills for v2 schema and N/R/SR/SSR rarity"
```

---

### Task 14: End-to-end test

- [ ] **Step 1: Generate a pet via engine**

```bash
cd /Users/vito/Dev/anything-digital-pet
# Use the existing Next.js API or a quick script to call createPet
```

- [ ] **Step 2: Run Tauri app**

```bash
cargo tauri dev
```
Expected: ASCII art pet appears on desktop.

- [ ] **Step 3: Send hook events**

```bash
curl -X POST http://127.0.0.1:23334/event \
  -H "Content-Type: application/json" \
  -d '{"type":"state_change","state":"thinking","data":{"summary":"Analyzing code..."}}'

sleep 2

curl -X POST http://127.0.0.1:23334/event \
  -H "Content-Type: application/json" \
  -d '{"type":"state_change","state":"happy","data":{"summary":"Build passed!"}}'
```
Expected: Pet animates through thinking → happy states, bubble shows summary text.

- [ ] **Step 4: Test click → info card**

Click the pet → info card overlay appears with name, species, rarity, stats.
Click outside → card closes.

- [ ] **Step 5: Test drag**

Drag pet to a different position on screen.

- [ ] **Step 6: Test sleep/wake**

Wait 60s → pet should dim and show "zzZ".
Send any event → pet wakes up.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: verify end-to-end desktop pet integration"
git push
```
