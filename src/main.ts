import {
  getCurrentWindow,
  currentMonitor,
  availableMonitors,
  PhysicalPosition,
  type Monitor,
} from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const appWindow = getCurrentWindow();
const stage = document.getElementById("stage")!;
const pet = document.getElementById("pet") as HTMLImageElement;
const effects = document.getElementById("effects")!;
const menu = document.getElementById("menu")!;
const quitBtn = document.getElementById("quit")!;

type State = "idle" | "walk" | "drag" | "react" | "fall" | "edge";
let state: State = "idle";
let walkTimer: ReturnType<typeof setTimeout> | null = null;
let walkFrame: ReturnType<typeof setInterval> | null = null;
let fallFrame: ReturnType<typeof setInterval> | null = null;
let edgeTimer: ReturnType<typeof setTimeout> | null = null;

// Per-state animation assets. A state without a (loaded) asset falls back
// to the idle sprite; CSS keyframes still apply on top either way.
const SPRITES: Record<State, string> = {
  idle: "/character.apng",
  walk: "/walk.apng",
  drag: "/drag.apng",
  react: "/react.apng",
  fall: "/fall.apng",
  edge: "/edge.apng",
};

// One-shot APNGs (plays=1) need a cache-buster to replay on re-entry.
const ONE_SHOT: ReadonlySet<State> = new Set(["fall", "edge"]);

const loadedSprites = new Map<State, string>();

for (const [key, url] of Object.entries(SPRITES) as [State, string][]) {
  const probe = new Image();
  probe.onload = () => {
    loadedSprites.set(key, url);
    document.body.classList.add(`has-${key}`);
  };
  probe.src = url;
}

function spriteFor(target: State): string {
  return loadedSprites.get(target) ?? SPRITES.idle;
}

function setState(next: State) {
  state = next;
  document.body.dataset.state = next;
  const src = spriteFor(next);
  if (ONE_SHOT.has(next) && loadedSprites.has(next)) {
    pet.src = `${src}?t=${Date.now()}`;
  } else if (!pet.src.endsWith(src)) {
    pet.src = src;
  }
}

function setFlip(dir: -1 | 1) {
  pet.style.setProperty("--flip", String(dir));
}

// ---------- world geometry ----------
//
// The pet walks on "platforms": the top edges of other apps' windows
// (reported by the Rust `list_windows` command) plus the screen floor.
// All values below are physical pixels.

type Platform = { id: number | "floor"; x1: number; x2: number; y: number };

let scale = 2;
let winW = 440;
let winH = 480;
let monX = 0;
let monY = 0;
let monW = 0;
let monH = 0;
let windowPlatforms: Platform[] = [];
let standingOn: Platform | null = null;

function floorPlatform(): Platform {
  return { id: "floor", x1: monX, x2: monX + monW, y: monY + monH };
}

async function refreshMonitor() {
  const monitor = await currentMonitor();
  if (!monitor) return;
  scale = monitor.scaleFactor;
  monX = monitor.position.x;
  monY = monitor.position.y;
  monW = monitor.size.width;
  monH = monitor.size.height;
  const size = await appWindow.outerSize();
  winW = size.width;
  winH = size.height;
}

async function refreshPlatforms() {
  try {
    const wins = await invoke<
      { id: number; x: number; y: number; width: number; height: number }[]
    >("list_windows");
    windowPlatforms = wins
      .map((w) => ({
        id: w.id,
        x1: Math.round(w.x * scale),
        x2: Math.round((w.x + w.width) * scale),
        y: Math.round(w.y * scale),
      }))
      .filter((p) => p.x2 - p.x1 >= winW) // wide enough to stand on
      .filter((p) => p.y - winH > monY) // headroom below the menu bar
      .filter((p) => p.y < monY + monH - 12); // meaningfully above the floor
  } catch {
    windowPlatforms = [];
  }
}

// Highest surface below the given feet line at horizontal center cx.
function surfaceBelow(cx: number, feetY: number): Platform {
  let best = floorPlatform();
  for (const p of windowPlatforms) {
    if (cx < p.x1 || cx > p.x2) continue;
    if (p.y < feetY - 4) continue; // above us — not a landing surface
    if (p.y < best.y) best = p;
  }
  return best;
}

// ---------- gravity ----------

// Land on the surface below if airborne, otherwise rest where we are.
async function settle() {
  await refreshMonitor(); // the pet may have been dropped on another monitor
  const pos = await appWindow.outerPosition();
  const feet = pos.y + winH;
  const cx = pos.x + winW / 2;
  const target = surfaceBelow(cx, feet);
  if (target.y - feet > 10) {
    void fall(pos.y);
  } else {
    standingOn = target;
    await appWindow.setPosition(new PhysicalPosition(pos.x, target.y - winH));
    setState("idle");
    scheduleNext();
  }
}

async function fall(startY: number) {
  if (fallFrame) clearInterval(fallFrame);
  setState("fall");

  const x = (await appWindow.outerPosition()).x; // x is fixed while falling
  const cx = x + winW / 2;
  const dt = 0.016; // s per tick
  const gravity = 2600; // physical px/s², freefall
  const chuteDelayMs = 550; // parachute opens near the end of the APNG
  const drift = 260; // physical px/s descent under parachute
  let y = startY;
  let vy = 0;
  let elapsed = 0;

  fallFrame = setInterval(async () => {
    if (state !== "fall") return stopFall();
    elapsed += 16;
    if (elapsed < chuteDelayMs) {
      vy += gravity * dt;
    } else {
      vy = Math.max(drift, vy * 0.8); // brake into a gentle drift
    }
    // Re-target every tick so windows moving or closing mid-fall are
    // handled: she lands on whatever is actually below her feet.
    const target = surfaceBelow(cx, y + winH);
    const restY = target.y - winH;
    y = Math.min(restY, y + vy * dt);
    await appWindow.setPosition(new PhysicalPosition(x, Math.round(y)));
    if (y >= restY) {
      stopFall();
      standingOn = target;
      setState("idle");
      scheduleNext();
    }
  }, 16);
}

function stopFall() {
  if (fallFrame) clearInterval(fallFrame);
  fallFrame = null;
}

// ---------- idle scheduler ----------

function scheduleNext() {
  if (walkTimer) clearTimeout(walkTimer);
  walkTimer = setTimeout(() => {
    if (state === "idle" && Math.random() < 0.8) {
      walk();
    } else {
      scheduleNext();
    }
  }, 2000 + Math.random() * 3000);
}

// ---------- walking ----------

async function walk() {
  if (state !== "idle") return scheduleNext();
  const p = standingOn ?? floorPlatform();
  standingOn = p;

  const pos = await appWindow.outerPosition();
  const minX = Math.max(p.x1, monX);
  const maxX = Math.min(p.x2, monX + monW) - winW;
  if (maxX <= minX) return scheduleNext();

  // Sometimes head straight for a corner to climb up and sit on it.
  let targetX = Math.round(minX + Math.random() * (maxX - minX));
  if (Math.random() < 0.35) targetX = Math.random() < 0.5 ? minX : maxX;
  const dir: -1 | 1 = targetX > pos.x ? 1 : -1;
  const speed = Math.max(2, Math.round(2 * scale));
  const edgeZone = Math.round(16 * scale);

  setFlip(dir);
  setState("walk");

  let x = pos.x;
  walkFrame = setInterval(async () => {
    if (state !== "walk") return stopWalk();
    x += speed * dir;
    const arrived = (dir === 1 && x >= targetX) || (dir === -1 && x <= targetX);
    if (arrived) x = targetX;
    await appWindow.setPosition(new PhysicalPosition(x, p.y - winH));
    if (!arrived) return;
    if (walkFrame) clearInterval(walkFrame);
    walkFrame = null;
    if (x - minX <= edgeZone) void arriveAtEnd(-1);
    else if (maxX - x <= edgeZone) void arriveAtEnd(1);
    else {
      setState("idle");
      scheduleNext();
    }
  }, 16);
}

// Reaching the end of a platform: on the floor, cross into an adjacent
// monitor when one exists; otherwise climb up and sit on the corner.
async function arriveAtEnd(dir: -1 | 1) {
  if (standingOn?.id === "floor") {
    const next = await adjacentMonitor(dir);
    if (next) return crossTo(next, dir);
  }
  enterEdge(dir);
}

async function adjacentMonitor(dir: -1 | 1): Promise<Monitor | undefined> {
  try {
    const monitors = await availableMonitors();
    const boundary = dir === 1 ? monX + monW : monX;
    return monitors.find((m) => {
      if (m.position.x === monX && m.position.y === monY) return false; // self
      const overlapsY =
        m.position.y < monY + monH && m.position.y + m.size.height > monY;
      if (!overlapsY) return false;
      return dir === 1
        ? Math.abs(m.position.x - boundary) <= 8
        : Math.abs(m.position.x + m.size.width - boundary) <= 8;
    });
  } catch {
    return undefined;
  }
}

async function crossTo(m: Monitor, dir: -1 | 1) {
  scale = m.scaleFactor;
  monX = m.position.x;
  monY = m.position.y;
  monW = m.size.width;
  monH = m.size.height;
  standingOn = floorPlatform();
  const x = dir === 1 ? monX + 8 : monX + monW - winW - 8;
  await appWindow.setPosition(new PhysicalPosition(x, monY + monH - winH));
  setState("idle");
  scheduleNext();
}

function stopWalk() {
  if (walkFrame) clearInterval(walkFrame);
  walkFrame = null;
  if (state === "walk") setState("idle");
  scheduleNext();
}

// Climb up and sit on the corner for a while. On a window, leaving the
// corner means hopping off and parachuting down; on the floor, just idle.
function enterEdge(dir: -1 | 1) {
  setFlip(dir);
  setState("edge");
  if (edgeTimer) clearTimeout(edgeTimer);
  edgeTimer = setTimeout(
    () => {
      if (state !== "edge") return;
      if (standingOn && standingOn.id !== "floor") {
        setState("idle");
        void hopOff(dir);
      } else {
        setState("idle");
        scheduleNext();
      }
    },
    4000 + Math.random() * 4000,
  );
}

async function hopOff(dir: -1 | 1) {
  const pos = await appWindow.outerPosition();
  const x = pos.x + dir * Math.round(winW * 0.6);
  await appWindow.setPosition(new PhysicalPosition(x, pos.y));
  void settle();
}

// ---------- support check: react when windows move or close ----------

setInterval(async () => {
  if (!standingOn || standingOn.id === "floor") return;
  if (state === "drag" || state === "fall" || state === "react") return;
  const fresh = windowPlatforms.find((w) => w.id === standingOn!.id);
  const pos = await appWindow.outerPosition();
  const cx = pos.x + winW / 2;
  if (!fresh || cx < fresh.x1 || cx > fresh.x2) {
    if (walkFrame) {
      clearInterval(walkFrame);
      walkFrame = null;
    }
    void settle(); // ground vanished from under her feet
    return;
  }
  // Ride the window: mutate in place so an in-flight walk sees the move.
  standingOn.x1 = fresh.x1;
  standingOn.x2 = fresh.x2;
  standingOn.y = fresh.y;
  const restY = fresh.y - winH;
  if ((state === "idle" || state === "edge") && Math.abs(pos.y - restY) > 2) {
    await appWindow.setPosition(new PhysicalPosition(pos.x, restY));
  }
}, 400);

// ---------- drag vs click ----------

let pressed = false;
let dragging = false;
let downX = 0;
let downY = 0;
let dragEndTimer: ReturnType<typeof setTimeout> | null = null;

stage.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  // Clicks inside the menu must reach the buttons — hiding the menu on
  // mousedown would remove the target before its click event fires.
  if (menu.contains(e.target as Node)) return;
  menu.hidden = true;
  if (state === "fall") stopFall(); // caught mid-air
  pressed = true;
  dragging = false;
  downX = e.screenX;
  downY = e.screenY;
});

stage.addEventListener("mousemove", (e) => {
  if (!pressed || dragging) return;
  const moved = Math.hypot(e.screenX - downX, e.screenY - downY);
  if (moved > 5) {
    dragging = true;
    if (walkFrame) stopWalk();
    setState("drag");
    appWindow.startDragging();
  }
});

stage.addEventListener("mouseup", (e) => {
  if (e.button !== 0 || !pressed) return;
  pressed = false;
  if (!dragging) react();
});

// While the OS drag loop runs, the webview gets no mouseup — end the
// drag pose once move events stop arriving.
appWindow.onMoved(() => {
  if (state !== "drag") return;
  if (dragEndTimer) clearTimeout(dragEndTimer);
  dragEndTimer = setTimeout(() => {
    pressed = false;
    dragging = false;
    if (state === "drag") void settle();
  }, 250);
});

// ---------- click reaction ----------

function react() {
  if (state === "walk" && walkFrame) stopWalk();
  setState("react");
  for (let i = 0; i < 3; i++) spawnHeart();
  pet.addEventListener(
    "animationend",
    () => {
      if (state === "react") void settle();
    },
    { once: true },
  );
}

function spawnHeart() {
  const heart = document.createElement("span");
  heart.className = "heart";
  heart.textContent = ["💖", "✨", "🌸"][Math.floor(Math.random() * 3)];
  heart.style.left = `${30 + Math.random() * 40}%`;
  heart.style.bottom = `${45 + Math.random() * 25}%`;
  heart.style.animationDelay = `${Math.random() * 0.25}s`;
  effects.appendChild(heart);
  setTimeout(() => heart.remove(), 1600);
}

// ---------- context menu (quit) ----------

stage.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  menu.hidden = !menu.hidden;
});

quitBtn.addEventListener("click", () => appWindow.close());

// ---------- debug overlay toggle ----------

const debugBtn = document.getElementById("debug-toggle")!;
let debugShown = false;

debugBtn.addEventListener("click", async () => {
  const overlay = await WebviewWindow.getByLabel("debug");
  if (!overlay) return;
  debugShown = !debugShown;
  if (debugShown) await overlay.show();
  else await overlay.hide();
  debugBtn.textContent = debugShown ? "표시 끄기" : "인식 표시";
  menu.hidden = true;
});

// ---------- startup: sit at the bottom center of the screen ----------

async function init() {
  await refreshMonitor();
  await refreshPlatforms();
  standingOn = floorPlatform();
  const x = Math.round(monX + (monW - winW) / 2);
  await appWindow.setPosition(new PhysicalPosition(x, monY + monH - winH));
  setInterval(refreshPlatforms, 500);
  scheduleNext();
}

init();
