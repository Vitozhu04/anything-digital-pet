---
description: Generate a digital pet for the current project using BaZi + Tarot + MBTI divination
---

# Create Pet

Generate a digital pet for the current project using BaZi + Tarot + MBTI divination.

The pet's species, name, personality, and ASCII art are dynamically created by LLM based on the project's "birth chart" (the exact moment of creation).

## Steps

1. **Read project context**
   - Read README.md (first 500 chars)
   - Read CLAUDE.md if it exists
   - Run `git log --oneline -5` to understand recent activity
   - Summarize the project in 2-3 sentences (this is the `projectContext`)

2. **Determine MBTI** — based on the project's character:
   - Q1 (E/I): Is this project active/outward-facing (E) or focused/internal (I)?
   - Q2 (S/N): Does it deal with concrete details (S) or abstract systems (N)?
   - Q3 (T/F): Is it logic-driven (T) or values/people-driven (F)?
   - Q4 (J/P): Is it structured/planned (J) or flexible/exploratory (P)?
   - Answer each yourself based on context. Do NOT ask the user.

3. **Generate the pet**
   Run the generation script from the plugin:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY="${GOOGLE_GENERATIVE_AI_API_KEY}" \
   tsx "${CLAUDE_PLUGIN_ROOT}/bin/create-pet.ts" "<projectContext>" \
     --mbti "<E_or_I><S_or_N><T_or_F><J_or_P>"
   ```
   If `tsx` is not available, run:
   ```bash
   npx tsx "${CLAUDE_PLUGIN_ROOT}/bin/create-pet.ts" "<projectContext>"
   ```

4. **Show the result**
   The script outputs the pet's ASCII art, name, species, rarity, and saves `.pet/<name>.json`.
   Display the output to the user.

5. **Notify about desktop pet**
   Tell the user: "Run `pnpm desktop` in the plugin directory to see your pet on the desktop!"
