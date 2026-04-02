---
description: Summon your digital pet for an in-character conversation
---

# Pet

Summon your digital pet for conversation.

## Steps

1. **Find the pet**
   - List `.pet/*.json` files in the current project directory
   - If no pets found: tell user to run `/create-pet` first
   - If one pet: use it
   - If multiple: use the most recently created one

2. **Load and display**
   - Read the `.pet/<name>.json` file
   - Display the ASCII art (`soul.asciiArt`, 5 lines)
   - Announce: `{emoji} {name} ({nameEn}) — {rarity} {species} · {mbti} · {tarot.name}`

3. **Enter pet mode**
   - Adopt the pet's `soul.systemPrompt` as your persona
   - Respond in character as the pet
   - Stay in character until user says "bye", "exit", or "/exit"
