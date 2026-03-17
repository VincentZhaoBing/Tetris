/**
 * effects.js - All special effects: particles, explosions, screen shake,
 *              shockwaves, scan lines, fireworks, combo text, etc.
 */

import { CELL_SIZE, lightenColor } from './renderer.js';
import { BOARD_COLS, BOARD_ROWS, HIDDEN_ROWS } from './board.js';

// ── Utility ──────────────────────────────────────────────────────────────────

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

// Rainbow color sequence
const RAINBOW = [0xFF0000, 0xFF7700, 0xFFFF00, 0x00FF00, 0x00FFFF, 0x0077FF, 0xAA00FF, 0xFF00AA];

// ── EffectsManager ───────────────────────────────────────────────────────────

export class EffectsManager {
  /**
   * @param {PIXI.Application} app
   * @param {PIXI.Container} boardContainer  – the container that holds the board (for shake)
   * @param {PIXI.Container} effectsLayer    – overlay container for effects
   * @param {PIXI.Container} uiLayer         – top-level UI container for text popups
   */
  constructor(app, boardContainer, effectsLayer, uiLayer) {
    this.app = app;
    this.boardContainer = boardContainer;
    this.effectsLayer = effectsLayer;
    this.uiLayer = uiLayer;

    // Active effect particles / objects
    this.particles = [];
    this.shockwaves = [];
    this.scanLines = [];
    this.debris = [];
    this.fireworks = [];
    this.textPopups = [];
    this.comboDisplay = null;

    // Screen shake state
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.boardOriginX = boardContainer.x;
    this.boardOriginY = boardContainer.y;

    // Register ticker update
    this.app.ticker.add(this.update, this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Trigger full line-clear effects
   * @param {number[]} rows  Board row indices (including hidden offset) that were cleared
   * @param {number} count   Number of rows cleared (1-4)
   * @param {number} combo   Current combo count
   */
  triggerLineClear(rows, count, combo) {
    // Board pixel Y positions for each cleared row (adjusted for hidden rows)
    const rowYs = rows.map(r => (r - HIDDEN_ROWS) * CELL_SIZE + CELL_SIZE / 2);

    // 1. Particle storm per row
    rows.forEach(r => {
      const y = (r - HIDDEN_ROWS) * CELL_SIZE + CELL_SIZE / 2;
      this.spawnRowParticles(y, count);
    });

    // 2. Shockwave rings
    rowYs.forEach(y => this.spawnShockwave(BOARD_COLS * CELL_SIZE / 2, y, count));

    // 3. Scan line flash
    rowYs.forEach(y => this.spawnScanLine(y));

    // 4. Screen shake
    const shakeMag = [0, 4, 7, 10, 16][Math.min(count, 4)];
    this.startShake(shakeMag, 0.4 + count * 0.1);

    // 5. Combo text
    if (combo > 1) this.showComboText(combo);

    // 6. Clear-count text
    this.showClearText(count, rows);

    // 7. Tetris: full rainbow fireworks
    if (count >= 4) {
      this.triggerTetrisFireworks();
    }
  }

  /**
   * Trigger hard-drop impact effects
   */
  triggerHardDrop(piece, landY) {
    const cx = (piece.x + piece.getMatrix()[0].length / 2) * CELL_SIZE;
    const cy = (landY - HIDDEN_ROWS) * CELL_SIZE;
    this.spawnShockwave(cx, cy, 1, 0xFFFFFF, 60);
    this.startShake(3, 0.15);
  }

  /**
   * Trigger level-up celebration
   */
  triggerLevelUp(level) {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.spawnFireworkBurst(
        randBetween(40, BOARD_COLS * CELL_SIZE - 40),
        randBetween(40, 200)
      ), i * 200);
    }
    this.showFloatingText(`LEVEL ${level}!`, BOARD_COLS * CELL_SIZE / 2, 100, 0x00FFFF, 2.5);
  }

  /**
   * Update all active effects (called every frame)
   */
  update(delta) {
    const dt = delta / 60; // seconds
    this.updateShake(dt);
    this.updateParticles(delta);
    this.updateShockwaves(delta);
    this.updateScanLines(delta);
    this.updateFireworks(delta);
    this.updateTextPopups(delta);
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
    this.effectsLayer.removeChildren();
    this.uiLayer.removeChildren();
  }

  // ── Screen Shake ────────────────────────────────────────────────────────────

  startShake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  updateShake(dt) {
    if (this.shakeTime <= 0) {
      this.boardContainer.x = this.boardOriginX;
      this.boardContainer.y = this.boardOriginY;
      return;
    }
    this.shakeTime -= dt;
    const mag = this.shakeIntensity * (this.shakeTime > 0 ? this.shakeTime / 0.5 : 0);
    this.boardContainer.x = this.boardOriginX + randBetween(-mag, mag);
    this.boardContainer.y = this.boardOriginY + randBetween(-mag, mag);
    if (this.shakeTime <= 0) {
      this.boardContainer.x = this.boardOriginX;
      this.boardContainer.y = this.boardOriginY;
      this.shakeIntensity = 0;
    }
  }

  // ── Particles ───────────────────────────────────────────────────────────────

  spawnRowParticles(centerY, clearCount) {
    const count = randInt(20, 40) * clearCount;
    for (let i = 0; i < count; i++) {
      const x = randBetween(0, BOARD_COLS * CELL_SIZE);
      const color = RAINBOW[randInt(0, RAINBOW.length - 1)];
      const gfx = new PIXI.Graphics();
      const size = randBetween(2, 5);
      gfx.beginFill(color);
      gfx.drawRect(-size / 2, -size / 2, size, size);
      gfx.endFill();
      gfx.x = x;
      gfx.y = centerY;
      this.effectsLayer.addChild(gfx);

      const angle = randBetween(0, Math.PI * 2);
      const speed = randBetween(2, 7) * (1 + clearCount * 0.3);
      this.particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randBetween(1, 3),
        gravity: randBetween(0.15, 0.35),
        rot: randBetween(-0.2, 0.2),
        life: 1.0,
        decay: randBetween(0.015, 0.04)
      });
    }
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.gfx.x += p.vx * delta;
      p.gfx.y += p.vy * delta;
      p.vy += p.gravity * delta;
      p.gfx.rotation += p.rot * delta;
      p.life -= p.decay * delta;
      p.gfx.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        this.effectsLayer.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // ── Shockwave Rings ─────────────────────────────────────────────────────────

  spawnShockwave(cx, cy, clearCount, color = 0xFFFFFF, maxRadius = 80) {
    const gfx = new PIXI.Graphics();
    gfx.x = cx;
    gfx.y = cy;
    this.effectsLayer.addChild(gfx);
    this.shockwaves.push({
      gfx,
      radius: 5,
      maxRadius: maxRadius + clearCount * 20,
      color,
      life: 1.0,
      speed: 4 + clearCount * 1.5
    });
  }

  updateShockwaves(delta) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.speed * delta;
      s.life = 1 - s.radius / s.maxRadius;
      s.gfx.clear();
      if (s.life > 0) {
        s.gfx.lineStyle(3 * s.life, s.color, s.life);
        s.gfx.drawCircle(0, 0, s.radius);
      }
      if (s.life <= 0 || s.radius >= s.maxRadius) {
        this.effectsLayer.removeChild(s.gfx);
        s.gfx.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  // ── Scan Line Flash ─────────────────────────────────────────────────────────

  spawnScanLine(y) {
    const gfx = new PIXI.Graphics();
    const w = BOARD_COLS * CELL_SIZE;
    gfx.beginFill(0xFFFFFF, 1.0);
    gfx.drawRect(0, -3, w, 6);
    gfx.endFill();
    gfx.x = 0;
    gfx.y = y;
    this.effectsLayer.addChild(gfx);
    // Add bloom filter if available
    if (PIXI.filters && PIXI.filters.BloomFilter) {
      gfx.filters = [new PIXI.filters.BloomFilter(4)];
    }
    this.scanLines.push({ gfx, life: 1.0, decay: 0.04 });
  }

  updateScanLines(delta) {
    for (let i = this.scanLines.length - 1; i >= 0; i--) {
      const s = this.scanLines[i];
      s.life -= s.decay * delta;
      s.gfx.alpha = Math.max(0, s.life);
      if (s.life <= 0) {
        this.effectsLayer.removeChild(s.gfx);
        s.gfx.destroy();
        this.scanLines.splice(i, 1);
      }
    }
  }

  // ── Fireworks ───────────────────────────────────────────────────────────────

  triggerTetrisFireworks() {
    // Full screen flash
    this.flashScreen(0xFFFFFF, 0.7, 0.3);

    // Rainbow fireworks rain
    const totalBursts = 14;
    for (let i = 0; i < totalBursts; i++) {
      setTimeout(() => {
        this.spawnFireworkBurst(
          randBetween(20, BOARD_COLS * CELL_SIZE - 20),
          randBetween(30, 250)
        );
      }, i * 180);
    }
  }

  spawnFireworkBurst(cx, cy) {
    const color = RAINBOW[randInt(0, RAINBOW.length - 1)];
    const sparkCount = randInt(20, 35);
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + randBetween(-0.3, 0.3);
      const speed = randBetween(3, 8);
      const gfx = new PIXI.Graphics();
      gfx.beginFill(color);
      gfx.drawCircle(0, 0, randBetween(1.5, 3));
      gfx.endFill();
      gfx.x = cx;
      gfx.y = cy;
      this.effectsLayer.addChild(gfx);
      this.fireworks.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.12,
        life: 1.0,
        decay: randBetween(0.012, 0.025)
      });
    }
    // Trail trail sparks
    const trailColor = lightenColor(color, 0.3);
    for (let i = 0; i < 8; i++) {
      const angle = randBetween(0, Math.PI * 2);
      const speed = randBetween(0.5, 2);
      const gfx = new PIXI.Graphics();
      gfx.beginFill(trailColor);
      gfx.drawRect(-1, -3, 2, 6);
      gfx.endFill();
      gfx.x = cx;
      gfx.y = cy;
      this.effectsLayer.addChild(gfx);
      this.fireworks.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.08,
        life: 1.0,
        decay: 0.018
      });
    }
  }

  updateFireworks(delta) {
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      f.gfx.x += f.vx * delta;
      f.gfx.y += f.vy * delta;
      f.vy += f.gravity * delta;
      f.life -= f.decay * delta;
      f.gfx.alpha = Math.max(0, f.life);
      if (f.life <= 0) {
        this.effectsLayer.removeChild(f.gfx);
        f.gfx.destroy();
        this.fireworks.splice(i, 1);
      }
    }
  }

  // ── Screen Flash ─────────────────────────────────────────────────────────────

  flashScreen(color, maxAlpha, duration) {
    const gfx = new PIXI.Graphics();
    gfx.beginFill(color, 1);
    gfx.drawRect(0, 0, BOARD_COLS * CELL_SIZE, (BOARD_ROWS + 2) * CELL_SIZE);
    gfx.endFill();
    gfx.alpha = 0;
    this.effectsLayer.addChild(gfx);

    let elapsed = 0;
    const ticker = (delta) => {
      elapsed += delta / 60;
      const t = elapsed / duration;
      if (t < 0.3) {
        gfx.alpha = (t / 0.3) * maxAlpha;
      } else {
        gfx.alpha = maxAlpha * (1 - (t - 0.3) / 0.7);
      }
      if (t >= 1) {
        this.app.ticker.remove(ticker);
        this.effectsLayer.removeChild(gfx);
        gfx.destroy();
      }
    };
    this.app.ticker.add(ticker);
  }

  // ── Text Popups ─────────────────────────────────────────────────────────────

  showClearText(count, rows) {
    const labels = ['', 'NICE!', 'DOUBLE!', 'TRIPLE!', 'TETRIS!!'];
    const colors = [0, 0xFFFFFF, 0xFFDD00, 0xFF7700, 0xFF00FF];
    const sizes  = [0, 28, 34, 40, 52];
    const label = labels[Math.min(count, 4)];
    if (!label) return;

    const cx = BOARD_COLS * CELL_SIZE / 2;
    const rowMid = rows[Math.floor(rows.length / 2)];
    const cy = (rowMid - HIDDEN_ROWS) * CELL_SIZE;

    this.showFloatingText(label, cx, cy, colors[count] || 0xFFFFFF, 1.5, sizes[count] || 28);
  }

  showComboText(combo) {
    const cx = BOARD_COLS * CELL_SIZE / 2;
    const color = RAINBOW[combo % RAINBOW.length];
    this.showFloatingText(`${combo}x COMBO!`, cx, 60, color, 1.5, 24);
  }

  showFloatingText(text, cx, cy, color = 0xFFFFFF, duration = 1.5, fontSize = 28) {
    const style = new PIXI.TextStyle({
      fontFamily: '"Courier New", Courier, monospace',
      fontSize,
      fontWeight: 'bold',
      fill: [color, lightenColor(color, 0.4)],
      fillGradientType: 1,
      stroke: 0x000000,
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: color,
      dropShadowBlur: 8,
      dropShadowDistance: 0,
      align: 'center'
    });
    const t = new PIXI.Text(text, style);
    t.anchor.set(0.5);
    t.x = cx;
    t.y = cy;
    t.alpha = 0;
    t.scale.set(0.5);
    this.effectsLayer.addChild(t);
    this.textPopups.push({ t, duration, elapsed: 0 });
  }

  updateTextPopups(delta) {
    for (let i = this.textPopups.length - 1; i >= 0; i--) {
      const p = this.textPopups[i];
      p.elapsed += delta / 60;
      const progress = p.elapsed / p.duration;
      if (progress < 0.2) {
        // Pop in
        const t2 = progress / 0.2;
        p.t.alpha = t2;
        p.t.scale.set(0.5 + t2 * 0.7);
      } else if (progress < 0.7) {
        // Hold
        p.t.alpha = 1;
        p.t.scale.set(1.2);
        // Float up
        p.t.y -= 0.5 * delta;
      } else {
        // Fade out
        const t2 = (progress - 0.7) / 0.3;
        p.t.alpha = 1 - t2;
        p.t.y -= 0.3 * delta;
      }
      if (progress >= 1) {
        this.effectsLayer.removeChild(p.t);
        p.t.destroy();
        this.textPopups.splice(i, 1);
      }
    }
  }

  // Update origin when board moves
  updateBoardOrigin(x, y) {
    this.boardOriginX = x;
    this.boardOriginY = y;
  }
}
