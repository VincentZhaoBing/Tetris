/**
 * ui.js - UI elements: score panel, next piece previews, hold piece, combo display
 */

import { PIECES } from './piece.js';
import { CELL_SIZE } from './renderer.js';
import { BOARD_COLS, BOARD_ROWS } from './board.js';

// Reuse CELL_SIZE from renderer
const BOARD_PX_H = BOARD_ROWS * CELL_SIZE;
const BOARD_PX_W = BOARD_COLS * CELL_SIZE;

// Neon color palette used throughout UI
const NEON_CYAN   = 0x00FFFF;
const NEON_PURPLE = 0xAA00FF;
const NEON_ORANGE = 0xFF8800;
const NEON_YELLOW = 0xFFFF00;
const NEON_GREEN  = 0x00FF88;
const DIM_TEXT    = 0x8899AA;
const PANEL_BG    = 0x0A0F1A;
const PANEL_BORDER = 0x1A3A5A;

function panelTextStyle(size = 14, color = DIM_TEXT) {
  return new PIXI.TextStyle({
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: size,
    fill: color,
    letterSpacing: 2,
  });
}

function labelStyle(size = 11) {
  return panelTextStyle(size, DIM_TEXT);
}

function valueStyle(size = 22, color = NEON_CYAN) {
  return new PIXI.TextStyle({
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: size,
    fontWeight: 'bold',
    fill: color,
    dropShadow: true,
    dropShadowColor: color,
    dropShadowBlur: 6,
    dropShadowDistance: 0,
  });
}

/**
 * Draw a styled panel rectangle
 */
function drawPanel(gfx, x, y, w, h) {
  gfx.beginFill(PANEL_BG, 0.85);
  gfx.lineStyle(1, PANEL_BORDER, 0.8);
  gfx.drawRoundedRect(x, y, w, h, 4);
  gfx.endFill();
}

export class UI {
  /**
   * @param {PIXI.Application} app
   * @param {PIXI.Container} leftPanel   – container to the left of the board
   * @param {PIXI.Container} rightPanel  – container to the right of the board
   * @param {Renderer} renderer
   */
  constructor(app, leftPanel, rightPanel, renderer) {
    this.app = app;
    this.leftPanel = leftPanel;
    this.rightPanel = rightPanel;
    this.renderer = renderer;

    // Animated score state
    this.displayScore = 0;
    this.targetScore = 0;
    this.displayLines = 0;
    this.targetLines = 0;

    this.build();
    this.app.ticker.add(this.update, this);
  }

  build() {
    const panelW = 130;
    this.panelW = panelW;

    // ── Left panel: HOLD + game info ───────────────────────────────────────────
    this.leftGfx = new PIXI.Graphics();
    this.leftPanel.addChild(this.leftGfx);

    // HOLD label
    this.holdLabel = new PIXI.Text('HOLD', labelStyle(11));
    this.holdLabel.x = 10; this.holdLabel.y = 8;
    this.leftPanel.addChild(this.holdLabel);

    // HOLD preview area
    this.holdPreviewContainer = new PIXI.Container();
    this.holdPreviewContainer.x = panelW / 2;
    this.holdPreviewContainer.y = 65;
    this.leftPanel.addChild(this.holdPreviewContainer);

    // Hold-used indicator (dim overlay)
    this.holdDimOverlay = new PIXI.Graphics();
    this.leftPanel.addChild(this.holdDimOverlay);

    // Score section
    this.scoreLbl = new PIXI.Text('SCORE', labelStyle(11));
    this.scoreLbl.x = 10; this.scoreLbl.y = 145;
    this.leftPanel.addChild(this.scoreLbl);

    this.scoreText = new PIXI.Text('0', valueStyle(20, NEON_CYAN));
    this.scoreText.x = panelW / 2;
    this.scoreText.y = 163;
    this.scoreText.anchor.set(0.5, 0);
    this.leftPanel.addChild(this.scoreText);

    // High Score
    this.hiLbl = new PIXI.Text('BEST', labelStyle(11));
    this.hiLbl.x = 10; this.hiLbl.y = 200;
    this.leftPanel.addChild(this.hiLbl);

    this.hiText = new PIXI.Text('0', valueStyle(16, NEON_PURPLE));
    this.hiText.x = panelW / 2;
    this.hiText.y = 216;
    this.hiText.anchor.set(0.5, 0);
    this.leftPanel.addChild(this.hiText);

    // Level
    this.levelLbl = new PIXI.Text('LEVEL', labelStyle(11));
    this.levelLbl.x = 10; this.levelLbl.y = 250;
    this.leftPanel.addChild(this.levelLbl);

    this.levelText = new PIXI.Text('1', valueStyle(22, NEON_ORANGE));
    this.levelText.x = panelW / 2;
    this.levelText.y = 267;
    this.levelText.anchor.set(0.5, 0);
    this.leftPanel.addChild(this.levelText);

    // Lines
    this.linesLbl = new PIXI.Text('LINES', labelStyle(11));
    this.linesLbl.x = 10; this.linesLbl.y = 310;
    this.leftPanel.addChild(this.linesLbl);

    this.linesText = new PIXI.Text('0', valueStyle(20, NEON_GREEN));
    this.linesText.x = panelW / 2;
    this.linesText.y = 327;
    this.linesText.anchor.set(0.5, 0);
    this.leftPanel.addChild(this.linesText);

    // Controls hint
    this.controlsText = new PIXI.Text(
      '← →  Move\n↑ / Z Rotate\n↓    Soft drop\nSpc  Hard drop\nC    Hold\nP    Pause',
      new PIXI.TextStyle({
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 10,
        fill: 0x445566,
        lineHeight: 16,
      })
    );
    this.controlsText.x = 6;
    this.controlsText.y = 390;
    this.leftPanel.addChild(this.controlsText);

    // ── Right panel: NEXT previews ─────────────────────────────────────────────
    this.rightGfx = new PIXI.Graphics();
    this.rightPanel.addChild(this.rightGfx);

    this.nextLabel = new PIXI.Text('NEXT', labelStyle(11));
    this.nextLabel.x = 10; this.nextLabel.y = 8;
    this.rightPanel.addChild(this.nextLabel);

    // 3 Next piece preview slots
    this.nextContainers = [];
    for (let i = 0; i < 3; i++) {
      const c = new PIXI.Container();
      c.x = panelW / 2;
      c.y = 60 + i * 90;
      this.rightPanel.addChild(c);
      this.nextContainers.push(c);
    }

    // Draw static panel backgrounds
    this.drawPanels();
  }

  drawPanels() {
    const w = this.panelW;

    // Left panel background
    this.leftGfx.clear();
    drawPanel(this.leftGfx, 0, 0, w, BOARD_PX_H);
    drawPanel(this.leftGfx, 5, 24, w - 10, 100); // Hold box

    // Right panel background
    this.rightGfx.clear();
    drawPanel(this.rightGfx, 0, 0, w, BOARD_PX_H);
    for (let i = 0; i < 3; i++) {
      const scale = i === 0 ? 1 : 0.85;
      const boxH = 80 * scale;
      const y = 24 + i * 90;
      drawPanel(this.rightGfx, 5, y, w - 10, boxH);
    }
  }

  // ── Public update methods ────────────────────────────────────────────────────

  setScore(score) {
    this.targetScore = score;
  }

  setHighScore(hs) {
    this.hiText.text = hs.toString();
  }

  setLevel(level) {
    this.levelText.text = level.toString();
    // Flash level text
    this.levelText.scale.set(1.4);
    this.levelText.style.fill = 0xFFFFFF;
    setTimeout(() => {
      if (this.levelText) {
        this.levelText.scale.set(1);
        this.levelText.style.fill = NEON_ORANGE;
      }
    }, 300);
  }

  setLines(lines) {
    this.targetLines = lines;
  }

  // Update NEXT preview panels
  setNextPieces(typeArray) {
    typeArray.forEach((type, i) => {
      if (!this.nextContainers[i]) return;
      const pieceData = PIECES[type];
      const cellSize = i === 0 ? 20 : 16;
      this.renderer.drawMiniPiece(this.nextContainers[i], type, pieceData, cellSize);
    });
  }

  // Update HOLD panel
  setHoldPiece(type, used) {
    this.holdPreviewContainer.removeChildren();
    if (type) {
      const pieceData = PIECES[type];
      this.renderer.drawMiniPiece(this.holdPreviewContainer, type, pieceData, 18);
    }
    // If hold was used this turn, dim it
    this.holdDimOverlay.clear();
    if (used) {
      this.holdDimOverlay.beginFill(0x000000, 0.45);
      this.holdDimOverlay.drawRoundedRect(5, 24, this.panelW - 10, 100, 4);
      this.holdDimOverlay.endFill();
    }
  }

  // Animate score counting up
  update(delta) {
    if (this.displayScore < this.targetScore) {
      const diff = this.targetScore - this.displayScore;
      this.displayScore = Math.min(this.targetScore, this.displayScore + Math.max(1, Math.ceil(diff * 0.12)));
      this.scoreText.text = this.displayScore.toString();
      // Scale pop
      const scale = 1 + Math.min(0.3, diff / 500 * 0.3);
      this.scoreText.scale.set(scale);
    } else {
      if (this.scoreText.scale.x > 1) {
        this.scoreText.scale.set(Math.max(1, this.scoreText.scale.x - 0.02 * delta));
      }
    }
    if (this.displayLines < this.targetLines) {
      this.displayLines = Math.min(this.targetLines, this.displayLines + 1);
      this.linesText.text = this.displayLines.toString();
    }
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
  }

  // Show/hide pause overlay
  showPause(show) {
    if (show) {
      if (!this.pauseOverlay) {
        this.pauseOverlay = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000011, 0.65);
        bg.drawRect(0, 0, BOARD_PX_W, BOARD_PX_H);
        bg.endFill();
        this.pauseOverlay.addChild(bg);
        const txt = new PIXI.Text('PAUSED', new PIXI.TextStyle({
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: 36,
          fontWeight: 'bold',
          fill: NEON_CYAN,
          dropShadow: true,
          dropShadowColor: NEON_CYAN,
          dropShadowBlur: 12,
          dropShadowDistance: 0,
          letterSpacing: 8,
        }));
        txt.anchor.set(0.5);
        txt.x = BOARD_PX_W / 2;
        txt.y = BOARD_PX_H / 2;
        this.pauseOverlay.addChild(txt);
        const hint = new PIXI.Text('Press P to resume', panelTextStyle(14, DIM_TEXT));
        hint.anchor.set(0.5);
        hint.x = BOARD_PX_W / 2;
        hint.y = BOARD_PX_H / 2 + 50;
        this.pauseOverlay.addChild(hint);
      }
      // Attach to stage and position over the board
      this.app.stage.addChild(this.pauseOverlay);
      this.pauseOverlay.x = this.pauseOverlayX || 0;
      this.pauseOverlay.y = this.pauseOverlayY || 0;
    } else if (this.pauseOverlay && this.pauseOverlay.parent) {
      this.pauseOverlay.parent.removeChild(this.pauseOverlay);
    }
  }

  setPauseOverlayPosition(x, y) {
    this.pauseOverlayX = x;
    this.pauseOverlayY = y;
    if (this.pauseOverlay) {
      this.pauseOverlay.x = x;
      this.pauseOverlay.y = y;
    }
  }

  // Show new high score celebration
  showNewRecord() {
    const txt = new PIXI.Text('NEW RECORD!', new PIXI.TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 18,
      fontWeight: 'bold',
      fill: [0xFFDD00, 0xFF8800],
      fillGradientType: 1,
      stroke: 0x000000,
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: 0xFFAA00,
      dropShadowBlur: 8,
      dropShadowDistance: 0,
    }));
    txt.anchor.set(0.5);
    txt.x = this.panelW / 2;
    txt.y = 240;
    this.leftPanel.addChild(txt);
    let life = 3.0;
    const ticker = (delta) => {
      life -= delta / 60;
      txt.alpha = Math.min(1, life);
      txt.y -= 0.2;
      if (life <= 0) {
        this.app.ticker.remove(ticker);
        if (txt.parent) txt.parent.removeChild(txt);
        txt.destroy();
      }
    };
    this.app.ticker.add(ticker);
  }
}
