// ui/drag.js
export function initDrag() {
  if (!window.__TAURI__) {
    console.warn("No __TAURI__, drag disabled");
    return;
  }

  const container = document.getElementById("pet-container");

  container.addEventListener("mousedown", async (e) => {
    e.preventDefault();
    try {
      const win = window.__TAURI__.window.getCurrentWindow();
      await win.startDragging();
    } catch (err) {
      console.error("startDragging failed:", err);
    }
  });
}
