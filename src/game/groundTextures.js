// Текстури покриттів траси (вид збоку). Плитка W×H: рядок 0 — сама поверхня, нижче — ґрунт.
// Рендер малює плитку колонками від лінії поверхні вниз, тож шари «йдуть» уздовж схилу.
// Кожна локація має власну палітру ґрунту (лісовий чорнозем, цегла міста, червоний пісковик…).
import { MAT } from './terrain.js';

const px = (ctx, x, y, c, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Палітри «тіла» землі для локацій: колір, шум, каміння, корені, пласти.
export const SOIL = {
  forest: { body: '#4a3424', noise: ['#3e2a1c', '#56402c', '#5e4632'], stones: ['#6a6058', '#8a8078', '#4a423c'], roots: '#2e1e14', deep: '#2e2018' },
  city: { body: '#7a4a3a', noise: ['#6a3e30', '#8a5646'], bricks: '#5a3428', deep: '#4a2a22' },
  desert: { body: '#a85a3a', noise: ['#9a4e30', '#b86a46'], strata: ['#b8683e', '#a05634', '#c47a4c', '#94492c'], deep: '#7a3a22' },
  beach: { body: '#7a6a5a', noise: ['#6a5a4a', '#8a7a68'], stones: ['#5a5a60', '#8a8a92', '#4a4a50'], deep: '#4a4038' },
  snow: { body: '#5a5e70', noise: ['#4e5264', '#686c80'], stones: ['#7a8098', '#9aa0b8', '#3e4254'], deep: '#3a3c4c' },
  night: { body: '#3e2c1e', noise: ['#342416', '#4a3626'], stones: ['#5a5654', '#7a7674', '#3a3634'], roots: '#24180e', deep: '#20160e' },
};

// Поверхні: кольори верхніх рядків (зверху вниз) і акценти.
const SURFACES = {
  dirt: {
    forest: ['#a8845a', '#8a6844', '#76583a', '#664a30'],
    night: ['#7a6248', '#5e4a34', '#4e3c28'],
    beach: ['#b09a78', '#98805e', '#846c4e'],
    city: ['#9a7a5a', '#86684a'],
    desert: ['#c88a5a', '#b0744a'],
    snow: ['#8a7a6a', '#6a5a4a'],
  },
  roots: { all: ['#a8845a', '#7a5a3a', '#664a30'] },
  grass: { all: ['#8ac04a', '#6aa83a', '#4f8a2e', '#3f6a24'] },
  mud: { all: ['#6a4e30', '#4e3820', '#3e2c18', '#34240f'] },
  rock: {
    desert: ['#e8a070', '#d08a5c', '#c07a4e', '#b06c44'],
    snow: ['#b8bccc', '#9aa0b4', '#868ca2'],
    beach: ['#a8a8ae', '#8e8e96', '#7a7a82'],
    all: ['#a0a0a8', '#86868e', '#74747c'],
  },
  sand: { all: ['#fbe6b0', '#f2d496', '#e6c47e', '#d8b06a'] },
  snow: { all: ['#ffffff', '#f2f6fc', '#e2eaf6', '#d0dcee', '#c0cee4'] },
  ice: { all: ['#f0faff', '#c8ecfa', '#a8dcf2', '#8ccaea'] },
  concrete: { all: ['#d8d6d2', '#bcbab6', '#a8a6a2', '#94928e', '#5a5856'] },
  gravel: { all: ['#a89a88', '#8a7e6e', '#76695a'] },
  water: { all: ['#7a6a52', '#5e5040'] },
  log: { all: ['#76583a', '#664a30'] },
  wood: { all: ['#c8955a', '#a8743e', '#7a4e26'] },
};

function surfaceColors(id, palette) {
  const s = SURFACES[id] ?? SURFACES.dirt;
  return s[palette] ?? s.all ?? s.forest;
}

function soil(ctx, rng, W, H, top, palette) {
  const S = SOIL[palette] ?? SOIL.forest;
  px(ctx, 0, top, S.body, W, H - top);
  if (S.strata) {
    let y = top + 2;
    let i = 0;
    while (y < H) {
      const t = rng.int(3, 8);
      const p = rng.range(0, Math.PI * 2);
      for (let x = 0; x < W; x++) {
        const off = Math.round(Math.sin((x / W) * Math.PI * 4 + p) * 1.2);
        px(ctx, x, y + off, S.strata[i % S.strata.length], 1, t);
      }
      y += t;
      i++;
    }
  }
  if (S.bricks) {
    for (let y = top + 3; y < H; y += 5) {
      px(ctx, 0, y, S.bricks, W, 1);
      const off = (Math.floor(y / 5) % 2) * 6;
      for (let x = off; x < W; x += 12) px(ctx, x, y, S.bricks, 1, 5);
    }
  }
  for (let i = 0; i < W * (H - top) * 0.07; i++) px(ctx, rng.int(0, W - 1), rng.int(top, H - 1), rng.pick(S.noise));
  if (S.stones) {
    const n = Math.round((W * (H - top)) / 420);
    for (let i = 0; i < n; i++) {
      const cx = rng.int(0, W - 1);
      const cy = rng.int(top + 4, Math.round(top + (H - top) * 0.75));
      const rx = rng.range(2.5, 5.5);
      const ry = rng.range(1.8, 3.4);
      for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
          const d = (x / rx) ** 2 + (y / ry) ** 2;
          if (d > 1) continue;
          let c = S.stones[0];
          if (x + y < -1 && d < 0.7) c = S.stones[1];
          if (x + y > 1 && d > 0.5) c = S.stones[2];
          px(ctx, (((cx + x) % W) + W) % W, cy + y, c);
        }
      }
    }
  }
  if (S.roots) {
    // тонкі корінці: тягнуться вбік і вниз, розгалужуються
    for (let i = 0; i < 3; i++) {
      let x = rng.int(0, W - 1);
      let y = rng.int(top + 1, top + 10);
      const dir = rng.sign();
      const len = rng.int(10, 24);
      for (let s = 0; s < len; s++) {
        px(ctx, ((x % W) + W) % W, y, S.roots);
        x += dir;
        if (rng.chance(0.35)) y += 1;
        if (rng.chance(0.08)) {
          let bx = x;
          let by = y;
          for (let k = 0; k < 5; k++) px(ctx, (((bx += dir) % W) + W) % W, (by += 1), S.roots);
        }
      }
    }
  }
  // глибше — темніше (дизеринг)
  for (let y = top; y < H; y++) {
    const k = (y - top) / (H - top);
    if (k < 0.5) continue;
    for (let x = 0; x < W; x++) if (BAYER[y & 3][x & 3] / 16 < (k - 0.5) * 1.6) px(ctx, x, y, S.deep);
  }
}

/**
 * Малює плитку текстури для матеріалу mat у палітрі локації.
 */
export function paintMaterials(ctx, rng, W, H, mat, palette) {
  const id = Object.keys(MAT).find((k) => MAT[k] === mat) ?? 'dirt';
  const cols = surfaceColors(id, palette);
  let top = cols.length;

  if (id === 'concrete') {
    // бетонна плита + підпірна стінка з каменю/цегли
    px(ctx, 0, 0, cols[0], W, 1);
    px(ctx, 0, 1, cols[1], W, 2);
    px(ctx, 0, 3, cols[2], W, 3);
    px(ctx, 0, 6, cols[4], W, 1);
    for (let x = 0; x < W; x += 32) px(ctx, x, 1, cols[3], 1, 5);
    for (let i = 0; i < 26; i++) px(ctx, rng.int(0, W - 1), rng.int(1, 5), rng.pick([cols[1], cols[3]]));
    soil(ctx, rng, W, H, 7, palette === 'city' ? 'city' : palette);
    return;
  }

  if (id === 'rock') {
    // скеля: пласти, тріщини, відблиски
    const S = SOIL[palette] ?? SOIL.forest;
    soil(ctx, rng, W, H, 0, palette === 'desert' ? 'desert' : palette);
    for (let y = 0; y < Math.min(H, 26); y++) {
      for (let x = 0; x < W; x++) {
        const k = y / 26;
        if (BAYER[y & 3][x & 3] / 16 < 1 - k) px(ctx, x, y, cols[Math.min(cols.length - 1, 1 + Math.floor(k * (cols.length - 1)))]);
      }
    }
    for (let i = 0; i < 6; i++) {
      let x = rng.int(0, W - 1);
      let y = rng.int(1, 18);
      for (let s = 0; s < rng.int(4, 12); s++) {
        px(ctx, ((x % W) + W) % W, y, S.deep);
        x += rng.int(-1, 1);
        y += 1;
      }
    }
    px(ctx, 0, 0, cols[0], W, 1);
    for (let i = 0; i < 20; i++) px(ctx, rng.int(0, W - 1), rng.int(1, 3), cols[0]);
    return;
  }

  if (id === 'snow' || id === 'ice') {
    soil(ctx, rng, W, H, 0, 'snow');
    const depth = id === 'snow' ? 14 : 8;
    for (let y = 0; y < depth; y++) {
      const k = y / depth;
      for (let x = 0; x < W; x++) {
        const wobble = Math.round(Math.sin((x / W) * Math.PI * 6) * 1.5);
        if (y + wobble > depth - 1) continue;
        px(ctx, x, y, cols[Math.min(cols.length - 1, Math.floor(k * cols.length))]);
      }
    }
    if (id === 'ice') {
      for (let i = 0; i < 10; i++) px(ctx, rng.int(0, W - 4), rng.int(1, 5), '#ffffff', rng.int(2, 5), 1);
      for (let i = 0; i < 4; i++) {
        let x = rng.int(0, W - 1);
        for (let y = 1; y < 7; y++) {
          px(ctx, ((x % W) + W) % W, y, '#6ab4dc');
          x += rng.int(-1, 1);
        }
      }
    } else {
      for (let i = 0; i < 30; i++) px(ctx, rng.int(0, W - 1), rng.int(1, 6), rng.pick(['#ffffff', '#d8e4f4']));
    }
    return;
  }

  if (id === 'sand') {
    soil(ctx, rng, W, H, 6, palette === 'desert' ? 'desert' : 'beach');
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < W; x++) {
        const ripple = Math.round(Math.sin((x / W) * Math.PI * 8 + y * 0.6) * 1);
        if (y > 6 + ripple) continue;
        px(ctx, x, y, cols[Math.min(cols.length - 1, Math.floor((y / 8) * cols.length))]);
      }
    }
    for (let i = 0; i < 40; i++) px(ctx, rng.int(0, W - 1), rng.int(1, 6), rng.pick(['#fff4d0', '#d8b06a']));
    return;
  }

  // ґрунтові: dirt, roots, mud, grass, gravel, water (дно), log
  soil(ctx, rng, W, H, top, palette);
  cols.forEach((c, i) => px(ctx, 0, i, c, W, 1));
  // нерівний низ поверхневого шару
  for (let x = 0; x < W; x++) {
    const d = rng.int(0, 2);
    for (let k = 0; k < d; k++) px(ctx, x, top + k, cols[cols.length - 1]);
  }
  if (id === 'roots') {
    for (let i = 0; i < 5; i++) {
      let x = rng.int(0, W - 1);
      let y = 0;
      for (let s = 0; s < rng.int(10, 24); s++) {
        px(ctx, ((x % W) + W) % W, y, '#4a2e1a');
        px(ctx, ((x % W) + W) % W, y + 1, '#2e1e12');
        x += 1;
        y = Math.max(0, Math.min(4, y + rng.int(-1, 1)));
      }
    }
  }
  if (id === 'mud') {
    for (let i = 0; i < 14; i++) px(ctx, rng.int(0, W - 4), rng.int(0, 1), '#8a7a5a', rng.int(2, 4), 1);
  }
  if (id === 'gravel' || id === 'water') {
    for (let i = 0; i < 60; i++) px(ctx, rng.int(0, W - 1), rng.int(0, 4), rng.pick(['#c8bca8', '#6a5e50', '#9a8e7e']));
  }
  if (id === 'dirt' || id === 'grass') {
    // утрамбована колія і камінчики
    for (let i = 0; i < 18; i++) px(ctx, rng.int(0, W - 1), rng.int(1, top), rng.pick(cols));
    for (let i = 0; i < 6; i++) px(ctx, rng.int(0, W - 1), rng.int(1, 3), (SOIL[palette] ?? SOIL.forest).stones?.[1] ?? cols[0]);
  }
}

// Колір «глибокої» землі під плиткою (заливка нижче висоти плитки).
export function deepColor(palette) {
  return (SOIL[palette] ?? SOIL.forest).deep;
}
