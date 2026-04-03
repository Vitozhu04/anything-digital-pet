---
name: create-pet-cli
description: Generate a digital pet that represents the current project using BaZi + Tarot + MBTI divination. Use when the user wants to create a pet, summon a new companion, generate a digital pet, or run /create-pet. Triggers on phrases like "create a pet", "make me a pet", "generate pet", "new pet", "summon pet".
---

# Create Pet CLI

Generate a digital pet that represents the current project. The pet's species, personality, and ASCII art are dynamically created by LLM based on BaZi + Tarot + MBTI divination.

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
   - If not 200: tell the user to run `pnpm dev` in the anything-digital-pet project first

4. **Create the pet via API**
   ```bash
   curl -s -X POST http://localhost:3002/api/pet/create \
     -H "Content-Type: application/json" \
     -d '{
       "source": "cli",
       "projectContext": "<your 2-3 sentence project summary>",
       "mbti": {"ei": "<E_or_I>", "sn": "<S_or_N>", "tf": "<T_or_F>", "jp": "<J_or_P>"}
     }'
   ```

5. **Save pet to .pet/ directory**
   - Create `.pet/` directory if it doesn't exist
   - Parse response JSON -> `data.soul.name`
   - Save `data` as `.pet/<soul.name>.json` (v2.0 format with asciiArt)

6. **Announce the pet**
   - Show the ASCII art in terminal
   - Print: `{emoji} {name} ({nameEn}) — {rarity} {species} · {mbti} · {tarot.name} {"正位"|"逆位"}`
   - Rarity: N / R / SR / SSR

7. **Launch desktop pet** (if Tauri app is installed)
   - Run: `anything-digital-pet` or remind user to start the desktop app
   - The desktop pet will auto-load from `.pet/` directory
