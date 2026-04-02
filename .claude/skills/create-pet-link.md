# Skill: /create-pet:link <url>

Generate a digital pet from a URL (GitHub repo, website, documentation).

## Steps

1. **Fetch URL content**
   - Use WebFetch to retrieve the page content or README
   - Extract: title, description, key features, purpose
   - Summarize in 2-3 sentences as `projectContext`

2. **Answer MBTI questions** — based on the content's character:
   - Q1 (E/I): Active/social tool (E) vs focused/internal tool (I)?
   - Q2 (S/N): Practical/concrete (S) vs abstract/theoretical (N)?
   - Q3 (T/F): Logic/performance focused (T) vs human/community focused (F)?
   - Q4 (J/P): Structured/opinionated (J) vs flexible/open-ended (P)?
   - Pick the single best answer. Do NOT ask the user.

3. **Ensure pet server is running**
   - Check: `curl -s http://localhost:3002 -o /dev/null -w "%{http_code}"`
   - If not 200: tell the user to run `pnpm dev` in the anything-digital-pet project first

4. **Create the pet via API**
   ```bash
   curl -s -X POST http://localhost:3002/api/pet/create \
     -H "Content-Type: application/json" \
     -d '{
       "source": "link",
       "sourceUrl": "<the_url>",
       "projectContext": "<your 2-3 sentence summary>",
       "mbti": {"ei": "<E_or_I>", "sn": "<S_or_N>", "tf": "<T_or_F>", "jp": "<J_or_P>"}
     }'
   ```

5. **Save pet to .pet/ directory**
   - Create `.pet/` directory if it doesn't exist
   - Parse the response to get `data.soul.name`
   - Save `data` as `.pet/<soul.name>.json`

6. **Open pet card in browser**
   - Base64-encode the pet JSON
   - Open: `open "http://localhost:3002/pet/<name>?data=<base64>"`

7. **Announce the pet**
   - Print: `{emoji} {name} ({nameEn}) has been born! {rarity} {species} · {mbti} · {tarot.name} {"正位" if upright else "逆位"}`
