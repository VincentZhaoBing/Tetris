/**
 * renderer.js - PixiJS pseudo-3D block rendering
 * Draws 3-faced isometric blocks: top face, front face, right side face
 */

import { BOARD_COLS, BOARD_ROWS, HIDDEN_ROWS } from './board.js';

// Cell size in pixels
export const CELL_SIZE = 32;
// Pseudo-3D offsets for top/side faces
export const OFFSET_X = 6;
export const OFFSET_Y = 4;

/**
 * Lighten a hex color by factor (0-1)
 */
export function lightenColor(color, factor) {
  const r = Math.min(255, ((color >> 16) & 0xFF) + Math.round(255 * factor));
  const g = Math.min(255, ((color >> 8) & 0xFF) + Math.round(255 * factor));
  const b = Math.min(255, (color & 0xFF) + Math.round(255 * factor));
  return (r << 16) | (g << 8) | b;
}

/**
 * Darken a hex color by factor (0-1)
 */
export function darkenColor(color, factor) {
  const r = Math.max(0, ((color >> 16) & 0xFF) - Math.round(255 * factor));
  const g = Math.max(0, ((color >> 8) & 0xFF) - Math.round(255 * factor));
  const b = Math.max(0, (color & 0xFF) - Math.round(255 * factor));
  return (r << 16) | (g << 8) | b;
}

export class Renderer {
  constructor(app, boardContainer) {
    this.app = app;
    this.boardContainer = boardContainer;
    // Graphics object for the static board
    this.boardGfx = new PIXI.Graphics();
    this.boardContainer.addChild(this.boardGfx);
    // Graphics object for the active piece
    this.pieceGfx = new PIXI.Graphics();
    this.boardContainer.addChild(this.pieceGfx);
    // Graphics object for ghost piece
    this.ghostGfx = new PIXI.Graphics();
    this.boardContainer.addChild(this.ghostGfx);
    // Grid overlay
    this.gridGfx = new PIXI.Graphics();
    this.boardContainer.addChildAt(this.gridGfx, 0);

    this.drawGrid();
  }

  // Draw background grid lines (subtle cyberpunk grid)
  drawGrid() {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(0.5, 0x223344, 0.4);
    const w = BOARD_COLS * CELL_SIZE;
    const h = BOARD_ROWS * CELL_SIZE;
    for (let c = 0; c <= BOARD_COLS; c++) {
      this.gridGfx.moveTo(c * CELL_SIZE, 0);
      this.gridGfx.lineTo(c * CELL_SIZE, h);
    }
    for (let r = 0; r <= BOARD_ROWS; r++) {
      this.gridGfx.moveTo(0, r * CELL_SIZE);
      this.gridGfx.lineTo(w, r * CELL_SIZE);
    }
  }

  /**
   * Draw a single pseudo-3D block at grid position (col, row)
   * Uses pixel offset: pixelX = col * CELL_SIZE, pixelY = row * CELL_SIZE
   */
  drawBlock(gfx, col, row, color, alpha = 1.0, isGhost = false) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const cs = CELL_SIZE;
    const ox = OFFSET_X;
    const oy = OFFSET_Y;

    gfx.alpha = alpha;

    if (isGhost) {
      // Ghost: just draw outline
      gfx.lineStyle(1, color, 0.5);
      gfx.beginFill(color, 0.08);
      // Front face outline
      gfx.drawRect(x, y + oy, cs, cs - oy);
      gfx.endFill();
      // Top face outline
      gfx.lineStyle(1, color, 0.4);
      gfx.beginFill(color, 0.05);
      gfx.moveTo(x + ox, y);
      gfx.lineTo(x + cs + ox, y);
      gfx.lineTo(x + cs, y + oy);
      gfx.lineTo(x, y + oy);
      gfx.closePath();
      gfx.endFill();
      return;
    }

    const topColor = lightenColor(color, 0.30);
    const frontColor = color;
    const sideColor = darkenColor(color, 0.30);

    gfx.lineStyle(0);

    // --- Top face (parallelogram) ---
    gfx.beginFill(topColor, 1.0);
    gfx.moveTo(x + ox, y);
    gfx.lineTo(x + cs + ox, y);
    gfx.lineTo(x + cs, y + oy);
    gfx.lineTo(x, y + oy);
    gfx.closePath();
    gfx.endFill();

    // --- Front face (rectangle) ---
    gfx.beginFill(frontColor, 1.0);
    gfx.drawRect(x, y + oy, cs, cs - oy);
    gfx.endFill();

    // --- Right side face (parallelogram) ---
    gfx.beginFill(sideColor, 1.0);
    gfx.moveTo(x + cs, y + oy);
    gfx.lineTo(x + cs + ox, y);
    gfx.lineTo(x + cs + ox, y + cs);
    gfx.lineTo(x + cs, y + oy + cs - oy);
    gfx.closePath();
    gfx.endFill();

    // Subtle inner highlight on top-left edge of front face
    gfx.lineStyle(1, lightenColor(color, 0.5), 0.3);
    gfx.moveTo(x, y + oy);
    gfx.lineTo(x, y + cs);
    gfx.moveTo(x, y + oy);
    gfx.lineTo(x + cs, y + oy);
    gfx.lineStyle(0);
  }

  // Draw the locked board cells
  renderBoard(board) {
    this.boardGfx.clear();
    const grid = board.grid;
    // Only render visible rows (skip hidden rows at top)
    for (let row = HIDDEN_ROWS; row < BOARD_ROWS + HIDDEN_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        if (grid[row][col]) {
          this.drawBlock(this.boardGfx, col, row - HIDDEN_ROWS, grid[row][col]);
        }
      }
    }
  }

  // Draw the ghost piece
  renderGhost(piece, board) {
    this.ghostGfx.clear();
    const ghostY = board.getGhostY(piece);
    if (ghostY === piece.y) return; // No gap, don't draw ghost
    const matrix = piece.getMatrix();
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (!matrix[row][col]) continue;
        const boardRow = ghostY + row - HIDDEN_ROWS;
        const boardCol = piece.x + col;
        if (boardRow >= 0) {
          this.drawBlock(this.ghostGfx, boardCol, boardRow, piece.color, 1.0, true);
        }
      }
    }
  }

  // Draw the active falling piece (with glow effect)
  renderPiece(piece) {
    this.pieceGfx.clear();
    const matrix = piece.getMatrix();
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (!matrix[row][col]) continue;
        const boardRow = piece.y + row - HIDDEN_ROWS;
        const boardCol = piece.x + col;
        if (boardRow >= 0) {
          this.drawBlock(this.pieceGfx, boardCol, boardRow, piece.color);
        }
      }
    }
    // Add glow filter to active piece (if filter is available)
    if (!this.pieceGfx.filters || !this.pieceGfx.filters.length) {
      if (PIXI.filters && PIXI.filters.GlowFilter) {
        const glowFilter = new PIXI.filters.GlowFilter({
          distance: 8,
          outerStrength: 1.5,
          innerStrength: 0,
          color: 0xFFFFFF,
          quality: 0.3
        });
        this.pieceGfx.filters = [glowFilter];
      }
    }
  }

  // Draw a mini piece preview (for Next/Hold panels)
  drawMiniPiece(container, pieceType, pieceData, cellSize = 18) {
    container.removeChildren();
    const gfx = new PIXI.Graphics();
    container.addChild(gfx);

    const matrix = pieceData.rotations[0];
    const color = pieceData.color;
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Center the preview
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const startX = -totalW / 2;
    const startY = -totalH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!matrix[r][c]) continue;
        const px = startX + c * cellSize;
        const py = startY + r * cellSize;
        const ox = Math.round(OFFSET_X * cellSize / CELL_SIZE);
        const oy = Math.round(OFFSET_Y * cellSize / CELL_SIZE);
        const cs = cellSize;

        // Top face
        gfx.beginFill(lightenColor(color, 0.30));
        gfx.moveTo(px + ox, py);
        gfx.lineTo(px + cs + ox, py);
        gfx.lineTo(px + cs, py + oy);
        gfx.lineTo(px, py + oy);
        gfx.closePath();
        gfx.endFill();

        // Front face
        gfx.beginFill(color);
        gfx.drawRect(px, py + oy, cs, cs - oy);
        gfx.endFill();

        // Right side
        gfx.beginFill(darkenColor(color, 0.30));
        gfx.moveTo(px + cs, py + oy);
        gfx.lineTo(px + cs + ox, py);
        gfx.lineTo(px + cs + ox, py + cs);
        gfx.lineTo(px + cs, py + oy + cs - oy);
        gfx.closePath();
        gfx.endFill();
      }
    }
  }
}
