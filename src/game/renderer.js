// Рендер виду збоку в canvas 320×180. Шари (ззаду наперед):
// небо → паралакс-шари (гори, ліс, місто…) з серпанком → декор → земля колонками (текстура
// покриття «йде» вздовж схилу), дерев'яні містки/кікери з опорами, вода у бродах і гепах →
// колоди, поручні, знаки, чекпоінти → монети → велосипедист → передні стовпи воріт →
// частинки → погода → темрява з фарою → затемнення при відродженні.
//
// Камера рухається і по горизонталі, і по вертикалі (траса спускається), тож паралакс-шари
// теж зсуваються вгору-вниз — далекі гори повільно, ближній ліс швидше.
import { VIEW_W, VIEW_H, GROUND_TILE_W, GROUND_TILE_H, LAYER_W, LAYER_PAD, RIDER_CANVAS, PX_PER_M as M } from './constants.js';
import { getSprite, getShadow, spriteSize } from './sprites.js';
import { drawBikeRider, shade } from './bikeSprite.js';
import { deriveBike } from './bikePhysics.js';
import { createRng, hashString } from './rng.js';
import { drawPixelText } from './font.js';
import { MAT } from './terrain.js';
import { deepColor } from './groundTextures.js';

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const LIGHT_SCALE = 0.5; // світло рахуємо в половинній роздільності — «піксельні» відблиски
const WOOD = ['#d9a568', '#b07a42', '#7a4e26'];
const POST = ['#7a5230', '#54361c'];
const hash = (x) => {
  let h = Math.imul(x | 0, 0x9e3779b1);
  h ^= h >>> 15;
  return (h >>> 0) % 1000;
};

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
      const c = makeCanvas(LAYER_W, VIEW_H + LAYER_PAD * 2);
      const lc = c.getContext('2d');
      lc.translate(0, LAYER_PAD);
      l.paint(lc, rng, LAYER_W, VIEW_H + LAYER_PAD);
      return { canvas: c, factor: l.factor };
    });
    this.tex = new Map();
    this.deep = deepColor(location.palette);
    this.light = location.darkness ? makeCanvas(VIEW_W * LIGHT_SCALE, VIEW_H * LIGHT_SCALE) : null;
    this.riderCanvas = makeCanvas(RIDER_CANVAS.w, RIDER_CANVAS.h);
    this.riderCtx = this.riderCanvas.getContext('2d');
    this.fullP = new Map();
  }

  texFor(mat) {
    let t = this.tex.get(mat);
    if (t) return t;
    t = makeCanvas(GROUND_TILE_W, GROUND_TILE_H);
    this.location.paintGround(t.getContext('2d'), createRng(hashString(`${this.location.id}|${mat}`)), GROUND_TILE_W, GROUND_TILE_H, mat);
    this.tex.set(mat, t);
    return t;
  }

  render(world) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sky, 0, 0);

    let sx = 0;
    let sy = 0;
    if (this.shakeEnabled && world.shake > 0.4) {
      sx = Math.round((Math.random() * 2 - 1) * world.shake);
      sy = Math.round((Math.random() * 2 - 1) * world.shake);
    }
    const camX = Math.round(world.camX) - sx;
    const camY = Math.round(world.camY) - sy;

    // паралакс: по горизонталі — частка руху камери; по вертикалі — відхилення від «середньої» висоти
    const dy = world.camY - world.camRefY;
    const fog = this.location.fog;
    this.layers.forEach((l, i) => {
      const off = -(((Math.round(camX * l.factor) % LAYER_W) + LAYER_W) % LAYER_W);
      const vy = Math.round(Math.max(-LAYER_PAD, Math.min(LAYER_PAD, -dy * l.factor * 1.6)));
      ctx.drawImage(l.canvas, off, -LAYER_PAD + vy);
      ctx.drawImage(l.canvas, off + LAYER_W, -LAYER_PAD + vy);
      // серпанок між далекими шарами — повітряна перспектива
      if (fog && i < this.layers.length - 1) {
        ctx.fillStyle = `rgba(${fog.color}, ${fog.amount * 0.45})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    });

    ctx.save();
    ctx.translate(-camX, -camY);
    const left = camX - 80;
    const right = camX + VIEW_W + 80;
    const ents = world.entities;
    for (const e of ents) {
      if (e.kind === 'decor' && !e.front && e.x < right && e.x + (e.w ??= spriteSize(e.sprite).w) > left) ctx.drawImage(getSprite(e.sprite), e.x, e.y);
    }
    for (const e of ents) {
      if (e.x > right || e.x < left - 40) continue;
      if (e.kind === 'sign') this.drawSign(e);
      else if (e.kind === 'checkpoint') this.drawCheckpoint(world, e);
      else if (e.kind === 'gate') this.drawGate(world, e, 'back');
    }
    ctx.restore();

    this.drawTerrain(world, camX, camY);

    ctx.save();
    ctx.translate(-camX, -camY);
    for (const e of ents) {
      if (e.kind === 'log' && e.x > left && e.x < right) this.drawLog(e);
      else if (e.kind === 'rail' && e.x1 > left && e.x < right) this.drawRail(e);
    }
    for (const c of world.coins) {
      if (c.taken || c.x < left || c.x > right) continue;
      this.drawCoin(c, world.time);
    }
    this.drawBike(world);
    for (const e of ents) {
      if (e.kind === 'gate' && e.x > left && e.x < right) this.drawGate(world, e, 'front');
      if (e.kind === 'decor' && e.front && e.x < right && e.x + (e.w ??= spriteSize(e.sprite).w) > left) ctx.drawImage(getSprite(e.sprite), e.x, e.y);
    }
    this.drawParticles(world.particles);
    for (const t of world.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      drawPixelText(ctx, t.text, t.x, t.y, t.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawWeather(world.weather);
    if (fog) {
      // легкий туман і поверх траси — внизу щільніший
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, `rgba(${fog.color}, 0)`);
      g.addColorStop(1, `rgba(${fog.color}, ${fog.amount * 0.35})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.light) this.drawDarkness(world, camX, camY);

    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 90, ${Math.min(0.35, world.flash * 1.6)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (world.fade > 0) {
      ctx.fillStyle = `rgba(8, 8, 14, ${Math.min(1, world.fade)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  // ---------- Земля ----------
  // Колонка за колонкою: текстура покриття від лінії поверхні вниз, під нею — глибокий ґрунт.
  drawTerrain(world, camX, camY) {
    const ctx = this.ctx;
    const t = world.track;
    const TW = GROUND_TILE_W;
    const TH = GROUND_TILE_H;
    const loc = this.location;
    const tufts = loc.palette === 'forest' || loc.palette === 'night' || loc.palette === 'beach';
    let prevY = null;
    for (let sx = 0; sx < VIEW_W; sx++) {
      const wx = camX + sx;
      const yw = t.heightAt(wx);
      const y = Math.round(yw) - camY;
      const mat = t.matAt(wx);
      const tx = ((wx % TW) + TW) % TW;
      if (mat === MAT.gap) {
        this.drawGapColumn(world, wx, sx, camY);
        prevY = null;
        continue;
      }
      if (mat === MAT.wood) {
        const fy = Math.round(t.floorAt(wx)) - camY;
        // земля під помостом (біля землі настил лежить просто на ній)
        this.groundColumn(t.floorMats[Math.round(t.index(wx))] ?? loc.gen.surface, wx, sx, Math.max(fy, y + 3), camY, tx);
        // опори й розкоси
        const span = 26;
        const m = ((wx % span) + span) % span;
        if (fy > y + 3) {
          if (m < 2) {
            ctx.fillStyle = POST[m];
            ctx.fillRect(sx, y + 3, 1, fy - y - 2);
          } else if (fy - y > 14) {
            const k = m / span;
            const by = Math.round(y + 3 + k * (fy - y - 3));
            const by2 = Math.round(fy - k * (fy - y - 3));
            ctx.fillStyle = POST[1];
            ctx.fillRect(sx, by, 1, 1);
            ctx.fillRect(sx, by2, 1, 1);
          }
        }
        // дошки настилу з проміжками
        const seam = ((wx % 9) + 9) % 9 === 0;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = seam && i > 0 ? '#4a2e16' : WOOD[i];
          ctx.fillRect(sx, y + i, 1, 1);
        }
        prevY = y;
        continue;
      }
      this.groundColumn(mat, wx, sx, y, camY, tx);
      if (mat === MAT.water) {
        // брід: напівпрозора вода над дном
        const wy = Math.round(t.floorAt(wx)) - camY;
        if (wy < y) {
          ctx.fillStyle = 'rgba(70, 130, 200, 0.55)';
          ctx.fillRect(sx, wy, 1, y - wy);
          ctx.fillStyle = (wx + Math.floor(world.time * 8)) % 7 === 0 ? '#ffffff' : '#a8d8ff';
          ctx.fillRect(sx, wy, 1, 1);
        }
      }
      // тінь на краю обриву (стінка дропа чи гепу)
      if (prevY !== null && y - prevY > 4) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(sx - 1, prevY + 2, 1, y - prevY);
      }
      // травинки вздовж стежки
      if (tufts && (mat === MAT.dirt || mat === MAT.grass || mat === MAT.roots)) {
        const h = hash(wx);
        if (h < 90) {
          ctx.fillStyle = h < 30 ? '#5a8a2e' : h < 60 ? '#3f6a24' : '#7aa83a';
          ctx.fillRect(sx, y - 1 - (h % 3), 1, 1 + (h % 3));
        }
      }
      prevY = y;
    }
  }

  groundColumn(mat, wx, sx, y, camY, tx) {
    const ctx = this.ctx;
    if (y >= VIEW_H) return;
    const tex = this.texFor(mat);
    const h = Math.min(GROUND_TILE_H, VIEW_H - y);
    if (y + GROUND_TILE_H > 0) ctx.drawImage(tex, tx, 0, 1, h, sx, y, 1, h);
    if (y + GROUND_TILE_H < VIEW_H) {
      ctx.fillStyle = this.deep;
      ctx.fillRect(sx, Math.max(0, y + GROUND_TILE_H), 1, VIEW_H - Math.max(0, y + GROUND_TILE_H));
    }
  }

  // Провалля: дно (вода чи каміння) глибоко внизу.
  drawGapColumn(world, wx, sx, camY) {
    const ctx = this.ctx;
    const t = world.track;
    const i = Math.round(t.index(wx));
    const fy = Math.round(t.floorAt(wx)) - camY;
    const fm = t.floorMats[i];
    if (fm === MAT.water) {
      if (fy < VIEW_H) {
        ctx.fillStyle = '#1f5a98';
        ctx.fillRect(sx, fy, 1, VIEW_H - fy);
        ctx.fillStyle = '#2f78c0';
        ctx.fillRect(sx, fy + 1, 1, 3);
        const wave = Math.sin(wx * 0.3 + world.time * 3) > 0.6;
        ctx.fillStyle = wave ? '#e6f6ff' : '#8ac8f4';
        ctx.fillRect(sx, fy, 1, 1);
      }
    } else {
      this.groundColumn(fm ?? MAT.rock, wx, sx, fy, camY, ((wx % GROUND_TILE_W) + GROUND_TILE_W) % GROUND_TILE_W);
      // темрява ущелини зверху вниз
      ctx.fillStyle = 'rgba(10, 6, 14, 0.35)';
      ctx.fillRect(sx, fy, 1, VIEW_H - fy);
    }
  }

  // ---------- Об'єкти траси ----------
  drawLog(e) {
    const ctx = this.ctx;
    const r = e.r;
    for (let y = Math.floor(-r); y <= Math.ceil(r); y++) {
      for (let x = Math.floor(-r); x <= Math.ceil(r); x++) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        if (d > r + 0.2) continue;
        let c;
        if (d > r - 1.1) c = y < -r * 0.3 ? '#5a3a20' : '#3a2412'; // кора
        else {
          const ring = Math.floor(d * 1.3) % 2;
          c = ring ? '#d9a066' : '#c08048';
          if (d < 1) c = '#8a5a30';
        }
        if (e.style === 'snow' && y < -r * 0.55) c = '#f4f8ff';
        else if (y < -r * 0.75 && (x * 7 + y * 3) % 5 === 0) c = '#5a8a3a'; // мох
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(e.x) + x, Math.round(e.y) + y, 1, 1);
      }
    }
  }

  drawRail(e) {
    const ctx = this.ctx;
    const h = Math.round(0.95 * M);
    const n = Math.max(1, Math.round((e.x1 - e.x) / (1.4 * M)));
    ctx.fillStyle = '#5a5a68';
    for (let i = 0; i <= n; i++) {
      const x = Math.round(e.x + ((e.x1 - e.x) * i) / n);
      const y = Math.round(e.y + ((e.y1 - e.y) * i) / n);
      ctx.fillRect(x, y - h, 1, h);
    }
    const len = Math.max(1, Math.round(e.x1 - e.x));
    for (let i = 0; i <= len; i++) {
      const x = Math.round(e.x + i);
      const y = Math.round(e.y + ((e.y1 - e.y) * i) / len) - h;
      ctx.fillStyle = '#9aa0b0';
      ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = '#4a4a58';
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }

  drawSign(e) {
    const name = e.type === 'jump' ? 'signJump' : e.type === 'drop' ? 'signDrop' : 'signGap';
    const { h } = spriteSize(name);
    this.ctx.drawImage(getSprite(name), Math.round(e.x), Math.round(e.y - h + 2));
  }

  drawCheckpoint(world, e) {
    const ctx = this.ctx;
    const x = Math.round(e.x);
    const y = Math.round(world.track.heightAt(e.x));
    const h = Math.round(2.6 * M);
    ctx.fillStyle = '#d8dce6';
    ctx.fillRect(x, y - h, 1, h);
    ctx.fillStyle = '#8a8e9a';
    ctx.fillRect(x + 1, y - h, 1, h);
    const c = e.passed ? ['#7ed957', '#4fae3a'] : ['#ff9f1a', '#d8740a'];
    for (let i = 0; i < 12; i++) {
      const wave = Math.round(Math.sin(world.time * 6 - i * 0.6) * 1);
      const hh = Math.round(7 - i * 0.45);
      ctx.fillStyle = i % 4 < 2 ? c[0] : c[1];
      ctx.fillRect(x + 2 + i, y - h + wave + Math.round((7 - hh) / 2), 1, hh);
    }
  }

  drawGate(world, e, layer) {
    const ctx = this.ctx;
    const y = Math.round(world.track.heightAt(e.x));
    const x = Math.round(e.x);
    const H = Math.round(3.4 * M);
    const finish = e.style === 'finish';
    const pole = finish ? ['#e8e8ee', '#a8a8b4'] : ['#7ed957', '#4fae3a'];
    if (layer === 'back') {
      ctx.fillStyle = pole[1];
      ctx.fillRect(x + 14, y - H, 2, H);
      // банер між стовпами
      for (let bx = 0; bx < 18; bx++) {
        for (let by = 0; by < 7; by++) {
          ctx.fillStyle = finish ? ((bx >> 1) + (by >> 1)) % 2 ? '#ffffff' : '#1d1b26' : by === 0 || by === 6 ? '#2f7a2a' : '#7ed957';
          ctx.fillRect(x - 2 + bx, y - H + by, 1, 1);
        }
      }
      // лінія на землі
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#1d1b26';
        ctx.fillRect(x + i * 2, y, 2, 2);
      }
      return;
    }
    ctx.fillStyle = pole[0];
    ctx.fillRect(x - 3, y - H, 2, H);
    ctx.fillStyle = pole[1];
    ctx.fillRect(x - 2, y - H, 1, H);
  }

  drawCoin(c, t) {
    const ctx = this.ctx;
    const img = getSprite('coin');
    const big = c.size === 'big';
    const s = big ? 2 : 1;
    const bob = Math.round(Math.sin(t * 3 + c.id) * 1);
    const k = Math.abs(Math.cos(t * 4 + c.id));
    const w = Math.max(2, Math.round(8 * s * k));
    ctx.drawImage(img, Math.round(c.x - w / 2), Math.round(c.y - 4 * s + bob), w, 8 * s);
  }

  // ---------- Велосипедист ----------
  drawBike(world) {
    const ctx = this.ctx;
    const b = world.bike;
    const spec = b.spec;
    let full = this.fullP.get(spec.id);
    if (!full) {
      full = deriveBike(spec);
      this.fullP.set(spec.id, full);
    }
    // походження малюнка — центр мас «з райдером» (після падіння фізика рахує лише байк)
    let ox = b.x;
    let oy = b.y;
    if (b.riderless) [ox, oy] = b.toWorld((full.com[0] - b.P.com[0]) * M, (full.com[1] - b.P.com[1]) * M);

    // м'яка тінь на землі під байком
    const gy = world.track.heightAt(ox);
    if (!world.track.isGap(ox)) {
      const h = gy - oy;
      const w = Math.max(8, Math.round(30 - Math.max(0, h - 16) / 3));
      ctx.drawImage(getShadow(w), Math.round(ox - w / 2), Math.round(gy - 2));
    }

    const RC = RIDER_CANVAS;
    const sc = this.riderCtx;
    const pal = this.skin.palette;
    const v = b.speed / M;
    sc.clearRect(0, 0, RC.w, RC.h);
    drawBikeRider(sc, spec, pal, {
      a: Math.round(b.a / 0.04) * 0.04, // невеликий крок кута — менше «мерехтіння» пікселів
      eR: full.rear.rigidFrame ? full.rear.L * 0.7 : b.rear.e,
      eF: b.front.e,
      spinR: b.rear.angle,
      spinF: b.front.angle,
      crank: b.crank,
      lean: b.lean,
      seat: b.seat,
      crouch: b.crouch,
      dropper: b.seat,
      blur: Math.max(0, Math.min(1, (v - 8) / 6)),
      part: b.riderless ? 'bike' : 'all',
    });
    ctx.drawImage(this.riderCanvas, Math.round(ox) - RC.ox, Math.round(oy) - RC.oy);

    // райдер, що злетів при аварії
    const r = world.rider;
    if (r) {
      sc.clearRect(0, 0, RC.w, RC.h);
      drawBikeRider(sc, spec, pal, { a: Math.round(r.a / 0.15) * 0.15, part: 'rider', pose: 'crash', lean: 0, crouch: 0 });
      // центр «регдолу» — між тазом і плечима
      ctx.drawImage(this.riderCanvas, Math.round(r.x) - RC.ox, Math.round(r.y + 0.35 * M) - RC.oy);
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
      ctx.fillStyle = 'rgba(170, 190, 255, 0.45)';
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
      ctx.globalAlpha = 0.6;
      for (const p of w.parts) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.len, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Ніч: темний шар з «вирізаними» плямами світла (фара по куту байка, ліхтарі) + кольорове сяйво.
  drawDarkness(world, camX, camY) {
    const ctx = this.ctx;
    const lc = this.light.getContext('2d');
    const S = LIGHT_SCALE;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.light.width, this.light.height);
    lc.fillStyle = `rgba(4, 4, 16, ${this.location.darkness})`;
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

    const b = world.bike;
    let beam = null;
    if (!b.riderless) {
      // фара на кермі світить уздовж рами
      const [hx0, hy0] = b.riderWorld('shoulder');
      const hx = (hx0 + b.x) / 2 + Math.cos(b.a) * 10 - camX;
      const hy = (hy0 + b.y) / 2 + Math.sin(b.a) * 10 - camY;
      const ca = Math.cos(b.a);
      const sa = Math.sin(b.a);
      const L = 180;
      const pts = [-1, 1].map((k) => {
        const ang = k * 0.36 + 0.14;
        return [hx + (Math.cos(ang) * ca - Math.sin(ang) * sa) * L, hy + (Math.sin(ang) * ca + Math.cos(ang) * sa) * L];
      });
      beam = { hx, hy, L, pts };
      const g = lc.createRadialGradient(hx * S, hy * S, 0, hx * S, hy * S, L * S);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.moveTo(hx * S, hy * S);
      for (const [x, y] of pts) lc.lineTo(x * S, y * S);
      lc.closePath();
      lc.fill();
    }
    const focus = world.rider ?? b;
    hole(focus.x - camX, focus.y - camY, 34, 0.75);

    const glows = [];
    for (const e of world.entities) {
      const L = e.light;
      if (!L) continue;
      const lx = e.x - camX + (L.dx ?? 4);
      if (lx < -60 || lx > VIEW_W + 60) continue;
      const ly = e.y - camY + (L.dy ?? 4);
      hole(lx, ly + L.r * 0.4, L.r);
      glows.push({ x: lx, y: ly, r: L.r, color: L.color });
    }
    ctx.drawImage(this.light, 0, 0, VIEW_W, VIEW_H);

    ctx.globalCompositeOperation = 'lighter';
    if (beam) {
      // теплий відтінок світла фари і дощ, що блищить у промені
      const g = ctx.createRadialGradient(beam.hx, beam.hy, 0, beam.hx, beam.hy, beam.L);
      g.addColorStop(0, 'rgba(255, 236, 190, 0.22)');
      g.addColorStop(1, 'rgba(255, 236, 190, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(beam.hx, beam.hy);
      for (const [x, y] of beam.pts) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
    }
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

export { shade };
