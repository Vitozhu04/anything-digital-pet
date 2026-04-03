// ui/renderer.js
const RARITY_CLASSES = { N: "rarity-N", R: "rarity-R", SR: "rarity-SR", SSR: "rarity-SSR" };
const STATE_CLASSES = {
  idle: "state-idle", thinking: "state-thinking", typing: "state-typing",
  error: "state-error", happy: "state-happy", sleeping: "state-sleeping",
};
const STATUS_ICONS = {
  idle: "", thinking: "...", typing: "⌨️", error: "❗", happy: "✨", sleeping: "zzZ",
};

let currentState = "idle";
let sleepTimer = null;
const SLEEP_TIMEOUT = 60000;

export function getActiveArtElement() {
  const petArt = document.getElementById("pet-art");
  return petArt.classList.contains("hidden")
    ? document.getElementById("ascii-art")
    : petArt;
}

export async function initRenderer(petData) {
  const rarityClass = RARITY_CLASSES[petData.bones.rarity] || "rarity-N";
  const petArtEl = document.getElementById("pet-art");
  const asciiEl = document.getElementById("ascii-art");

  // Load SVG pet
  try {
    const resp = await fetch("westie.svg");
    const svg = await resp.text();
    petArtEl.innerHTML = svg;
    petArtEl.className = `${rarityClass} state-idle`;
    asciiEl.classList.add("hidden");
  } catch {
    // Fallback to ASCII
    petArtEl.classList.add("hidden");
    asciiEl.classList.remove("hidden");
    asciiEl.textContent = petData.soul.asciiArt.join("\n");
    asciiEl.className = `${rarityClass} state-idle`;
  }

  // Shelf + name
  document.getElementById("shelf").className = rarityClass;
  document.getElementById("pet-name").className = rarityClass;
  document.getElementById("status-icon").textContent = "";
  resetSleepTimer();
}

export function setState(state) {
  if (currentState === "sleeping" && state !== "sleeping") {
    playWakeAnimation(() => applyState(state));
  } else {
    applyState(state);
  }
  if (state !== "sleeping") resetSleepTimer();
}

function applyState(state) {
  currentState = state;
  const el = getActiveArtElement();
  const iconEl = document.getElementById("status-icon");
  const rarityClass = (el.className || "").split(" ").find(c => c.startsWith("rarity-")) || "rarity-N";
  el.className = `${rarityClass} ${STATE_CLASSES[state] || "state-idle"}`;
  iconEl.textContent = STATUS_ICONS[state] || "";
}

function playWakeAnimation(callback) {
  const el = getActiveArtElement();
  el.style.animation = "jitter 0.1s linear 3";
  setTimeout(() => {
    el.style.animation = "";
    callback();
  }, 300);
}

function resetSleepTimer() {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => setState("sleeping"), SLEEP_TIMEOUT);
}
