// Хелпери для фонів виду збоку: дизерингове небо, паралакс-шари (гори, пагорби, місто,
// хмари, ряди дерев) і безшовна текстура землі з травою та камінням — як у класичних платформерах.
// Усі шари безшовні по горизонталі: періодичні функції + «загортання» об'єктів через край.
import { getSprite, spriteSize } from './sprites.js';

export const px = (ctx, x, y, c, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Небо: вертикальний градієнт з упорядкованим дизерингом між смугами кольорів.
export function paintSky(ctx, W, H, colors, { stars = 0, sun = null, moon = null, rng } = {}) {
  const n = colors.length - 1;
  for (let y = 0; y < H; y++) {
    const t = (y / (H - 1)) * n;
    const band = Math.min(n - 1, Math.floor(t));
    const frac = t - band;
    for (let x = 0; x < W; x++) {
      const c = BAYER[y % 4][x % 4] / 16 < frac ? colors[band + 1] : colors[band];
      px(ctx, x, y, c);
    }
  }
  for (let i = 0; i < stars; i++) {
    const x = rng.int(0, W - 1);
    const y = rng.int(0, Math.floor(H * 0.6));
    px(ctx, x, y, rng.chance(0.3) ? '#ffffff' : '#9a94c8');
    if (rng.chance(0.08)) {
      px(ctx, x - 1, y, '#5a548a');
      px(ctx, x + 1, y, '#5a548a');
    }
  }
  const disc = (o, fill, glow) => {
    for (let y = -o.r - 3; y <= o.r + 3; y++) {
      for (let x = -o.r - 3; x <= o.r + 3; x++) {
        const d = Math.hypot(x, y);
        if (d <= o.r) px(ctx, o.x + x, o.y + y, fill);
        else if (glow && d <= o.r + 3 && BAYER[(o.y + y) & 3][(o.x + x) & 3] / 16 < 0.5) px(ctx, o.x + x, o.y + y, glow);
      }
    }
  };
  if (sun) disc(sun, sun.color, sun.glow);
  if (moon) {
    disc(moon, '#f4f0d8', '#3a3268');
    disc({ x: moon.x + 4, y: moon.y - 2, r: moon.r - 1 }, colors[0]);
  }
}

// Хвиляста лінія пагорбів / дюн.
export function ridge(ctx, rng, { W, H, base, amp, color, top, k = [2, 5] }) {
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  for (let x = 0; x < W; x++) {
    const s = 0.55 + 0.3 * Math.sin((2 * Math.PI * k[0] * x) / W + p1) + 0.15 * Math.sin((2 * Math.PI * k[1] * x) / W + p2);
    const y = Math.round(base - amp * s);
    px(ctx, x, y, color, 1, H - y);
    if (top) px(ctx, x, y, top);
  }
}

// Гори-трикутники (з освітленим і тіньовим схилом та сніговими шапками).
export function peaks(ctx, rng, { W, H, base, count, minH, maxH, color, shade, snow = null, flat = 0 }) {
  for (let i = 0; i < count; i++) {
    const cx = Math.round((i / count) * W + rng.range(-20, 20));
    const h = rng.int(minH, maxH);
    const hw = Math.round(h * rng.range(0.9, 1.5));
    const plateau = Math.round(flat * hw);
    for (let dx = -hw - plateau; dx <= hw + plateau; dx++) {
      const along = Math.max(0, Math.abs(dx) - plateau);
      const y = Math.round(base - h * (1 - along / hw));
      const x = (((cx + dx) % W) + W) % W;
      const c = dx < 0 ? color : shade;
      px(ctx, x, y, c, 1, H - y);
      if (snow) {
        const capDepth = Math.round(h * 0.22 - along * 0.15 + (BAYER[y & 3][x & 3] > 8 ? 1 : 0));
        if (capDepth > 0) px(ctx, x, y, dx < 0 ? snow : '#c8d4e8', 1, capDepth);
      }
    }
  }
}

// Силуети будинків з вікнами.
export function skyline(ctx, rng, { W, H, base, color, windows = [], litChance = 0.3, minW = 14, maxW = 30, minH = 30, maxH = 70, roof = null }) {
  let x = 0;
  while (x < W) {
    const bw = rng.int(minW, maxW);
    const bh = rng.int(minH, maxH);
    const draw = (ox) => {
      px(ctx, ox, base - bh, color, bw, H - base + bh);
      if (roof) px(ctx, ox, base - bh, roof, bw, 1);
      if (rng.chance(0.3)) px(ctx, ox + Math.floor(bw / 2), base - bh - 5, color, 1, 5);
      for (let wy = base - bh + 3; wy < base - 2; wy += 4) {
        for (let wx = ox + 2; wx < ox + bw - 2; wx += 3) {
          if (windows.length && rng.chance(litChance)) px(ctx, wx, wy, rng.pick(windows), 1, 2);
        }
      }
    };
    draw(x);
    if (x + bw > W) draw(x - W);
    x += bw + rng.int(0, 3);
  }
}

// Пухнасті хмари з кругів.
export function clouds(ctx, rng, { W, yMin, yMax, count, color, shade }) {
  for (let i = 0; i < count; i++) {
    const cx = rng.int(0, W - 1);
    const cy = rng.int(yMin, yMax);
    const puffs = rng.int(3, 5);
    const blobs = [];
    for (let j = 0; j < puffs; j++) blobs.push({ x: cx + j * rng.int(5, 8), y: cy - rng.int(0, 4), r: rng.int(4, 7) });
    for (const pass of [shade, color]) {
      for (const b of blobs) {
        const r = pass === shade ? b.r : b.r - 1;
        const oy = pass === shade ? 1 : 0;
        for (let y = -r; y <= r; y++) {
          for (let x = -r; x <= r; x++) {
            if (x * x + y * y > r * r || y > 2) continue;
            px(ctx, (((b.x + x) % W) + W) % W, b.y + y + oy, pass);
          }
        }
      }
    }
  }
}

// Ряд спрайтів (дерева, кактуси, пальми), вирівняних по лінії base.
export function spriteRow(ctx, rng, { W, base, items, gap = [4, 20], tint = null }) {
  let x = rng.int(0, 10);
  while (x < W) {
    const item = rng.weighted(items);
    const img = getSprite(item.sprite, tint ? { silhouette: tint } : {});
    const { w, h } = spriteSize(item.sprite);
    const y = base - h + rng.int(0, 2);
    ctx.drawImage(img, x, y);
    if (x + w > W) ctx.drawImage(img, x - W, y);
    x += w + rng.int(gap[0], gap[1]);
  }
}

// Море з відблисками.
export function sea(ctx, rng, { W, H, y, colors, sparkle }) {
  px(ctx, 0, y, colors[0], W, H - y);
  for (let row = y; row < H; row++) {
    const k = (row - y) / (H - y);
    for (let x = 0; x < W; x++) {
      if (BAYER[row & 3][x & 3] / 16 < k) px(ctx, x, row, colors[1]);
    }
  }
  px(ctx, 0, y, sparkle, W, 1);
  for (let i = 0; i < 120; i++) px(ctx, rng.int(0, W - 1), rng.int(y + 2, H - 1), sparkle, rng.int(2, 5), 1);
}

/**
 * Безшовна текстура землі: поверхня (трава/пісок/сніг/асфальт) з «бахромою» знизу
 * і ґрунт з округлими каменями, як у класичних піксельних платформерах.
 */
export function groundTexture(ctx, rng, { W, H, surface, fringe, body, bodyNoise, rocks = null, layers = null }) {
  px(ctx, 0, 0, body, W, H);
  if (layers) {
    // горизонтальні пласти (пісковик, лід)
    let y = surface.length + 2;
    let i = 0;
    while (y < H) {
      const t = rng.int(4, 9);
      const p = rng.range(0, Math.PI * 2);
      for (let x = 0; x < W; x++) {
        const off = Math.round(Math.sin((x / W) * Math.PI * 2 * 2 + p) * 1.5);
        px(ctx, x, y + off, layers[i % layers.length], 1, t);
      }
      y += t;
      i++;
    }
  }
  for (let i = 0; i < W * H * 0.08; i++) px(ctx, rng.int(0, W - 1), rng.int(surface.length, H - 1), rng.pick(bodyNoise));

  if (rocks) {
    const n = Math.round((W * H) / rocks.density);
    for (let i = 0; i < n; i++) {
      const cx = rng.int(0, W - 1);
      const cy = rng.int(surface.length + 4, H - 4);
      const rx = rng.range(3, 8);
      const ry = rng.range(2.5, 5);
      for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
        for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
          const d = (x / rx) ** 2 + (y / ry) ** 2;
          if (d > 1) continue;
          let c = rocks.mid;
          if (d > 0.7 && x + y > 0) c = rocks.dark;
          else if (d > 0.55 && x + y < 0) c = rocks.light;
          else if (x + y < -rx * 0.6 && d < 0.5) c = rocks.light;
          px(ctx, (((cx + x) % W) + W) % W, cy + y, c);
        }
      }
    }
  }

  // поверхня
  surface.forEach((c, i) => px(ctx, 0, i, c, W, 1));
  for (let i = 0; i < W * 0.6; i++) px(ctx, rng.int(0, W - 1), rng.int(1, surface.length - 1), rng.pick(fringe.noise ?? [surface[1]]));
  // «бахрома» — нерівний низ поверхні (трава звисає на землю)
  for (let x = 0; x < W; x++) {
    const depth = rng.int(0, fringe.depth);
    for (let d = 0; d < depth; d++) px(ctx, x, surface.length + d, d === depth - 1 ? fringe.dark : fringe.color);
    if (depth === 0) px(ctx, x, surface.length, fringe.dark);
  }
}
