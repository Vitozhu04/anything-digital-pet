# Anything Digital Pet v2 — Desktop Pet Design Spec

## 概述

桌面数字宠物系统。任何 AI Agent 运行时，桌面悬浮一个 ASCII art 宠物，实时反映 agent 状态。宠物的物种、性格、命运由八字+塔罗+MBTI 占卜生成。

**两个独立模块**：
1. **Pet 生成引擎** — 占卜 + LLM → `.pet/[name].json`
2. **Desktop Pet App** — Tauri 2 透明窗口 + hooks 状态驱动

## 模块 1: Pet 生成引擎

### 输入

任意 agent 上下文，以下任一方式触发：
- Claude Code skill (`/create-pet:cli`, `/create-pet:link <url>`)
- 直接 CLI 命令 (`npx anything-digital-pet create`)
- HTTP API (`POST localhost:3002/api/pet/create`)
- 任何能 POST JSON 的工具

请求体：
```json
{
  "source": "cli" | "link",
  "sourceUrl": "https://...",        // optional
  "projectContext": "2-3 句项目描述",
  "mbtiAnswers": {                   // optional, LLM 可自动判断
    "ei": "E" | "I",
    "sn": "S" | "N",
    "tf": "T" | "F",
    "jp": "J" | "P"
  }
}
```

如果 `mbtiAnswers` 未提供，由 LLM 根据 `projectContext` 自动判断 4 个维度。

### 占卜流程

```
当前时间戳
  → lunar-javascript → 八字四柱 → 五行分布 → 主元素
  → Hash(context + timestamp) → 塔罗抽牌 (0-21) → 稀有度
  → MBTI (LLM 自动回答或用户提供) → 16型之一
  → 所有数据 → LLM generateObject → 物种 + 名字 + ASCII art + 人格
```

### 稀有度系统 (N/R/SR/SSR)

基于塔罗牌号的确定性映射：

| 等级 | 牌号范围 | 概率 | 颜色 | 对应塔罗牌 |
|------|---------|------|------|-----------|
| N (Normal) | 0-7 | 36% | 蓝色 `#3b82f6` | 愚者~战车 |
| R (Rare) | 8-14 | 32% | 紫色 `#a855f7` | 力量~节制 |
| SR (Super Rare) | 15-19 | 23% | 金色 `#eab308` | 恶魔~太阳 |
| SSR (Super Super Rare) | 20-21 | 9% | 红金渐变 `#ef4444→#eab308` | 审判, 世界 |

### 物种生成

**不固定映射**。LLM 从候选池选择或自由创造：

候选池 (~50 种，以下为示例)：
> 水豚、耳廓狐、六角恐龙、独角鲸、水熊虫、蘑菇精灵、珊瑚精、
> 星尘猫、雷云兔、琥珀蜥、冰晶鹿、苔藓龟、极光鱼、熔岩蛙、
> 竹节虫精、云端水母、铁杉狸、深海鹦鹉螺、月光蛾、沙漠玫瑰蛇...

LLM prompt 约束：
- 五行主元素影响选择倾向（木→植物系/生长系，火→热情系，水→深海/冰系...）但不强制
- 稀有度越高，物种越奇异/神话化
- N: 常见动物偏多 / R: 独特动物 / SR: 奇幻混合 / SSR: 神话级

### LLM 输出 Schema

```typescript
{
  species: string       // "星尘水豚"
  speciesEn: string     // "Stardust Capybara"
  emoji: string         // "🌟"
  name: string          // "澜泽"
  nameEn: string        // "Lanze"
  asciiArt: string[]    // 5 行 ASCII art, 每行 ≤20 字符
  description: string   // 2-3 句人格描述
  systemPrompt: string  // 100-150 字对话系统提示词
}
```

### Pet 数据格式 (.pet/[name].json)

```json
{
  "version": "2.0",
  "meta": {
    "createdAt": "2026-04-02T14:23:00Z",
    "source": "cli",
    "sourceUrl": null,
    "projectContext": "..."
  },
  "bones": {
    "bazi": {
      "year": { "celestial": "丙", "terrestrial": "午" },
      "month": { "celestial": "辛", "terrestrial": "卯" },
      "day": { "celestial": "丙", "terrestrial": "午" },
      "hour": { "celestial": "癸", "terrestrial": "巳" },
      "fullString": "丙午 辛卯 丙午 癸巳",
      "elementDistribution": { "wood": 1, "fire": 5, "earth": 0, "metal": 1, "water": 1 }
    },
    "dominantElement": "fire",
    "mbti": "ENTJ",
    "mbtiDescription": "指挥官，天生领导者",
    "tarot": {
      "id": 21,
      "name": "世界",
      "upright": true,
      "trait": "圆满完成者",
      "meaning": "圆满完成、整合、宇宙合一"
    },
    "rarity": "SSR"
  },
  "soul": {
    "species": "炎凰狐",
    "speciesEn": "Phoenix Fennec",
    "emoji": "🦊",
    "name": "炎煌",
    "nameEn": "Ignis",
    "asciiArt": [
      "   /\\  *  /\\   ",
      "  / .\\~/\\. \\  ",
      "  \\  ^w^  /   ",
      "   \\~/ \\~/    ",
      "    \\) (/     "
    ],
    "description": "...",
    "systemPrompt": "..."
  }
}
```

## 模块 2: Desktop Pet (Tauri 2)

### 窗口配置

- 透明背景 (`transparent: true`)
- 无边框 (`decorations: false`)
- 永远置顶 (`always_on_top: true`)
- 不显示在任务栏 (`skip_taskbar: true`)
- 透明区域点击穿透
- 默认尺寸：200×160 px
- 默认位置：屏幕右下角

### ASCII Art 渲染

WebView 中用 `<pre>` + monospace 字体渲染 `.pet/[name].json` 中的 `asciiArt`。

颜色由稀有度决定：
- N: 蓝色
- R: 紫色
- SR: 金色
- SSR: 红金渐变动画

每种动画状态对应 ASCII art 的微小变化（由前端 JS 实现，不依赖 LLM）：
- **idle**: 原始 art + 缓慢呼吸效果（轻微上下位移）
- **thinking**: 头顶出现 `...` 气泡，左右摇摆
- **typing**: 快速抖动，头顶出现 `⌨️`
- **error**: 变红闪烁，出现 `!` 
- **happy**: 弹跳 + 出现 `✨`
- **sleeping**: art 变暗 + 出现 `zzZ`

### HTTP Server (状态接收)

Tauri Rust 后端启动 HTTP server on `127.0.0.1:23334`：

```
POST /event
Content-Type: application/json

{
  "type": "state_change",
  "state": "thinking" | "typing" | "idle" | "error" | "happy",
  "data": {
    "summary": "正在分析代码..."   // optional, 显示在气泡中
  }
}
```

60 秒无事件 → 自动切换到 `sleeping` 状态。
收到任何事件 → 先播放 `wake` 动画 → 再切换到目标状态。

### Agent Hook 脚本

通用 hook 脚本 `hooks/pet-hook.js`，从 stdin 读取 hook payload，POST 到 23334：

```javascript
// hooks/pet-hook.js
// 适配 Claude Code hooks 格式
// PreToolUse → thinking
// PostToolUse (成功) → happy  
// PostToolUse (失败) → error
// Stop → idle
```

Claude Code `settings.json` 配置：
```json
{
  "hooks": {
    "PreToolUse": [{ "command": "node /path/to/pet-hook.js" }],
    "PostToolUse": [{ "command": "node /path/to/pet-hook.js" }],
    "Stop": [{ "command": "node /path/to/pet-hook.js" }]
  }
}
```

其他 agent (Cursor, Gemini CLI) 可以写类似的 hook 适配器。

### 交互功能

**拖动**：按住 ASCII art 区域拖动窗口到任意位置。使用 Pointer Capture API 防止快速拖动丢失。

**点击信息卡**：单击 pet → 弹出浮层卡片：
- 名字 + 物种 + 稀有度徽章
- 五行分布
- MBTI 类型
- 塔罗命牌
- 八字
- 人格描述
- 点击卡片外区域关闭

**对话气泡**：agent 回复时，pet 头顶显示气泡，内容为 `event.data.summary` 的前 50 字。3 秒后自动消失。

**右键菜单**：
- 查看详细信息（打开信息卡）
- 退出

**System Tray**：
- 显示/隐藏 pet
- 退出应用

**睡眠/唤醒**：
- 60s 无事件 → 渐变变暗 + `zzZ` → sleeping
- 鼠标移入或收到事件 → 抖动唤醒 → 切换到目标状态

## 项目结构

```
anything-digital-pet/
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口, 窗口配置
│   │   ├── server.rs            # HTTP server (23334)
│   │   ├── pet_store.rs         # 读取 .pet/*.json
│   │   └── tray.rs              # System tray
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                          # WebView 前端 (HTML/CSS/JS)
│   ├── pet-renderer.ts          # ASCII art 渲染 + 动画状态机
│   ├── bubble.ts                # 对话气泡
│   ├── info-card.ts             # 信息卡片浮层
│   ├── drag.ts                  # 拖动逻辑
│   └── index.html               # 入口页
├── engine/                       # Pet 生成引擎 (复用 MVP)
│   ├── bazi.ts
│   ├── tarot.ts
│   ├── mbti.ts
│   ├── hash.ts
│   ├── persona.ts               # 更新 schema for v2
│   └── types.ts                 # v2 Pet schema
├── hooks/
│   └── pet-hook.js              # 通用 agent hook 脚本
├── .claude/skills/               # Claude Code skills
│   ├── create-pet-cli.md
│   ├── create-pet-link.md
│   └── pet.md
└── CLAUDE.md
```

## 不包含 (后续版本)

- 多 pet 切换
- 权限弹窗（in-pet allow/deny）
- Pet 进化/升级系统
- 声音效果
- 自定义主题/皮肤
- 跨设备同步
