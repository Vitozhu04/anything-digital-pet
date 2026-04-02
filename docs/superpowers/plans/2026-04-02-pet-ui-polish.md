# Pet UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the desktop pet with tarot readings, visible name label, and minimal room shelf.

**Architecture:** All changes are frontend-only (CSS + JS in `ui/`). No Tauri backend changes needed.

**Tech Stack:** Vanilla JS, CSS, HTML

---

### Task 1: Tarot card reading interpretation

**Files:**
- Modify: `ui/tarot.js` — add `reading` field to each card (upright + reversed), append to ASCII card output

Each of the 22 ARCANA entries gets a short fortune-cookie `upReading` and `revReading` string (~40 chars max). The `drawTarotCard()` function appends the reading as an extra line inside the card frame.

- [ ] **Step 1: Add readings to ARCANA data**

Add `upReading` and `revReading` fields to each card in the ARCANA array. Examples:
```js
{ id: 0, name: "The Fool", emoji: "🃏",
  up: "New beginnings", rev: "Recklessness",
  upReading: "Leap — the net appears.",
  revReading: "Look before you leap." },
```

- [ ] **Step 2: Show reading in ASCII card**

In `drawTarotCard()`, after the meaning line and before `bot`, add the reading:
```js
const reading = upright ? card.upReading : card.revReading;
// ... existing lines ...
lines.push("|" + center(meaning, W) + "|");
lines.push("|" + center("", W) + "|");           // blank spacer
lines.push("|" + center(reading, W) + "|");       // reading
lines.push(bot);
```

- [ ] **Step 3: Verify visually**

Double-click the pet. The ASCII card should now show the reading as the last line inside the card frame.

---

### Task 2: Pet name label uses rarity color

**Files:**
- Modify: `ui/renderer.js` — set rarity class on `#pet-name`
- Modify: `ui/style.css` — add `#pet-name` rarity color rules

- [ ] **Step 1: Set rarity class on name element**

In `renderer.js` `initRenderer()`, after setting `artEl.className`, also set the name element's class:
```js
const nameEl = document.getElementById("pet-name");
nameEl.className = RARITY_CLASSES[petData.bones.rarity] || "rarity-N";
```

- [ ] **Step 2: Update CSS for #pet-name rarity colors**

Replace the fixed `#pet-name` color with opacity-reduced versions that inherit from rarity classes:
```css
#pet-name {
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  opacity: 0.6;
}
```

Remove `color: rgba(255, 255, 255, 0.4)` — the rarity class (`.rarity-N`, etc.) already sets the color. The `opacity: 0.6` dims it relative to the ASCII art.

---

### Task 3: Minimal ASCII room shelf

**Files:**
- Modify: `ui/index.html` — change `#shelf` from `<div>` to `<pre>` with ASCII content
- Modify: `ui/style.css` — update `#shelf` styling for ASCII text
- Modify: `ui/renderer.js` — set shelf content based on dominant element

- [ ] **Step 1: Change shelf to `<pre>` in HTML**

```html
<pre id="shelf"></pre>
```

- [ ] **Step 2: Update shelf CSS**

Replace the gradient-line `#shelf` rule with text-based styling:
```css
#shelf {
  font-size: 9px;
  line-height: 1;
  margin: 4px 0 3px;
  opacity: 0.3;
}
```

The shelf inherits the rarity color from a class set by the renderer.

- [ ] **Step 3: Set shelf content in renderer**

In `initRenderer()`, set the shelf ASCII based on the pet's dominant element:
```js
const SHELF_ART = {
  fire:  "~* _______ *~",
  water: "~~ _______ ~~",
  wood:  ".* _______ *.",
  metal: ":: _______ ::",
  earth: ".. _______ ..",
};
const shelfEl = document.getElementById("shelf");
shelfEl.textContent = SHELF_ART[petData.bones.dominantElement] || SHELF_ART.fire;
shelfEl.className = RARITY_CLASSES[petData.bones.rarity] || "rarity-N";
```

- [ ] **Step 4: Verify visually**

Restart the app. The shelf should show a small decorated line matching the pet's element, in the rarity color at reduced opacity.
