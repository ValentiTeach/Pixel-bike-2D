// Рендер світу в canvas 180×320. Шари (знизу вгору):
// земля → анімація землі → пласкі об'єкти (калюжі, люки, лінії) → об'єкти «з глибиною»
// (сортовані за нижнім краєм, разом із гравцем) → частинки → погода → темрява/світло → тексти → спалах.
import { VIEW_W, VIEW_H, TILE_H } from './constants.js';
import { getSprite, getBikeFrame, getCrashedBike, getShadow } from './sprites.js';
import { createRng, hashString } from './rng.js';
import { drawPixelText } from './font.js';

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const SHADOW = 'rgba(10, 6, 20, 0.35)';
const LIGHT_SCALE = 0.5; // світло рахуємо в половинній роздільності — «піксельні» відблиски

const isFlat = (e) => e.kind === 'line' || e.kind === 'hazard' || e.T?.flat || (e.kind === 'decor' && e.flat);

export class Renderer {
  constructor(canvas, location, skin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.location = location;
    this.skin = skin;
    this.ground = makeCanvas(VIEW_W, TILE_H);
    location.paintGround(this.ground.getContext('2d'), createRng(hashString(location.id)), TILE_H);
    this.light = location.darkness ? makeCanvas(VIEW_W * LIGHT_SCALE, VIEW_H * LIGHT_SCALE) : null;
    this.depth = [];
    this.shakeEnabled = true;
  }

  render(world) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    let sx = 0;
    let sy = 0;
    if (this.shakeEnabled && world.shake > 0.4) {
      sx = Math.round((Math.random() * 2 - 1) * world.shake);
      sy = Math.round((Math.random() * 2 - 1) * world.shake);
    }
    ctx.save();
    ctx.translate(sx, sy);

    const off = Math.floor(world.distance) % TILE_H;
    ctx.drawImage(this.ground, 0, off - TILE_H);
    ctx.drawImage(this.ground, 0, off);
    this.location.animate?.(ctx, world.time, world.distance);

    const depth = this.depth;
    depth.length = 0;
    for (const e of world.entities) {
      if (isFlat(e)) {
        if (e.kind === 'line') this.drawLine(e);
        else this.drawEntity(e, world.time, false);
      } else depth.push(e);
    }
    depth.push(world.player);
    depth.sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const e of depth) {
      if (e === world.player) this.drawPlayer(world);
      else this.drawEntity(e, world.time, true);
    }

    this.drawParticles(world.particles);
    this.drawWeather(world.weather);
    if (this.light) this.drawDarkness(world);

    for (const t of world.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      drawPixelText(ctx, t.text, t.x, t.y, t.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 90, ${Math.min(0.45, world.flash * 1.8)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawEntity(e, t, withShadow) {
    const ctx = this.ctx;
    let frame = 0;
    if (e.frames > 1) frame = Math.floor(e.anim * (e.T?.fps ?? 6)) % e.frames;
    let dy = 0;
    if (e.T?.hop) dy = -Math.abs(Math.sin(e.anim * 6)) * e.T.hop;
    if (e.kind === 'pickup') dy = Math.sin(t * 4 + e.id) * 1.5;
    const x = Math.round(e.x);
    const y = Math.round(e.y + dy);
    const img = getSprite(e.sprite, { frame, flip: e.flip });

    if (withShadow) {
      if (e.kind === 'pickup' || e.T?.hop) {
        const sh = getShadow(Math.max(4, e.w - 2));
        ctx.drawImage(sh, Math.round(e.x + 1), Math.round(e.y + e.h - sh.height / 2));
      } else {
        ctx.drawImage(getSprite(e.sprite, { frame, flip: e.flip, silhouette: SHADOW }), x + 1, y + 1);
      }
    }

    if (e.kind === 'pickup' && e.type === 'coin') {
      // обертання монети — стискаємо по ширині
      const k = Math.abs(Math.cos(t * 5 + e.id));
      const dw = Math.max(2, Math.round(e.w * k));
      ctx.drawImage(img, x + Math.round((e.w - dw) / 2), y, dw, e.h);
      return;
    }
    ctx.drawImage(img, x, y);
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const crashed = world.phase === 'crash' || (world.phase === 'over' && world.result && !world.result.completed);
    if (crashed) {
      const img = getCrashedBike(this.skin);
      ctx.drawImage(getShadow(img.width), x - 6, y + 14);
      ctx.drawImage(img, x - 6, y + 6);
      return;
    }
    const sh = getShadow(9);
    ctx.drawImage(sh, x + 1, y + p.h - 2);
    const blink = world.invuln > 0 && Math.floor(world.invuln * 14) % 2 === 0;
    if (!blink) {
      const lean = p.lean < -0.3 ? -1 : p.lean > 0.3 ? 1 : 0;
      const frame = Math.floor(p.pedal) % 2;
      ctx.drawImage(getBikeFrame(this.skin, lean, frame), x, y);
    }
    if (world.shield > 0) {
      const ending = world.shield < 1.5;
      if (!ending || Math.floor(world.time * 10) % 2 === 0) {
        ctx.globalAlpha = 0.65 + 0.25 * Math.sin(world.time * 8);
        ctx.drawImage(getSprite('shieldRing'), x - 5, y - 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawLine(e) {
    const ctx = this.ctx;
    const y = Math.round(e.y);
    for (let cx = 0; cx < e.w; cx += 3) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (cx / 3 + r) % 2 ? '#ffffff' : '#1d1b26';
        ctx.fillRect(e.x + cx, y + r * 3, Math.min(3, e.w - cx), 3);
      }
    }
    if (e.style === 'finish') {
      // стовпи і гірлянда з прапорців
      ctx.fillStyle = '#c9c9d9';
      ctx.fillRect(e.x - 3, y - 14, 2, 20);
      ctx.fillRect(e.x + e.w + 1, y - 14, 2, 20);
      ctx.fillStyle = '#5a5470';
      ctx.fillRect(e.x - 1, y - 13, e.w + 2, 1);
      const colors = ['#ff4d5e', '#ffd23f', '#4cd6ff', '#7ed957'];
      for (let fx = 2, i = 0; fx < e.w - 3; fx += 6, i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(e.x + fx, y - 12, 4, 2);
        ctx.fillRect(e.x + fx + 1, y - 10, 2, 2);
      }
    }
  }

  drawParticles(parts) {
    const ctx = this.ctx;
    for (const p of parts) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawWeather(w) {
    if (!w) return;
    const ctx = this.ctx;
    if (w.type === 'rain') {
      ctx.fillStyle = 'rgba(160, 180, 255, 0.55)';
      for (const p of w.parts) {
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        ctx.fillRect(x, y, 1, p.len);
        ctx.fillRect(x - 1, y + p.len, 1, 1);
      }
    } else if (w.type === 'snow') {
      ctx.fillStyle = '#ffffff';
      for (const p of w.parts) ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    } else if (w.type === 'leaves') {
      for (const p of w.parts) {
        ctx.fillStyle = p.color;
        const flip = Math.sin(p.y * 0.1 + p.phase) > 0;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), flip ? 2 : 1, flip ? 1 : 2);
      }
    } else if (w.type === 'sand') {
      ctx.globalAlpha = 0.7;
      for (const p of w.parts) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.len, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Ніч: темний шар з «вирізаними» плямами світла (фара, ліхтарі, фари машин) + кольорове сяйво.
  drawDarkness(world) {
    const ctx = this.ctx;
    const lc = this.light.getContext('2d');
    const S = LIGHT_SCALE;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.light.width, this.light.height);
    lc.fillStyle = `rgba(6, 4, 20, ${this.location.darkness})`;
    lc.fillRect(0, 0, this.light.width, this.light.height);
    lc.globalCompositeOperation = 'destination-out';

    const hole = (x, y, r, a = 1) => {
      const g = lc.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * S);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect((x - r) * S, (y - r) * S, r * 2 * S, r * 2 * S);
    };

    const p = world.player;
    const hx = p.x + p.w / 2;
    const hy = p.y + 2;
    if (world.phase !== 'crash') {
      const sway = p.lean * 18;
      const g = lc.createLinearGradient(0, hy * S, 0, (hy - 150) * S);
      g.addColorStop(0, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.moveTo((hx - 3) * S, hy * S);
      lc.lineTo((hx - 44 + sway) * S, (hy - 150) * S);
      lc.lineTo((hx + 44 + sway) * S, (hy - 150) * S);
      lc.lineTo((hx + 3) * S, hy * S);
      lc.closePath();
      lc.fill();
    }
    hole(hx, p.y + p.h / 2, 26, 0.85);

    const glows = [];
    for (const e of world.entities) {
      const L = e.light ?? e.T?.light;
      if (!L || e.y < -40 || e.y > VIEW_H + 40) continue;
      const lx = e.x + e.w / 2;
      const ly = e.y + (L.dy ?? e.h / 2);
      hole(lx, ly, L.r);
      glows.push({ x: lx, y: ly, r: L.r, color: L.color });
    }
    ctx.drawImage(this.light, 0, 0, VIEW_W, VIEW_H);

    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      const g = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      g.addColorStop(0, `rgba(${gl.color}, 0.22)`);
      g.addColorStop(1, `rgba(${gl.color}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
