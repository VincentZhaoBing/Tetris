/**
 * board.js - Game board (grid) management
 * Handles the 10x20 Tetris grid, collision detection, line clearing
 */

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
// Extra hidden rows at top for piece spawning
export const HIDDEN_ROWS = 2;

export class Board {
  constructor() {
    // grid[row][col] = 0 (empty) or color number (filled)
    this.grid = this.createEmptyGrid();
  }

  createEmptyGrid() {
    return Array.from({ length: BOARD_ROWS + HIDDEN_ROWS }, () =>
      new Array(BOARD_COLS).fill(0)
    );
  }

  reset() {
    this.grid = this.createEmptyGrid();
  }

  // Check if a piece at (px, py) with given matrix collides with the board
  isColliding(matrix, px, py) {
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (!matrix[row][col]) continue;
        const boardCol = px + col;
        const boardRow = py + row;
        // Out of bounds (sides and bottom)
        if (boardCol < 0 || boardCol >= BOARD_COLS || boardRow >= BOARD_ROWS + HIDDEN_ROWS) {
          return true;
        }
        // Already filled cell (ignore above the top)
        if (boardRow >= 0 && this.grid[boardRow][boardCol]) {
          return true;
        }
      }
    }
    return false;
  }

  // Lock a piece into the board
  lockPiece(piece) {
    const matrix = piece.getMatrix();
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (!matrix[row][col]) continue;
        const boardRow = piece.y + row;
        const boardCol = piece.x + col;
        if (boardRow >= 0 && boardRow < BOARD_ROWS + HIDDEN_ROWS &&
            boardCol >= 0 && boardCol < BOARD_COLS) {
          this.grid[boardRow][boardCol] = piece.color;
        }
      }
    }
  }

  // Find all full rows
  getFullRows() {
    const fullRows = [];
    for (let row = 0; row < BOARD_ROWS + HIDDEN_ROWS; row++) {
      if (this.grid[row].every(cell => cell !== 0)) {
        fullRows.push(row);
      }
    }
    return fullRows;
  }

  // Clear specific rows and shift everything down
  // Returns number of rows cleared
  clearRows(rows) {
    if (rows.length === 0) return 0;
    // Remove the full rows
    for (const row of rows) {
      this.grid.splice(row, 1);
    }
    // Add empty rows at the top
    for (let i = 0; i < rows.length; i++) {
      this.grid.unshift(new Array(BOARD_COLS).fill(0));
    }
    return rows.length;
  }

  // Get the ghost piece Y position (where piece would land)
  getGhostY(piece) {
    let ghostY = piece.y;
    const matrix = piece.getMatrix();
    while (!this.isColliding(matrix, piece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }

  // Check if any cells are in the hidden rows (game over condition)
  isTopOut() {
    for (let row = 0; row < HIDDEN_ROWS; row++) {
      if (this.grid[row].some(cell => cell !== 0)) {
        return true;
      }
    }
    return false;
  }

  // Get cells in a specific row (for effects)
  getRowCells(row) {
    if (row < 0 || row >= this.grid.length) return [];
    return this.grid[row].map((color, col) => ({ col, color })).filter(c => c.color !== 0);
  }
}
