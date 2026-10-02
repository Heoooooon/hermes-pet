# hermes-pet

**English** · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**Hermes runs around on your monitors.** An open-source desktop pet that uses
your app windows as platforms — she walks on them, rockets off to other
monitors, floats back down on a parachute, and can even hop over to your iPad.

Built with [Tauri 2](https://tauri.app) (a transparent, frameless,
always-on-top window) and vanilla TypeScript.

> The character is a fan character inspired by
> [Nous Research's hermes-agent](https://github.com/NousResearch).
> This is a fan project and is not affiliated with hermes-agent or Nous Research.

## Preview

<p align="center">
  <img src="docs/media/rocket.gif" width="320" alt="Hermes launches on a rocket, then parachutes down onto a window">
</p>
<p align="center"><sub>🚀 Liftoff → engine cut → parachute → <b>lands on a window</b> (the top edge of every window is a platform)</sub></p>

<p align="center">
  <img src="docs/media/jet.gif" width="640" alt="Hermes dashes across the screen on a jet">
</p>
<p align="center"><sub>✈️ A sideways jet dash — then a parachute landing</sub></p>

<p align="center">
  <img src="docs/media/walk-edge.gif" width="520" alt="Hermes walks along the floor, grabs the screen corner, and climbs up to sit on it">
</p>
<p align="center"><sub>🚶 Out for a walk — when she reaches a corner, she grabs it, climbs up, and sits</sub></p>

Action sprites (APNG — they play right here). Characters come as swappable
**packs**: the default pack is **Simeong** 🐶, and **Hermes** 🎧 ships as an
optional pack (switch in the settings panel):

| Pack | idle | walk | rocket | jet | fall | edge |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Simeong | <img src="public/packs/simeong/idle.apng" width="72"> | <img src="public/packs/simeong/walk.apng" width="66"> | <img src="public/packs/simeong/rocket.apng" width="72"> | <img src="public/packs/simeong/jet.apng" width="96"> | <img src="public/packs/simeong/fall.apng" width="72"> | <img src="public/packs/simeong/edge.apng" width="72"> |
| Hermes | <img src="public/packs/hermes/idle.apng" width="72"> | <img src="public/packs/hermes/walk.apng" width="66"> | <img src="public/packs/hermes/rocket.apng" width="72"> | <img src="public/packs/hermes/jet.apng" width="96"> | <img src="public/packs/hermes/fall.apng" width="72"> | <img src="public/packs/hermes/edge.apng" width="72"> |

(The demo GIFs above were recorded with the Hermes pack.)

## Features

- 🚶 **Walks on windows** — treats the top edge of real app windows as platforms, climbs up and walks along them, and rides along when a window moves
- 🪂 **Parachute** — floats down when her platform disappears or she drops from somewhere high
- 🚀 **Rocket & jet** — vertical rocket launches and sideways jet dashes
- 🖥️ **Multi-monitor** — crosses between monitors with different scale factors (Retina + external) by walking, jetting, or rocketing.
  Works with side-by-side layouts and vertically stacked ones too (rocket up, dive down)
- 📱 **iPad handoff** — if the Lanbeam agent (a separate project) is running, she hops over to your iPad at the screen edge (optional; everything works without it)
- 🎛️ **Settings GUI** — right-click → Settings: switch character packs and tune size, speed, activity, and trick frequency live (synced to the iPad pet too)
- 🎭 **Character packs** — drop action APNGs into `public/packs/<name>/` to make a new character
- 🐾 **Summon friends** — add up to 3 friends, each with a slightly different personality (size, gait)
- 🔍 **Recognition overlay** — a per-monitor overlay shows which windows she sees as platforms
- ✋ **Drag / 💖 click reactions** — pick her up and she dangles; click her and she sends a heart

## Getting started

Requirements: [Node.js](https://nodejs.org) 18+ and the [Rust](https://rustup.rs) toolchain.

```bash
npm install
npm run tauri dev     # run in development mode
npm run tauri build   # build a release app
```

<details>
<summary><b>Building on Windows</b> (experimental)</summary>

1. [Install Rust](https://rustup.rs) — choose the **MSVC toolchain** during setup.
   If you don't have Visual Studio, install the
   [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   that rustup points you to first (the "Desktop development with C++" workload).
2. Install [Node.js](https://nodejs.org) 18+.
3. WebView2 runtime — included with most Windows 10/11 installs. If it's missing,
   [install it here](https://developer.microsoft.com/microsoft-edge/webview2/).
4. The rest is the same:

   ```powershell
   npm install
   npm run tauri dev
   npm run tauri build   # output: src-tauri\target\release\bundle\
   ```

Window-platform detection is implemented with Win32 (`EnumWindows` + DWM) and
compiles, but hasn't been tested on real hardware yet. If an odd window gets
picked up as a platform, add its class name to the `SHELL_CLASSES` list in
`src-tauri/src/lib.rs` and let us know in an issue. iPad handoff is macOS-only
and is disabled automatically.

</details>

- Controls: drag to move · click for a reaction · **right-click** for the menu (Friend+ / Settings / Recognition overlay / Quit)
- Window detection uses public APIs only — no extra permissions needed.
  (macOS `CGWindowListCopyWindowInfo` / Windows `EnumWindows` + DWM)

### Platform support

| Platform | Status |
| --- | --- |
| **macOS** | Developed and tested (primary target) |
| **Windows** | Experimental — window-platform detection implemented in Win32 and compiles, not yet tested on real hardware. Issues welcome! |

iPad handoff is macOS-only (the Lanbeam agent is a macOS app).

## Bring your own character

Every action is a sprite at `public/packs/<pack>/<state>.apng` (idle / walk /
drag / react / fall / edge / rocket / jet). Replace a file with the same name
and it takes effect immediately; any missing action falls back to idle.
Optional variants (`<state>.2.apng` … `<state>.4.apng`) are picked at random.

The pipeline for adding a new action is written up as a recipe in
`.claude/skills/add-action/SKILL.md`, with two modes: generating frames with
[sprite-gen](https://github.com/aldegad/sprite-gen), or converting a GIF on a
magenta background:

```bash
# Solid-background GIF → alpha APNG (chroma key + despill + assemble)
ffmpeg -i in.gif -vf "colorkey=0xFF00FF:0.12:0.08" key_%02d.png
ffmpeg -framerate 50/3 -start_number 1 -i key_%02d.png -c:v apng -plays 0 public/packs/<pack>/idle.apng
```

The original source art is kept in `art/`.

## Project structure

```
src/main.ts          Behavior brain: state machine (idle/walk/drag/react/fall/edge/rocket/jet),
                     window-platform physics, multi-monitor crossing, Lanbeam handoff
src/style.css        Per-state CSS motion (toggled per state so it doesn't fight the drawn sprites)
src/debug.ts         Per-monitor platform-recognition overlay
src/settings.ts      Settings panel (persisted to localStorage + broadcast as events)
src-tauri/           Tauri shell: transparent window, list_windows (CGWindowList), Lanbeam bridge client
public/packs/*/      Character packs: per-action APNG sprites (swappable)
art/                 Original artwork + sprite-gen generation records
```

When the pet walks, it moves the actual OS window (`setPosition`), so she
roams your real desktop rather than a fixed canvas. Crossing between monitors
is computed in macOS logical-point coordinates, so she stays aligned even when
the monitors have different scale factors.

## Credits

This project was made with help from the people below. Thank you! 🙏

- **Hermes pack character** — [asin_cartel](https://www.threads.com/@asin_cartel)
- **Hermes pack action GIFs** (parachute, climbing, and more) — **Nornen** of the Hermes game crew (에르메스 게임단)
- **Sprite generation tool** — [sprite-gen](https://github.com/aldegad/sprite-gen) (@aldegad)
- Hermes character inspiration — [hermes-agent](https://hermes-agent.nousresearch.com) (Nous Research)
- Simeong (the default pack) is an original character by CMORE

## License

- **Code**: [MIT](./LICENSE)
- **Character and art assets** (`art/`, `public/packs/`): copyright belongs to
  their respective contributors (asin_cartel, Nornen), who have granted this
  project permission to use them. They are not covered by the code's MIT
  license, so please get the original artist's permission before using them
  elsewhere. If you fork this project, we recommend swapping in your own
  character.
