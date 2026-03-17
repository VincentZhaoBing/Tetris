# Tetris – Pseudo-3D Edition

A cyberpunk-styled, pseudo-3D Tetris game built with **PixiJS 7**, running entirely in the browser with no build step required.

## Features

- 🧊 **Pseudo-3D blocks** – each cell rendered with top, front, and right-side faces for an isometric depth effect
- 💥 **Explosive line-clear effects** – particle storms, shockwave rings, scan-line flashes, screen shake, floating text (NICE! / DOUBLE! / TRIPLE! / TETRIS!!)
- 🎆 **Tetris fireworks** – 4-line clear triggers full-screen rainbow fireworks lasting ~2.5 seconds
- 👻 **Ghost piece** – semi-transparent outline shows where the piece will land
- 🤝 **Hold piece** – press **C** to save the current piece for later
- 🔢 **Next 3 pieces preview**
- ⚡ **Combo system** – consecutive clears multiply bonus score and intensify effects
- 🏆 **High score** – persisted in `localStorage`
- 🌌 **Cyberpunk neon visual style** – dark background, colored grid, neon glow on active pieces

## Controls

| Key | Action |
|-----|--------|
| ← / → | Move piece |
| ↑ or Z | Rotate clockwise |
| ↓ | Soft drop |
| Space | Hard drop (instant) |
| C | Hold piece |
| P | Pause / Resume |
| R or Enter | Restart (on Game Over) |

## How to Run

### Option 1 – VS Code Live Server (recommended)
1. Install the **Live Server** extension in VS Code.
2. Open the project folder in VS Code.
3. Right-click `index.html` → **Open with Live Server**.

### Option 2 – Any local HTTP server
```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```
Then open `http://localhost:8080` in your browser.

> ⚠️ **Important:** The game uses ES6 modules (`<script type="module">`), which require serving over HTTP/HTTPS. Opening `index.html` directly as a `file://` URL will not work in most browsers.

## File Structure

```
/
├── index.html          # Main page (loads PixiJS via CDN)
├── style.css           # Cyberpunk global styles
└── src/
    ├── main.js         # Entry point – initializes PixiJS App & layout
    ├── game.js         # Game loop, state machine, input handling
    ├── board.js        # 10×20 grid management, collision, line clearing
    ├── piece.js        # 7 Tetrominoes, SRS rotation, Wall Kick data
    ├── renderer.js     # PixiJS pseudo-3D block rendering
    ├── effects.js      # Particles, shockwaves, fireworks, screen shake
    └── ui.js           # Score panels, next/hold previews, pause overlay
```

## Tech Stack

- **[PixiJS 7](https://pixijs.com/)** – WebGL 2D rendering engine (via CDN)
- **[@pixi/filter-glow](https://filters.pixijs.download/main/docs/index.html)** – Glow filter for active piece
- **[@pixi/filter-bloom](https://filters.pixijs.download/main/docs/index.html)** – Bloom filter for scan lines
- ES6 modules, no bundler or build tool required
