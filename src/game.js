/**
 * game.js - Main game logic, state management, input handling, game loop
 */

import { Board, BOARD_COLS, BOARD_ROWS, HIDDEN_ROWS } from './board.js';
import { Piece, PieceBag, PIECES } from './piece.js';
import { Renderer, CELL_SIZE } from './renderer.js';
import { EffectsManager } from './effects.js';
import { UI } from './ui.js';

// ── Scoring table ────────────────────────────────────────────────────────────
const SCORE_TABLE = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;

// ── Drop speed (ms per row) by level ────────────────────────────────────────
function dropInterval(level) {
  // Faster as level increases; floor at 50ms
  return Math.max(50, 800 - (level - 1) * 70);
}

// ── Game states ───────────────────────────────────────────────────────────────
const STATE = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

export class Game {
  /**
   * @param {PIXI.Application} app
   * @param {PIXI.Container} boardContainer   – positioned over the board area
   * @param {PIXI.Container} effectsLayer     – overlay for effects
   * @param {PIXI.Container} leftPanel
   * @param {PIXI.Container} rightPanel
   * @param {PIXI.Container} uiLayer          – top-most UI layer
   */
  constructor(app, boardContainer, effectsLayer, leftPanel, rightPanel, uiLayer) {
    this.app = app;
    this.boardContainer = boardContainer;
    this.effectsLayer = effectsLayer;
    this.leftPanel = leftPanel;
    this.rightPanel = rightPanel;
    this.uiLayer = uiLayer;

    // Core objects
    this.board = new Board();
    this.bag = new PieceBag();
    this.renderer = new Renderer(app, boardContainer);
    this.effects = new EffectsManager(app, boardContainer, effectsLayer, uiLayer);
    this.ui = new UI(app, leftPanel, rightPanel, this.renderer);

    // Game state
    this.state = STATE.IDLE;
    this.currentPiece = null;
    this.holdType = null;
    this.holdUsed = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('tetris_hs') || '0', 10);
    this.level = 1;
    this.lines = 0;
    this.combo = 0;

    // Timing
    this.dropTimer = 0;
    this.softDrop = false;
    this.lockDelay = 500;  // ms before locking a grounded piece
    this.lockTimer = 0;
    this.isGrounded = false;

    // Input tracking
    this.keys = {};
    this.dasTimer = 0;        // Delayed Auto Shift
    this.dasDelay = 160;      // ms before DAS kicks in
    this.dasInterval = 50;    // ms between DAS moves
    this.dasDirection = 0;    // -1 left, 1 right

    // Update the UI with initial high score
    this.ui.setHighScore(this.highScore);

    // Register game loop
    this.app.ticker.add(this.update, this);

    // Bind keyboard events
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp   = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  start() {
    this.board.reset();
    this.bag = new PieceBag();
    this.holdType = null;
    this.holdUsed = false;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.combo = 0;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.isGrounded = false;

    this.ui.setScore(0);
    this.ui.setLevel(1);
    this.ui.setLines(0);
    this.ui.setHoldPiece(null, false);

    this.spawnPiece();
    this.state = STATE.PLAYING;
    this.hideGameOver();
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.ui.showPause(true);
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.ui.showPause(false);
    }
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.effects.destroy();
    this.ui.destroy();
  }

  // ── Game Loop ────────────────────────────────────────────────────────────────

  update(delta) {
    if (this.state !== STATE.PLAYING) return;

    const dtMs = (delta / 60) * 1000;

    // DAS (Delayed Auto Shift) for left/right movement
    this.updateDAS(dtMs);

    // Drop timer
    const interval = this.softDrop ? Math.min(50, dropInterval(this.level) / 8) : dropInterval(this.level);
    this.dropTimer += dtMs;
    if (this.dropTimer >= interval) {
      this.dropTimer = 0;
      this.moveDown();
    }

    // Lock delay when piece is grounded
    if (this.isGrounded) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= this.lockDelay) {
        this.lockPiece();
      }
    }

    // Render
    this.renderFrame();
  }

  renderFrame() {
    this.renderer.renderBoard(this.board);
    if (this.currentPiece) {
      this.renderer.renderGhost(this.currentPiece, this.board);
      this.renderer.renderPiece(this.currentPiece);
    }
  }

  // ── Piece Spawning ──────────────────────────────────────────────────────────

  spawnPiece() {
    const type = this.bag.next();
    this.currentPiece = new Piece(type);
    this.spawnPosition(this.currentPiece);

    // Update next preview
    const nextTypes = this.bag.preview(3);
    this.ui.setNextPieces(nextTypes);

    this.isGrounded = false;
    this.lockTimer = 0;

    // Check game over (new piece already collides)
    if (this.board.isColliding(this.currentPiece.getMatrix(), this.currentPiece.x, this.currentPiece.y)) {
      this.gameOver();
    }
  }

  spawnPosition(piece) {
    const matrix = piece.getMatrix();
    piece.x = Math.floor((BOARD_COLS - matrix[0].length) / 2);
    piece.y = 0; // In hidden rows
  }

  // ── Piece Movement ──────────────────────────────────────────────────────────

  moveLeft() {
    if (!this.currentPiece || this.state !== STATE.PLAYING) return;
    const p = this.currentPiece;
    if (!this.board.isColliding(p.getMatrix(), p.x - 1, p.y)) {
      p.x--;
      this.resetLockDelayOnMove();
    }
  }

  moveRight() {
    if (!this.currentPiece || this.state !== STATE.PLAYING) return;
    const p = this.currentPiece;
    if (!this.board.isColliding(p.getMatrix(), p.x + 1, p.y)) {
      p.x++;
      this.resetLockDelayOnMove();
    }
  }

  moveDown() {
    if (!this.currentPiece) return;
    const p = this.currentPiece;
    if (!this.board.isColliding(p.getMatrix(), p.x, p.y + 1)) {
      p.y++;
      this.isGrounded = false;
      this.lockTimer = 0;
    } else {
      // Hit the ground
      if (!this.isGrounded) {
        this.isGrounded = true;
        this.lockTimer = 0;
      }
    }
  }

  hardDrop() {
    if (!this.currentPiece || this.state !== STATE.PLAYING) return;
    const p = this.currentPiece;
    const ghostY = this.board.getGhostY(p);
    const dropDist = ghostY - p.y;
    p.y = ghostY;
    // Bonus score: 2 per row hard-dropped
    this.addScore(dropDist * 2);
    // Impact effect
    this.effects.triggerHardDrop(p, ghostY);
    this.lockPiece();
  }

  rotate(dir = 1) {
    if (!this.currentPiece || this.state !== STATE.PLAYING) return;
    const p = this.currentPiece;
    const newRot = p.getRotated(dir);
    const newMatrix = p.data.rotations[newRot];
    const kicks = p.getWallKicks(p.rotation, newRot);

    for (const [dx, dy] of kicks) {
      if (!this.board.isColliding(newMatrix, p.x + dx, p.y - dy)) {
        p.rotation = newRot;
        p.x += dx;
        p.y -= dy;
        this.resetLockDelayOnMove();
        return;
      }
    }
  }

  holdPiece() {
    if (!this.currentPiece || this.holdUsed || this.state !== STATE.PLAYING) return;
    const currentType = this.currentPiece.type;
    if (this.holdType) {
      // Swap current with hold
      this.currentPiece = new Piece(this.holdType);
      this.spawnPosition(this.currentPiece);
    } else {
      // Put in hold, spawn next
      this.spawnPiece();
    }
    this.holdType = currentType;
    this.holdUsed = true;
    this.ui.setHoldPiece(this.holdType, this.holdUsed);
  }

  resetLockDelayOnMove() {
    if (this.isGrounded) {
      this.lockTimer = 0;
    }
  }

  // ── Piece Locking ────────────────────────────────────────────────────────────

  lockPiece() {
    if (!this.currentPiece) return;
    this.board.lockPiece(this.currentPiece);

    // Check for full rows
    const fullRows = this.board.getFullRows();
    if (fullRows.length > 0) {
      // Trigger effects before clearing
      this.effects.triggerLineClear(fullRows, fullRows.length, this.combo + 1);

      // Clear rows
      this.board.clearRows(fullRows);

      // Update combo
      this.combo++;

      // Calculate score
      const baseScore = SCORE_TABLE[Math.min(fullRows.length, 4)] * this.level;
      const comboBonus = 50 * this.combo * this.level;
      this.addScore(baseScore + comboBonus);

      // Update lines and level
      this.lines += fullRows.length;
      const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.ui.setLevel(this.level);
        this.effects.triggerLevelUp(this.level);
      }
      this.ui.setLines(this.lines);

    } else {
      // No clear - reset combo
      this.combo = 0;
    }

    // Check game over (locked piece in hidden rows)
    if (this.board.isTopOut()) {
      this.gameOver();
      return;
    }

    // Allow hold again
    this.holdUsed = false;
    this.ui.setHoldPiece(this.holdType, this.holdUsed);

    // Spawn next piece
    this.currentPiece = null;
    this.isGrounded = false;
    this.lockTimer = 0;
    this.spawnPiece();
  }

  // ── Score ────────────────────────────────────────────────────────────────────

  addScore(amount) {
    this.score += amount;
    this.ui.setScore(this.score);
    if (this.score > this.highScore) {
      const wasRecord = this.highScore === 0 && this.score > 0;
      this.highScore = this.score;
      localStorage.setItem('tetris_hs', this.highScore.toString());
      this.ui.setHighScore(this.highScore);
      if (!wasRecord) this.ui.showNewRecord();
    }
  }

  // ── Game Over ────────────────────────────────────────────────────────────────

  gameOver() {
    this.state = STATE.GAMEOVER;
    this.currentPiece = null;
    this.renderFrame();
    this.showGameOver();
  }

  showGameOver() {
    if (this.gameOverContainer) {
      this.gameOverContainer.parent && this.gameOverContainer.parent.removeChild(this.gameOverContainer);
    }
    this.gameOverContainer = new PIXI.Container();
    const w = BOARD_COLS * CELL_SIZE;
    const h = BOARD_ROWS * CELL_SIZE;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x000011, 0.78);
    bg.drawRect(0, 0, w, h);
    bg.endFill();
    this.gameOverContainer.addChild(bg);

    const over = new PIXI.Text('GAME OVER', new PIXI.TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 34,
      fontWeight: 'bold',
      fill: [0xFF2244, 0xFF8800],
      fillGradientType: 1,
      stroke: 0x000000,
      strokeThickness: 5,
      dropShadow: true,
      dropShadowColor: 0xFF0000,
      dropShadowBlur: 14,
      dropShadowDistance: 0,
      letterSpacing: 3,
    }));
    over.anchor.set(0.5);
    over.x = w / 2; over.y = h / 2 - 60;
    this.gameOverContainer.addChild(over);

    const scoreTxt = new PIXI.Text(`SCORE: ${this.score}`, new PIXI.TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 20,
      fill: 0x00FFFF,
      letterSpacing: 2,
    }));
    scoreTxt.anchor.set(0.5);
    scoreTxt.x = w / 2; scoreTxt.y = h / 2 + 0;
    this.gameOverContainer.addChild(scoreTxt);

    // Restart hint
    const hint = new PIXI.Text('Press ENTER or R to restart', new PIXI.TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14,
      fill: 0x8899AA,
      letterSpacing: 1,
    }));
    hint.anchor.set(0.5);
    hint.x = w / 2; hint.y = h / 2 + 50;
    this.gameOverContainer.addChild(hint);

    // Blink hint
    let blink = 0;
    const blinkTicker = (delta) => {
      blink += delta / 60;
      hint.alpha = 0.5 + 0.5 * Math.sin(blink * 3);
    };
    this.app.ticker.add(blinkTicker);
    this._blinkTicker = blinkTicker;

    this.boardContainer.addChild(this.gameOverContainer);
  }

  hideGameOver() {
    if (this._blinkTicker) {
      this.app.ticker.remove(this._blinkTicker);
      this._blinkTicker = null;
    }
    if (this.gameOverContainer && this.gameOverContainer.parent) {
      this.gameOverContainer.parent.removeChild(this.gameOverContainer);
      this.gameOverContainer.destroy({ children: true });
      this.gameOverContainer = null;
    }
  }

  // ── Input Handling ───────────────────────────────────────────────────────────

  onKeyDown(e) {
    if (this.keys[e.code]) return; // Already held
    this.keys[e.code] = true;

    // Start game on first key press if idle
    if (this.state === STATE.IDLE) {
      this.start();
      return;
    }

    // Restart
    if ((e.code === 'Enter' || e.code === 'KeyR') && this.state === STATE.GAMEOVER) {
      this.start();
      return;
    }

    if (e.code === 'KeyP') {
      this.togglePause();
      return;
    }

    if (this.state !== STATE.PLAYING) return;

    switch (e.code) {
      case 'ArrowLeft':
        this.moveLeft();
        this.dasDirection = -1;
        this.dasTimer = 0;
        break;
      case 'ArrowRight':
        this.moveRight();
        this.dasDirection = 1;
        this.dasTimer = 0;
        break;
      case 'ArrowDown':
        this.softDrop = true;
        break;
      case 'ArrowUp':
      case 'KeyZ':
        this.rotate(1);
        break;
      case 'Space':
        e.preventDefault();
        this.hardDrop();
        break;
      case 'KeyC':
        this.holdPiece();
        break;
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;

    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      this.dasDirection = 0;
      this.dasTimer = 0;
    }
    if (e.code === 'ArrowDown') {
      this.softDrop = false;
      this.dropTimer = 0;
    }
  }

  updateDAS(dtMs) {
    if (this.dasDirection === 0) return;
    this.dasTimer += dtMs;
    if (this.dasTimer >= this.dasDelay) {
      const extra = this.dasTimer - this.dasDelay;
      const steps = Math.floor(extra / this.dasInterval);
      if (steps > 0) {
        for (let i = 0; i < steps; i++) {
          if (this.dasDirection === -1) this.moveLeft();
          else if (this.dasDirection === 1) this.moveRight();
        }
        this.dasTimer = this.dasDelay + (extra % this.dasInterval);
      }
    }
  }
}
