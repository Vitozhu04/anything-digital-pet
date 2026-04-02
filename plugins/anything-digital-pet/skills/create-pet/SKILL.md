---
description: Generate a digital pet for the current project using BaZi + Tarot + MBTI divination
---

# Create Pet

Generate a unique digital pet for the current project. The pet's destiny is determined by divination (BaZi birth chart + Tarot draw), and YOU (Claude) create the species, name, and personality. No external API key needed.

## Steps

### 1. Gather project context
- Read README.md (first 500 chars) if it exists
- Read CLAUDE.md if it exists
- Run `git log --oneline -5`
- Summarize the project in 2-3 sentences → this is your `projectContext`

### 2. Determine MBTI
Based on the project's character, answer these 4 questions yourself:
- E/I: Is this project outward-facing (E) or internally focused (I)?
- S/N: Concrete details (S) or abstract systems (N)?
- T/F: Logic-driven (T) or people/values-driven (F)?
- J/P: Structured/planned (J) or flexible/exploratory (P)?

### 3. Run the divination engine
This calculates the BaZi (Chinese birth chart from current timestamp) and draws a Tarot card:

```bash
npx tsx "${CLAUDE_PLUGIN_ROOT}/bin/create-pet.ts" "<projectContext>" --mbti <MBTI>
```

This outputs a JSON `bones` object with: bazi, dominantElement, mbti, tarot (card + upright/reversed), and rarity (N/R/SR/SSR).

### 4. Generate the pet soul (YOU do this — no external API needed)

Based on the `bones` data, create:

**Species** — Choose from this pool or invent your own:
> 水豚、耳廓狐、六角恐龙、独角鲸、水熊虫、蘑菇精灵、珊瑚精、星尘猫、雷云兔、琥珀蜥、冰晶鹿、苔藓龟、极光鱼、熔岩蛙、云端水母、深海鹦鹉螺、月光蛾、虹光蜂鸟、星辰刺猬、银河鲸、幻梦蝴蝶、紫晶蜻蜓、朱砂锦鲤、焰尾狐仙、寒铁熊灵...

Guidelines:
- Five element (dominantElement) influences species tendency: wood→植物/森林, fire→火焰/光明, earth→大地/矿石, metal→金属/冰冷, water→深海/冰雪
- Rarity affects how exotic: N=常见动物, R=独特动物, SR=奇幻混合, SSR=神话级

**Name** — 2-3 Chinese characters, evocative and fitting

**ASCII Art** — Exactly 5 lines, each ≤20 characters, using only: `/ \ | _ - . ~ ^ o O * ( ) [ ] { } < > @ # + = x X`

**Description** — 2-3 sentences reflecting MBTI type and tarot destiny

**System Prompt** — 100-150 characters, for the pet to use in conversations

### 5. Save the pet

Create `.pet/` directory and save as `.pet/<name>.json`:

```json
{
  "version": "2.0",
  "meta": {
    "createdAt": "<ISO timestamp>",
    "source": "cli",
    "projectContext": "<context>"
  },
  "bones": { <paste the bones JSON from step 3> },
  "soul": {
    "species": "<species name>",
    "speciesEn": "<English species>",
    "emoji": "<emoji>",
    "name": "<Chinese name>",
    "nameEn": "<English name>",
    "asciiArt": ["<line1>", "<line2>", "<line3>", "<line4>", "<line5>"],
    "description": "<personality description>",
    "systemPrompt": "<system prompt>"
  }
}
```

### 6. Announce and launch desktop pet

Display:
```
<ASCII art>

<emoji> <name> (<nameEn>) — <rarity> <species>
<mbti> · <tarot.name> <正位|逆位> · <tarot.trait>

<description>

💾 Saved to .pet/<name>.json
```

Then auto-launch the desktop pet in the background:
```bash
# Try common locations for the binary
for bin in "$HOME/bin/digital-pet" "$(which digital-pet 2>/dev/null)" "$(which anything-digital-pet 2>/dev/null)"; do
  [ -x "$bin" ] && "$bin" &>/dev/null & break
done
```
If the binary isn't found, tell the user: "To see your pet on the desktop, build and install the Tauri app from the repo."
