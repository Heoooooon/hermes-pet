# aipet

An open-source desktop pet — a character that lives on your screen.
화면 위에서 살아 움직이는 오픈소스 데스크톱 펫입니다.

Built with [Tauri](https://tauri.app) (transparent, always-on-top, frameless window) + vanilla TypeScript.

## Features

- 🫧 **Idle** — breathing animation while resting at the bottom of your screen
- 🚶 **Walk** — randomly wanders left and right along the screen edge
- ✋ **Drag** — grab and move the pet anywhere; it dangles while carried
- 💖 **React** — click the pet for a hop and a burst of hearts
- 🖱️ Right-click for the quit menu

## Getting started

Requirements: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) toolchain.

```bash
npm install
npm run tauri dev     # run in development
npm run tauri build   # build a distributable app
```

## Use your own character

The pet is a single image with a transparent background — swap in your own:

1. Replace `public/character.apng` with your character. An **animated APNG or WebP**
   plays automatically (blinking, swaying); a plain transparent PNG works too.
2. Adjust the window size in `src-tauri/tauri.conf.json` and the pet width in
   `src/style.css` if needed.

Asset-prep recipes:

```bash
# Remove the background from a still illustration
uvx --python 3.12 --from "rembg[cpu,cli]" --with "numba>=0.60" rembg i -m isnet-anime input.png character.png

# Animated GIF on a flat chroma background (e.g. #FF00FF) → looping APNG with alpha
ffmpeg -i input.gif -vf "colorkey=0xFF00FF:0.12:0.08" key_%02d.png
ffmpeg -framerate 50/3 -start_number 1 -i key_%02d.png -c:v apng -plays 0 character.apng
```

(GIF itself is not recommended as the pet asset — its 1-bit alpha leaves jagged
edges. Convert to APNG/WebP as above; see `art/` for the original source files.)

## Architecture

```
index.html / src/main.ts   state machine: idle → walk / drag / react
src/style.css              all animations (CSS keyframes)
src-tauri/                 Tauri shell: transparent always-on-top window
public/character.apng      the character sprite (swappable, APNG/WebP/PNG)
art/                       original source artwork
```

The behavior loop is a tiny state machine in `src/main.ts`. Walking moves the
OS window itself (`setPosition`), so the pet truly roams your desktop rather
than moving inside a fixed canvas.

## Roadmap

- [ ] Pixel-alpha based click-through (ignore clicks outside the character)
- [ ] Sprite-sheet animation frames (blink, wave, sleep)
- [ ] Multiple characters / asset packs defined by JSON
- [ ] Tray icon with settings

## License

- Code: [MIT](./LICENSE)
- Character artwork (`art/`, `public/character.png`): CC-BY-4.0 — AI-generated sample art; replace freely with your own.
