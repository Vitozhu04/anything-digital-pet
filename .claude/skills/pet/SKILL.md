---
name: pet
description: Summon your digital pet for conversation and interact with it in character. Use when the user wants to talk to their pet, check on their pet, or run /pet. Triggers on phrases like "talk to my pet", "where's my pet", "summon pet", "pet mode", "chat with pet".
---

# Pet

Summon your digital pet for conversation.

## Steps

1. **Find the pet**
   - List `.pet/*.json` files in the current project
   - If `[name]` argument provided, find matching file (fuzzy match on filename)
   - If no argument and only one pet: use it
   - If no pets found: tell user to run `/create-pet` first

2. **Load pet data**
   - Read the `.pet/<name>.json` file
   - Extract `soul.systemPrompt`, `soul.name`, `soul.emoji`, `soul.species`, `soul.asciiArt`, `bones.rarity`, `bones.mbti`, `bones.tarot`

3. **Announce**
   - Show the ASCII art (`soul.asciiArt`, 5 lines)
   - Print: `{emoji} {name} ({nameEn}) — {rarity} {species} · {mbti} · {tarot.name} {"正位"|"逆位"}`

4. **Enter pet mode**
   - Adopt the pet's `systemPrompt` as your persona
   - Respond in character as the pet
   - Stay in character until user says "bye", "exit", or "/exit"
