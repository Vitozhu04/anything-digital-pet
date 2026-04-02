// ui/bubble.js
let bubbleTimer = null;

export function showBubble(text, duration = 3000) {
  const el = document.getElementById("bubble");
  el.textContent = text;
  el.classList.remove("hidden");

  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, duration);
}
