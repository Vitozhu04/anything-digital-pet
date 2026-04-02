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
   - Parse the response JSON to get `data.soul.name`
   - Save the `data` object as `.pet/<soul.name>.json`

6. **Open pet card in browser**
   - Base64-encode the pet JSON
   - Open: `open "http://localhost:3002/pet/<name>?data=<base64>"`

7. **Announce the pet**
   - Print: `{emoji} {name} ({nameEn}) has been born! {rarity} {species} · {mbti} · {tarot.name} {"正位" if upright else "逆位"}`
