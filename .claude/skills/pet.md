# Skill: /pet [name]

Summon your digital pet for conversation.

## Steps

1. **Find the pet**
   - List `.pet/*.json` files in the current project
   - If `[name]` argument provided, find matching file (fuzzy match on filename)
   - If no argument and only one pet: use it
   - If multiple pets and no argument: list them and ask user to choose

2. **Load pet data**
   - Read the `.pet/<name>.json` file
   - Extract `soul.systemPrompt`, `soul.name`, `soul.emoji`, `soul.species`, `bones.rarity`, `bones.mbti`, `bones.tarot`

3. **Announce**
   - Print: `{emoji} {name} ({nameEn}) — {rarity} {species} · {mbti} · {tarot.name} {"正位" if upright else "逆位"}`

4. **Enter pet mode**
   - Adopt the pet's `systemPrompt` as your persona
   - Respond in character as the pet
   - Stay in character until user says "bye", "exit", or "/exit"

5. **Show card** (if user asks)
   - If user says "show card", "看卡片", or "card":
     - Base64-encode the pet JSON
     - Open: `open "http://localhost:3002/pet/<name>?data=<base64>"`
