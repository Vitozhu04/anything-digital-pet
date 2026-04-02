@AGENTS.md

# Anything Digital Pet

## Stack
- Next.js 15 App Router + Tailwind + TypeScript
- LLM: Vercel AI SDK + Anthropic Claude (claude-haiku-4-5-20251001)
- BaZi: lunar-javascript (adapted from mingzi project)
- Avatar: DiceBear HTTP API (URL-based, no npm needed)

## Architecture
- Bones (deterministic): hash(name+ts) → BaZi → species, tarot → rarity, DiceBear URL
- Soul (LLM, persisted): MBTI + bones → name + description + system prompt
- Storage: .pet/[name].json in the user's project directory

## Key Files
- `src/lib/hash.ts` — FNV-1a hash
- `src/lib/bazi.ts` — BaZi calculator (current timestamp → 四柱+五行)
- `src/lib/tarot.ts` — 22 major arcana + deterministic draw
- `src/lib/mbti.ts` — 4-question MBTI mapping
- `src/lib/avatar.ts` — DiceBear URL generator
- `src/lib/persona.ts` — LLM persona generation
- `src/app/api/pet/create/route.ts` — POST API for pet creation

## Dev
```bash
pnpm dev   # runs on port 3002
```
