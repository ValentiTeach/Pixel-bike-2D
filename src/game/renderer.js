// Рендер виду збоку в canvas 320×180. Шари (ззаду наперед):
// небо → паралакс-шари (хмари, гори, місто, дерева) → декор на землі → земля з травою →
// небезпечні смуги → ворота старту/фінішу → перешкоди і бонуси → велосипедист →
// частинки → погода → темрява/світло → тексти → спалах.
import { VIEW_W, VIEW_H, GROUND_TILE_W, GROUND_TILE_H, LAYER_W, PLAYER_HITBOX } from './constants.js';
import { getSprite, getBikeFrame, getShadow } from './sprites.js';
import { BIKE_FRAMES } from './bikeSprite.js';
import { createRng, hashString } from './rng.js';
import { drawPixelText } from './font.js';

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const SHADOW = 'rgba(10, 6, 20, 0.3)';
const LIGHT_SCALE = 0.5; // світло рахуємо в половинній роздільності — «піксельні» відблиски

export class Renderer {
  constructor(canvas, location, skin) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.location = location;
    this.skin = skin;
    this.shakeEnabled = true;
    const rng = createRng(hashString(location.id));

    this.sky = makeCanvas(VIEW_W, VIEW_H);
    location.paintSky(this.sky.getContext('2d'), VIEW_W, VIEW_H, rng);
    this.layers = location.layers.map((l) => {
      const c = makeCanvas(LAYER_W, VIEW_H);
      l.paint(c.getContext('2d'), rng, LAYER_W, VIEW_H);
      return { canvas: c, factor: l.factor };
    });
    this.ground = makeCanvas(GROUND_TILE_W, GROUND_TILE_H);
    location.paintGround(this.ground.getContext('2d'), rng, GROUND_TILE_W, GROUND_TILE_H);
    this.light = location.darkness ? makeCanvas(VIEW_W * LIGHT_SCALE, VIEW_H * LIGHT_SCALE) : null;
  }

  render(world) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sky, 0, 0);

    const cam = Math.round(world.camX);
    for (const l of this.layers) {
      const off = -(((Math.round(cam * l.factor) % LAYER_W) + LAYER_W) % LAYER_W);
      ctx.drawImage(l.canvas, off, 0);
      ctx.drawImage(l.canvas, off + LAYER_W, 0);
    }
    this.location.animate?.(ctx, world.time, cam);

    let sx = 0;
    let sy = 0;
    if (this.shakeEnabled && world.shake > 0.4) {
      sx = Math.round((Math.random() * 2 - 1) * world.shake);
      sy = Math.round((Math.random() * 2 - 1) * world.shake);
    }
    ctx.save();
    ctx.translate(sx - cam, sy);

    const visible = (e) => e.x + e.w > cam - 20 && e.x < cam + VIEW_W + 20;
    for (const e of world.entities) if (e.kind === 'decor' && visible(e)) this.drawEntity(e, world.time, false);
    this.drawGround(world, cam);
    for (const e of world.entities) if (e.kind === 'hazard' && visible(e)) this.drawEntity(e, world.time, false);
    for (const e of world.entities) if (e.kind === 'gate') this.drawGate(world, e, 'back');
    for (const e of world.entities) {
      if ((e.kind === 'obstacle' || e.kind === 'pickup') && visible(e)) this.drawEntity(e, world.time, true);
    }
    this.drawPlayer(world);
    for (const e of world.entities) if (e.kind === 'gate') this.drawGate(world, e, 'front');

    this.drawParticles(world.particles);
    for (const t of world.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      drawPixelText(ctx, t.text, t.x, t.y, t.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawWeather(world.weather);
    if (this.light) this.drawDarkness(world, cam);

    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 90, ${Math.min(0.45, world.flash * 1.8)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  // Земля: текстура, «прив'язана» до світових координат, + бічні стінки уступів і ям.
  drawGround(world, cam) {
    const ctx = this.ctx;
    const T = GROUND_TILE_W;
    const edge = this.location.edge;
    const segs = world.segments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.x1 < cam - 4 || s.x0 > cam + VIEW_W + 4) continue;
      const depth = VIEW_H - s.top;
      for (let wx = Math.floor(s.x0 / T) * T; wx < s.x1; wx += T) {
        const a = Math.max(s.x0, wx);
        const b = Math.min(s.x1, wx + T);
        if (b <= a) continue;
        ctx.drawImage(this.ground, a - wx, 0, b - a, Math.min(depth, GROUND_TILE_H), a, s.top, b - a, Math.min(depth, GROUND_TILE_H));
      }
      // бічні стінки: там, де сусід нижче або яма
      const prev = segs[i - 1];
      const next = segs[i + 1];
      const leftOpen = !prev || prev.x1 < s.x0 || prev.top > s.top;
      const rightOpen = !next || next.x0 > s.x1 || next.top > s.top;
      if (leftOpen) this.drawEdge(s.x0, s.top, prev && prev.x1 === s.x0 ? prev.top : VIEW_H, edge, -1);
      if (rightOpen) this.drawEdge(s.x1 - 2, s.top, next && next.x0 === s.x1 ? next.top : VIEW_H, edge, 1);
    }
  }

  drawEdge(x, top, bottom, color, side) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x, top + 3, 2, bottom - top - 3);
    // затінений кут поверхні
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(side < 0 ? x : x + 1, top + 1, 1, 2);
  }

  drawGate(world, e, layer) {
    const ctx = this.ctx;
    const top = world.groundAt(e.x) ?? world.groundAt(e.x - 4) ?? 150;
    const x = Math.round(e.x);
    if (layer === 'back') {
      // задній стовп і банер
      ctx.fillStyle = '#9a9aaa';
      ctx.fillRect(x + 6, top - 42, 2, 42);
      if (e.style === 'finish') {
        for (let by = 0; by < 6; by++) {
          for (let bx = 0; bx < 10; bx++) {
            ctx.fillStyle = (bx + by) % 2 ? '#ffffff' : '#1d1b26';
            ctx.fillRect(x - 1 + bx, top - 44 + by, 1, 1);
          }
        }
      }
      // лінія на землі
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#1d1b26';
        ctx.fillRect(x + i, top, 1, 3);
      }
      return;
    }
    ctx.fillStyle = '#d0d0e0';
    ctx.fillRect(x, top - 44, 2, 44);
    ctx.fillStyle = e.style === 'finish' ? '#ff4d5e' : '#7ed957';
    ctx.fillRect(x + 2, top - 44, 8, 5);
    ctx.fillRect(x + 2, top - 39, 5, 2);
  }

  drawEntity(e, t, withShadow) {
    const ctx = this.ctx;
    let frame = 0;
    if (e.frames > 1) frame = Math.floor(e.anim * (e.T?.fps ?? 6)) % e.frames;
    let dy = e.dy || 0;
    if (e.kind === 'pickup') dy = Math.sin(t * 4 + e.id) * 1.5;
    const x = Math.round(e.x);
    const y = Math.round(e.y + dy);
    const img = getSprite(e.sprite, { frame, flip: e.flip });

    if (withShadow && e.kind === 'obstacle' && e.T.behavior !== 'fly') {
      if (e.dy) {
        const sh = getShadow(Math.max(4, e.w - 2));
        ctx.drawImage(sh, x + 1, Math.round(e.y + e.h - sh.height / 2));
      } else {
        ctx.drawImage(getSprite(e.sprite, { frame, flip: e.flip, silhouette: SHADOW }), x + 2, y + 1);
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
    if (p.y > 200) return;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const frame = Math.floor(p.pedal) % BIKE_FRAMES;

    // тінь на землі під велосипедом
    const ground = world.surfaceUnder(p.x + PLAYER_HITBOX.l, p.x + p.w - PLAYER_HITBOX.r);
    if (ground !== null) {
      const h = ground - (p.y + p.h);
      const w = Math.max(6, Math.round(18 - Math.max(0, h) / 4));
      ctx.drawImage(getShadow(w), Math.round(p.x + p.w / 2 - w / 2), ground - 2);
    }

    const img = getBikeFrame(this.skin, frame);
    if (world.phase === 'crash' || (world.phase === 'over' && world.result && !world.result.completed)) {
      ctx.save();
      ctx.translate(x + p.w / 2, y + p.h / 2);
      ctx.rotate(Math.min(p.spin, Math.PI * 1.5));
      ctx.drawImage(img, -p.w / 2, -p.h / 2);
      ctx.restore();
      return;
    }
    const blink = world.invuln > 0 && Math.floor(world.invuln * 14) % 2 === 0;
    if (!blink) {
      if (!p.onGround && p.vy < -60) {
        // у стрибку — «заднє колесо вниз» на 1 піксель для відчуття руху
        ctx.drawImage(img, 0, 0, 13, p.h, x, y + 1, 13, p.h);
        ctx.drawImage(img, 13, 0, p.w - 13, p.h, x + 13, y, p.w - 13, p.h);
      } else ctx.drawImage(img, x, y);
    }
    if (world.shield > 0) {
      const ending = world.shield < 1.5;
      if (!ending || Math.floor(world.time * 10) % 2 === 0) {
        ctx.globalAlpha = 0.65 + 0.25 * Math.sin(world.time * 8);
        ctx.drawImage(getSprite('shieldRing'), x - 3, y - 5);
        ctx.globalAlpha = 1;
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
      ctx.fillStyle = 'rgba(160, 180, 255, 0.5)';
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
  drawDarkness(world, cam) {
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
    const hx = p.x - cam + p.w - 3;
    const hy = p.y + 7;
    if (world.phase !== 'crash' && p.y < VIEW_H) {
      // фара — промінь уперед
      const g = lc.createLinearGradient(hx * S, 0, (hx + 150) * S, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.moveTo(hx * S, (hy - 2) * S);
      lc.lineTo((hx + 150) * S, (hy - 30) * S);
      lc.lineTo((hx + 150) * S, (hy + 40) * S);
      lc.lineTo(hx * S, (hy + 2) * S);
      lc.closePath();
      lc.fill();
      hole(p.x - cam + p.w / 2, p.y + p.h / 2, 26, 0.8);
    }

    const glows = [];
    for (const e of world.entities) {
      const L = e.light ?? e.T?.light;
      if (!L) continue;
      const lx = e.x - cam + (L.dx ?? e.w / 2);
      if (lx < -50 || lx > VIEW_W + 50) continue;
      const ly = e.y + (L.dy ?? e.h / 2);
      hole(lx, ly + L.r * 0.4, L.r);
      glows.push({ x: lx, y: ly, r: L.r, color: L.color });
    }
    ctx.drawImage(this.light, 0, 0, VIEW_W, VIEW_H);

    ctx.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      const g = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      g.addColorStop(0, `rgba(${gl.color}, 0.25)`);
      g.addColorStop(1, `rgba(${gl.color}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
