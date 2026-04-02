// ui/main.js
import { initRenderer, setState } from "./renderer.js";
import { initDrag } from "./drag.js";
import { showBubble } from "./bubble.js";
import { initInfoCard } from "./info-card.js";

let petData = null;

async function init() {
  // Load pet data from Tauri backend or URL param (debug)
  if (window.__TAURI__) {
    const { invoke } = window.__TAURI__.core;
    try {
      petData = await invoke("load_pet");
    } catch (e) {
      document.getElementById("ascii-art").textContent = "No pet found.\nRun /create-pet:cli";
      return;
    }
  } else {
    // Debug fallback: load from URL ?data= param
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("data");
    if (raw) {
      try {
        const std = raw.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(std);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        petData = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        document.getElementById("ascii-art").textContent = "Invalid pet data.";
        return;
      }
    }
  }

  if (!petData) {
    document.getElementById("ascii-art").textContent = "No pet found.\nRun /create-pet:cli";
    return;
  }

  initRenderer(petData);
  initDrag();
  initInfoCard(petData);

  // Listen for events from Tauri backend
  if (window.__TAURI__) {
    const { listen } = window.__TAURI__.event;
    listen("pet-event", (event) => {
      const { state, data } = event.payload;
      setState(state);
      if (data?.summary) showBubble(data.summary);
    });
  }
}

// Mouse enter wakes from sleep
document.addEventListener("mouseenter", () => {
  const artEl = document.getElementById("ascii-art");
  if (artEl && artEl.classList.contains("state-sleeping")) {
    setState("idle");
  }
});

init();
