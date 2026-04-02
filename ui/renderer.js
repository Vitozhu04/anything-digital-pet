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

export function initRenderer(petData) {
  const rarityClass = RARITY_CLASSES[petData.bones.rarity] || "rarity-N";

  // ASCII art
  const artEl = document.getElementById("ascii-art");
  artEl.textContent = petData.soul.asciiArt.join("\n");
  artEl.className = `${rarityClass} state-idle`;

  // Shelf
  document.getElementById("shelf").className = rarityClass;

  // Name label
  const nameEl = document.getElementById("pet-name");
  nameEl.className = rarityClass;

  // Status
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
  const artEl = document.getElementById("ascii-art");
  const iconEl = document.getElementById("status-icon");
  const rarityClass = artEl.className.split(" ").find(c => c.startsWith("rarity-")) || "rarity-N";
  artEl.className = `${rarityClass} ${STATE_CLASSES[state] || "state-idle"}`;
  iconEl.textContent = STATUS_ICONS[state] || "";
}

function playWakeAnimation(callback) {
  const artEl = document.getElementById("ascii-art");
  artEl.style.animation = "jitter 0.1s linear 3";
  setTimeout(() => {
    artEl.style.animation = "";
    callback();
  }, 300);
}

function resetSleepTimer() {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => setState("sleeping"), SLEEP_TIMEOUT);
}
