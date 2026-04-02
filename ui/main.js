// ui/main.js
import { initRenderer, setState } from "./renderer.js";
import { initDrag } from "./drag.js";
import { showBubble } from "./bubble.js";
import { initInteractions } from "./interact.js";

let petData = null;

async function init() {
  if (window.__TAURI__) {
    try {
      petData = await window.__TAURI__.core.invoke("load_pet");
    } catch {
      document.getElementById("ascii-art").textContent = "No pet found.\nRun /create-pet";
      return;
    }
  }

  if (!petData) {
    document.getElementById("ascii-art").textContent = "No pet found.\nRun /create-pet";
    return;
  }

  initRenderer(petData);
  initDrag();
  initInteractions();

  // Set English name label
  document.getElementById("pet-name").textContent =
    petData.soul.nameEn || petData.soul.name;

  // Agent events
  if (window.__TAURI__) {
    window.__TAURI__.event.listen("pet-event", (event) => {
      const { state, data } = event.payload;
      setState(state);
      if (data?.summary) showBubble(data.summary);
    });
  }
}

init();
