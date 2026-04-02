#!/bin/bash
# Setup Claude Code hooks for the desktop pet.
# Run once: bash bin/setup-hooks.sh

HOOK_PATH="$(cd "$(dirname "$0")" && pwd)/pet-hook.js"
SETTINGS_FILE="$HOME/.claude/settings.json"

# Ensure hook script path uses the actual location
if [ ! -f "$(dirname "$0")/../hooks/pet-hook.js" ]; then
  echo "❌ hooks/pet-hook.js not found"
  exit 1
fi
HOOK_PATH="$(cd "$(dirname "$0")/.." && pwd)/hooks/pet-hook.js"

echo "🐾 Setting up Claude Code hooks..."
echo "   Hook script: $HOOK_PATH"
echo "   Settings: $SETTINGS_FILE"

# Create settings dir if needed
mkdir -p "$(dirname "$SETTINGS_FILE")"

# Check if settings.json exists
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# Use python to merge hooks into settings.json (handles existing hooks gracefully)
python3 -c "
import json, sys

settings_path = '$SETTINGS_FILE'
hook_cmd = 'node $HOOK_PATH'

with open(settings_path) as f:
    settings = json.load(f)

hooks = settings.setdefault('hooks', {})

for event in ['PreToolUse', 'PostToolUse', 'Stop']:
    event_hooks = hooks.setdefault(event, [])
    # Check if already configured
    already = any(h.get('command', '') == hook_cmd for h in event_hooks)
    if not already:
        event_hooks.append({'command': hook_cmd})

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)

print('✅ Hooks configured for PreToolUse, PostToolUse, Stop')
"

echo ""
echo "Done! Your desktop pet will now react to Claude Code."
echo "Start the pet: cd $(cd "$(dirname "$0")/.." && pwd) && pnpm desktop"
