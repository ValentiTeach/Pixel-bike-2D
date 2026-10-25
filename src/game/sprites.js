// Реєстр спрайтів: розбір матриць, процедурні спрайти, кеш готових canvas.
// Розміри (spriteSize) доступні без DOM — це використовує ігрова логіка і тести.
import { MATRIX_SPRITES } from './spriteData.js';
import { PROCEDURAL_SPRITES } from './proceduralSprites.js';
import { createRng, hashString } from './rng.js';
import { drawBike, BIKE_FRAMES } from './bikeSprite.js';
import { PLAYER_W, PLAYER_H } from './constants.js';

const parsed = new Map();
const canvases = new Map();

const splitName = (name) => {
  const i = name.indexOf(':');
  return i === -1 ? [name, null] : [name.slice(0, i), name.slice(i + 1)];
};

const rotate90 = (rows) => {
  const n = rows.length;
  const out = [];
  for (let y = 0; y < rows[0].length; y++) {
    let line = '';
    for (let x = 0; x < n; x++) line += rows[n - 1 - x][y];
    out.push(line);
  }
  return out;
};

// Розбирає і перевіряє матричний спрайт. Кидає помилку, якщо рядки різної ширини
// або в матриці є символ, якого немає в палітрі — так помилки малювання ловляться тестами.
export function parseMatrix(baseName) {
  if (parsed.has(baseName)) return parsed.get(baseName);
  const def = MATRIX_SPRITES[baseName];
  if (!def) throw new Error(`Невідомий спрайт: ${baseName}`);
  let frames = def.frames;
  if (def.rotateFrames) {
    const f0 = frames[0];
    const f1 = rotate90(f0);
    const f2 = rotate90(f1);
    const f3 = rotate90(f2);
    frames = [f0, f1, f2, f3];
  }
  const h = frames[0].length;
  const w = frames[0][0].length;
  frames.forEach((rows, fi) => {
    if (rows.length !== h) throw new Error(`${baseName}[${fi}]: висота ${rows.length} ≠ ${h}`);
    rows.forEach((row, ri) => {
      if (row.length !== w) throw new Error(`${baseName}[${fi}] рядок ${ri}: ширина ${row.length} ≠ ${w}`);
      for (const ch of row) {
        if (ch !== '.' && !def.palette[ch]) throw new Error(`${baseName}: символ '${ch}' без кольору`);
      }
    });
  });
  const info = { w, h, frames, def };
  parsed.set(baseName, info);
  return info;
}

export function hasSprite(name) {
  const [base] = splitName(name);
  return Boolean(MATRIX_SPRITES[base] || PROCEDURAL_SPRITES[base]);
}

export function spriteSize(name) {
  const [base] = splitName(name);
  if (PROCEDURAL_SPRITES[base]) {
    const p = PROCEDURAL_SPRITES[base];
    return { w: p.w, h: p.h, frames: 1 };
  }
  const info = parseMatrix(base);
  return { w: info.w, h: info.h, frames: info.frames.length };
}

const createCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

function paintRows(ctx, rows, palette, ox = 0, oy = 0) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function flipCanvas(src) {
  const c = createCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

// Силует спрайта одним кольором (для тіней і спалахів).
function silhouetteCanvas(src, color) {
  const c = createCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return c;
}

function buildBase(name, frame, paletteOverride) {
  const [base, variant] = splitName(name);
  const proc = PROCEDURAL_SPRITES[base];
  if (proc) {
    const c = createCanvas(proc.w, proc.h);
    proc.draw(c.getContext('2d'), createRng(hashString(base)));
    return c;
  }
  const info = parseMatrix(base);
  const palette = {
    ...info.def.palette,
    ...(variant && info.def.palettes ? info.def.palettes[variant] : null),
    ...paletteOverride,
  };
  const c = createCanvas(info.w, info.h);
  paintRows(c.getContext('2d'), info.frames[frame % info.frames.length], palette);
  return c;
}

/**
 * Повертає готовий canvas спрайта (з кешу).
 * @param {string} name   'rock', 'rock:snow', 'car_red'…
 * @param {object} opts   frame, flip, silhouette (колір), palette (перевизначення кольорів), key (для кешу)
 */
export function getSprite(name, { frame = 0, flip = false, silhouette = null, palette = null, key = '' } = {}) {
  const id = `${name}|${frame}|${flip ? 1 : 0}|${silhouette || ''}|${key}`;
  let c = canvases.get(id);
  if (c) return c;
  if (silhouette) c = silhouetteCanvas(getSprite(name, { frame, flip, palette, key }), silhouette);
  else if (flip) c = flipCanvas(getSprite(name, { frame, palette, key }));
  else c = buildBase(name, frame, palette);
  canvases.set(id, c);
  return c;
}

// ---- Велосипедист (вид збоку) ----

export function getBikeFrame(skin, frame) {
  const f = ((frame % BIKE_FRAMES) + BIKE_FRAMES) % BIKE_FRAMES;
  const id = `bike|${skin.id}|${f}`;
  let c = canvases.get(id);
  if (c) return c;
  c = createCanvas(PLAYER_W, PLAYER_H);
  drawBike(c.getContext('2d'), skin.palette, f);
  canvases.set(id, c);
  return c;
}

// М'яка піксельна тінь-еліпс заданої ширини.
export function getShadow(w) {
  const id = `shadow|${w}`;
  let c = canvases.get(id);
  if (c) return c;
  const h = Math.max(2, Math.round(w / 3));
  c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10, 6, 20, 0.28)';
  for (let y = 0; y < h; y++) {
    const k = (y + 0.5) / h - 0.5;
    const half = Math.round((w / 2) * Math.sqrt(1 - 4 * k * k));
    ctx.fillRect(Math.round(w / 2 - half), y, half * 2, 1);
  }
  canvases.set(id, c);
  return c;
}
