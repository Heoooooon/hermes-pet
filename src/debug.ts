// Debug overlay: a click-through fullscreen window that draws which desktop
// windows the pet recognizes and which top edges qualify as platforms.
import {
  getCurrentWindow,
  currentMonitor,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

const win = getCurrentWindow();
const canvas = document.getElementById("overlay") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Pet window size in logical px — keep in sync with tauri.conf.json.
const PET_W = 220;
const PET_H = 240;

let monLogicalH = 0;

async function init() {
  const monitor = await currentMonitor();
  if (!monitor) return;
  monLogicalH = monitor.size.height / monitor.scaleFactor;
  await win.setPosition(
    new PhysicalPosition(monitor.position.x, monitor.position.y),
  );
  await win.setSize(new PhysicalSize(monitor.size.width, monitor.size.height));
  await win.setIgnoreCursorEvents(true); // never intercept the mouse

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  setInterval(draw, 500);
  void draw();
}

async function draw() {
  if (!(await win.isVisible())) return;
  let wins: { id: number; x: number; y: number; width: number; height: number }[] = [];
  try {
    wins = await invoke("list_windows");
  } catch {
    // keep the previous frame
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const w of wins) {
    const walkable =
      w.width >= PET_W && w.y - PET_H > 0 && w.y < monLogicalH - 6;

    // Full window outline.
    ctx.strokeStyle = walkable
      ? "rgba(80, 220, 120, 0.55)"
      : "rgba(255, 120, 120, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(w.x, w.y, w.width, w.height);
    ctx.setLineDash([]);

    // The top edge — the actual platform the pet walks on.
    ctx.strokeStyle = walkable
      ? "rgba(60, 230, 110, 0.95)"
      : "rgba(255, 110, 110, 0.7)";
    ctx.lineWidth = walkable ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.lineTo(w.x + w.width, w.y);
    ctx.stroke();

    // Label.
    const label = walkable
      ? `#${w.id} 발판 ${Math.round(w.width)}×${Math.round(w.height)}`
      : `#${w.id} 제외 ${Math.round(w.width)}×${Math.round(w.height)}`;
    ctx.font = "12px -apple-system, sans-serif";
    const pad = 4;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = walkable
      ? "rgba(20, 90, 45, 0.85)"
      : "rgba(110, 40, 40, 0.8)";
    ctx.fillRect(w.x + 6, w.y + 4, tw + pad * 2, 18);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, w.x + 6 + pad, w.y + 17);
  }

  // Floor line + legend.
  ctx.strokeStyle = "rgba(120, 180, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, monLogicalH - 1.5);
  ctx.lineTo(window.innerWidth, monLogicalH - 1.5);
  ctx.stroke();

  const legend = "🟩 걸을 수 있는 발판   🟥 인식됐지만 제외(좁음/높음)   🟦 바닥";
  ctx.font = "13px -apple-system, sans-serif";
  const lw = ctx.measureText(legend).width;
  const lx = (window.innerWidth - lw) / 2 - 10;
  ctx.fillStyle = "rgba(15, 15, 20, 0.8)";
  ctx.fillRect(lx, 34, lw + 20, 26);
  ctx.fillStyle = "#fff";
  ctx.fillText(legend, lx + 10, 52);
}

init();
