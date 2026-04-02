// ui/drag.js
export function initDrag() {
  const container = document.getElementById("pet-container");
  let dragging = false;
  let startX, startY;

  container.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = e.screenX;
    startY = e.screenY;
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener("pointermove", async (e) => {
    if (!dragging) return;
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    startX = e.screenX;
    startY = e.screenY;

    if (window.__TAURI__) {
      const { getCurrentWindow } = window.__TAURI__.window;
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      await win.setPosition({ type: "Physical", x: pos.x + dx, y: pos.y + dy });
    }
  });

  container.addEventListener("pointerup", (e) => {
    dragging = false;
    container.releasePointerCapture(e.pointerId);
  });
}
