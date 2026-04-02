// ui/bubble.js
let bubbleTimer = null;

export function showBubble(text) {
  const el = document.getElementById("bubble");
  el.textContent = text.slice(0, 50);
  el.classList.remove("hidden");

  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}
