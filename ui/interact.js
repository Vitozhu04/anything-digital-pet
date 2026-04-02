// ui/interact.js
// Pet reactions to user interaction.

import { showBubble } from "./bubble.js";
import { setState } from "./renderer.js";
import { drawTarotCard } from "./tarot.js";

const GREETINGS = [
  "Hey there!",
  "*yawns*",
  "What's up?",
  "...",
  "*stretches*",
  "Need a break?",
  "Keep going!",
  "You got this.",
  "*purrs*",
  "Boop!",
  "*waves*",
  "How's it going?",
  "Take a breather.",
  "*wiggles*",
];

let showingTarot = false;

export function initInteractions() {
  const container = document.getElementById("pet-container");

  // Single click — pet says something
  container.addEventListener("click", () => {
    if (showingTarot) return;
    const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setState("happy");
    showBubble(msg, 2000);
    setTimeout(() => setState("idle"), 1500);
  });

  // Double click — tarot draw
  container.addEventListener("dblclick", onTarotDraw);

  // Mouse enter — wake from sleep
  container.addEventListener("mouseenter", () => {
    const artEl = document.getElementById("ascii-art");
    if (artEl && artEl.className.includes("state-sleeping")) {
      setState("idle");
    }
  });
}

function onTarotDraw() {
  if (showingTarot) return;
  showingTarot = true;

  const artEl = document.getElementById("ascii-art");
  const petArt = artEl.textContent;
  const draw = drawTarotCard();

  // Flash + show card
  artEl.textContent = draw.ascii.join("\n");
  artEl.classList.add("tarot-flash");
  setState("happy");

  // Swap back after 5s
  setTimeout(() => {
    artEl.classList.remove("tarot-flash");
    artEl.textContent = petArt;
    setState("idle");
    showingTarot = false;
  }, 5000);
}
