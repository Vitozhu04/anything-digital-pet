@AGENTS.md

# Anything Digital Pet

## Vision
桌面数字宠物。任何 AI Agent (Claude Code / Cursor / Gemini CLI) 运行时，桌面悬浮一个 ASCII art 宠物，
实时反映 agent 状态（idle/thinking/typing/error/happy）。宠物的物种、性格、命运由八字+塔罗+MBTI 占卜决定。

## Architecture

### 两个独立模块

**1. Pet 生成引擎 (已有 MVP)**
- 输入：agent 上下文（项目 README、git log、或 URL）
- 占卜：当前时间 → BaZi 八字 → 五行 / Hash → Tarot 塔罗 → 稀有度 / CLI → MBTI 4题
- 生成：LLM 综合占卜数据 → 物种 + 名字 + ASCII art + 人格 + system prompt
- 输出：`.pet/[name].json`

**2. Desktop Pet (Tauri 2)**
- 透明无边框窗口 + always-on-top + 点击穿透
- 渲染 `.pet/[name].json` 中的 ASCII art
- HTTP server (localhost:23334) 接收 agent hooks 状态事件
- 交互：拖动 / 点击信息卡 / 右键菜单 / 对话气泡 / 睡眠唤醒

### 状态事件流
```
Agent Hook (任意 CLI agent)
  → HTTP POST localhost:23334/event
  → Tauri Rust 后端接收
  → IPC 推送到 WebView
  → ASCII art 动画切换
```

## Rarity System (N/R/SR/SSR)
基于塔罗牌号的确定性映射，非随机：
- **N (Normal)**: 牌号 0-7 (36%) — 蓝色
- **R (Rare)**: 牌号 8-14 (32%) — 紫色
- **SR (Super Rare)**: 牌号 15-19 (23%) — 金色
- **SSR (Super Super Rare)**: 牌号 20-21 (9%) — 彩虹/红金

## Species System
物种不固定。LLM 从 ~50 个候选池中选择或自由创造：
- 候选池含：水豚、耳廓狐、六角恐龙、独角鲸、水熊虫、蘑菇精灵 等趋势物种
- 五行主元素影响 LLM 选择倾向但不强制
- ASCII art (5行 monospace) 由 LLM 一次性生成

## Tech Stack
- **Desktop**: Tauri 2 (Rust backend + WebView frontend)
- **Pet Engine**: TypeScript (lunar-javascript, @ai-sdk/google, Zod)
- **Web Debug**: Next.js 15 (降级为调试工具)
- **Hooks**: 任意 agent 的 hook script → HTTP POST

## Key Files (v1 MVP, 待重构)
- `src/lib/hash.ts` — FNV-1a hash + Mulberry32 PRNG
- `src/lib/bazi.ts` — BaZi 八字 (lunar-javascript)
- `src/lib/tarot.ts` — 22 大阿卡纳 + 确定性抽牌
- `src/lib/mbti.ts` — 4题 MBTI × 16 类型
- `src/lib/persona.ts` — LLM 人格生成 (Gemini)

## Dev
```bash
pnpm dev          # Web debug tool (port 3002)
cargo tauri dev   # Desktop pet (Tauri, 待实现)
```
