/**
 * main.js - Entry point: initializes PixiJS application and starts the game
 */

import { Game } from './game.js';
import { CELL_SIZE } from './renderer.js';
import { BOARD_COLS, BOARD_ROWS } from './board.js';

// ── Layout constants ──────────────────────────────────────────────────────────
const BOARD_PX_W = BOARD_COLS * CELL_SIZE;  // 320px
const BOARD_PX_H = BOARD_ROWS * CELL_SIZE;  // 640px
const SIDE_PANEL_W = 140;                    // left/right panel width
const PADDING = 12;

const TOTAL_W = SIDE_PANEL_W + PADDING + BOARD_PX_W + PADDING + SIDE_PANEL_W;
const TOTAL_H = BOARD_PX_H + 20;

// ── Initialize PixiJS ─────────────────────────────────────────────────────────
async function init() {
  const app = new PIXI.Application({
    width: TOTAL_W,
    height: TOTAL_H,
    backgroundColor: 0x05070F,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  // Mount canvas
  document.getElementById('game-container').appendChild(app.view);

  // ── Background ────────────────────────────────────────────────────────────────
  const bgGfx = new PIXI.Graphics();
  drawBackground(bgGfx, TOTAL_W, TOTAL_H);
  app.stage.addChild(bgGfx);

  // ── Board area ────────────────────────────────────────────────────────────────
  // Board border/frame
  const boardFrame = new PIXI.Graphics();
  const boardX = SIDE_PANEL_W + PADDING;
  const boardY = 10;
  drawBoardFrame(boardFrame, boardX - 3, boardY - 3, BOARD_PX_W + 6, BOARD_PX_H + 6);
  app.stage.addChild(boardFrame);

  // Board container (holds grid, pieces)
  const boardContainer = new PIXI.Container();
  boardContainer.x = boardX;
  boardContainer.y = boardY;
  app.stage.addChild(boardContainer);

  // Effects layer (overlaid directly on board coordinates)
  const effectsLayer = new PIXI.Container();
  effectsLayer.x = boardX;
  effectsLayer.y = boardY;
  app.stage.addChild(effectsLayer);

  // ── Side panels ───────────────────────────────────────────────────────────────
  const leftPanel = new PIXI.Container();
  leftPanel.x = 0;
  leftPanel.y = boardY;
  app.stage.addChild(leftPanel);

  const rightPanel = new PIXI.Container();
  rightPanel.x = boardX + BOARD_PX_W + PADDING;
  rightPanel.y = boardY;
  app.stage.addChild(rightPanel);

  // UI layer (topmost, for text popups etc.)
  const uiLayer = new PIXI.Container();
  uiLayer.x = boardX;
  uiLayer.y = boardY;
  app.stage.addChild(uiLayer);

  // ── Create Game ────────────────────────────────────────────────────────────────
  const game = new Game(app, boardContainer, effectsLayer, leftPanel, rightPanel, uiLayer);

  // Position the pause overlay correctly
  game.ui.setPauseOverlayPosition(boardX, boardY);

  // ── Start Screen ───────────────────────────────────────────────────────────────
  showStartScreen(app, boardContainer, BOARD_PX_W, BOARD_PX_H);

  // ── Handle resize ─────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    fitToScreen(app, TOTAL_W, TOTAL_H);
  });
  fitToScreen(app, TOTAL_W, TOTAL_H);
}

// ── Background: cyberpunk grid ────────────────────────────────────────────────
function drawBackground(gfx, w, h) {
  // Base gradient feel via rectangle
  gfx.beginFill(0x05070F);
  gfx.drawRect(0, 0, w, h);
  gfx.endFill();

  // Subtle grid lines
  gfx.lineStyle(0.5, 0x0E1A2A, 0.6);
  const spacing = 20;
  for (let x = 0; x < w; x += spacing) {
    gfx.moveTo(x, 0);
    gfx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += spacing) {
    gfx.moveTo(0, y);
    gfx.lineTo(w, y);
  }

  // Faint scanline overlay for CRT effect
  for (let y = 0; y < h; y += 4) {
    gfx.lineStyle(1, 0x000000, 0.12);
    gfx.moveTo(0, y);
    gfx.lineTo(w, y);
  }
}

// ── Board border (neon glow frame) ────────────────────────────────────────────
function drawBoardFrame(gfx, x, y, w, h) {
  // Outer glow
  gfx.lineStyle(4, 0x0044AA, 0.25);
  gfx.drawRect(x - 3, y - 3, w + 6, h + 6);
  // Inner border
  gfx.lineStyle(2, 0x1155CC, 0.7);
  gfx.drawRect(x, y, w, h);
  // Inner glow edge
  gfx.lineStyle(1, 0x2277FF, 0.4);
  gfx.drawRect(x + 1, y + 1, w - 2, h - 2);
}

// ── Start screen overlay ──────────────────────────────────────────────────────
function showStartScreen(app, boardContainer, w, h) {
  const container = new PIXI.Container();

  const bg = new PIXI.Graphics();
  bg.beginFill(0x000011, 0.75);
  bg.drawRect(0, 0, w, h);
  bg.endFill();
  container.addChild(bg);

  const title = new PIXI.Text('TETRIS', new PIXI.TextStyle({
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 52,
    fontWeight: 'bold',
    fill: [0x00FFFF, 0xAA00FF],
    fillGradientType: 1,
    stroke: 0x000033,
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: 0x00FFFF,
    dropShadowBlur: 20,
    dropShadowDistance: 0,
    letterSpacing: 10,
  }));
  title.anchor.set(0.5);
  title.x = w / 2;
  title.y = h / 2 - 80;
  container.addChild(title);

  const sub = new PIXI.Text('PSEUDO-3D EDITION', new PIXI.TextStyle({
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 14,
    fill: 0x8899CC,
    letterSpacing: 5,
  }));
  sub.anchor.set(0.5);
  sub.x = w / 2;
  sub.y = h / 2 - 30;
  container.addChild(sub);

  const startHint = new PIXI.Text('Press any key to start', new PIXI.TextStyle({
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: 16,
    fill: 0x00FFAA,
    letterSpacing: 2,
  }));
  startHint.anchor.set(0.5);
  startHint.x = w / 2;
  startHint.y = h / 2 + 30;
  container.addChild(startHint);

  // Blink hint
  let t = 0;
  const blinkTick = (delta) => {
    t += delta / 60;
    startHint.alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5));
    // Gently pulse title
    title.scale.set(1 + 0.01 * Math.sin(t * 1.2));
  };
  app.ticker.add(blinkTick);

  boardContainer.addChild(container);

  // Dismiss on any key press
  const dismiss = () => {
    if (container.parent) {
      app.ticker.remove(blinkTick);
      container.parent.removeChild(container);
      container.destroy({ children: true });
    }
    window.removeEventListener('keydown', dismiss);
  };
  window.addEventListener('keydown', dismiss);
}

// ── Fit canvas to window ──────────────────────────────────────────────────────
function fitToScreen(app, designW, designH) {
  const canvas = app.view;
  const scaleX = window.innerWidth / designW;
  const scaleY = window.innerHeight / designH;
  const scale  = Math.min(scaleX, scaleY, 1.5); // cap at 1.5x
  canvas.style.width  = `${designW * scale}px`;
  canvas.style.height = `${designH * scale}px`;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
init().catch(console.error);
