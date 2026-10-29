// Хелпери для фонів виду збоку: дизерингове небо і паралакс-шари (гори, пагорби, місто,
// хмари, ліс, скелі каньйону, море). Текстури покриттів траси — у groundTextures.js.
// Усі шари безшовні по горизонталі: періодичні функції + «загортання» об'єктів через край.

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

// Ряд хвойних силуетів (ліс на схилі). density — скільки дерев на ширину ~40 px.
export function forestRow(ctx, rng, { W, H, base, color, dark, minH, maxH, density = 1, trunks = null, snow = null }) {
  // «земля» шару — хвилястий схил під деревами
  const p = rng.range(0, Math.PI * 2);
  for (let x = 0; x < W; x++) {
    const y = Math.round(base - 6 - 4 * Math.sin((x / W) * Math.PI * 4 + p) - 2 * Math.sin((x / W) * Math.PI * 10 + p * 2));
    px(ctx, x, y, color, 1, H - y);
  }
  let x = rng.int(0, 8);
  while (x < W + 20) {
    const h = rng.int(minH, maxH);
    const half = Math.max(3, Math.round(h * rng.range(0.18, 0.26)));
    const cx = x;
    const top = base - h;
    for (let y = 0; y < h; y++) {
      const k = y / h;
      // ярусні «лапи»: ширина пульсує
      const tier = 0.75 + 0.25 * Math.sin(y * 0.9);
      const span = Math.max(1, Math.round(half * k * tier + (y > h - 3 ? 0 : 0)));
      for (let dx = -span; dx <= span; dx++) {
        const xx = (((cx + dx) % W) + W) % W;
        let c = dx > span * 0.3 ? dark : color;
        if (snow && (y < 2 || (Math.sin(y * 0.9) > 0.85 && dx < 0))) c = snow;
        px(ctx, xx, top + y, c);
      }
    }
    if (trunks) px(ctx, (((cx) % W) + W) % W, base - 4, trunks, 1, 4);
    x += Math.round(rng.int(half, half * 3) / density);
  }
}

// Скелі каньйону / прибережні кручі: плоскі верхівки, стрімкі стіни, горизонтальні пласти.
export function canyonWall(ctx, rng, { W, H, base, color, light, dark, minH, maxH, grass = null }) {
  let x = 0;
  const tops = [];
  while (x < W) {
    const w = rng.int(30, 90);
    tops.push({ x, w, h: rng.int(minH, maxH) });
    x += w;
  }
  const last = tops[tops.length - 1];
  last.w = W - last.x;
  const heightAt = (xx) => {
    for (let i = 0; i < tops.length; i++) {
      const t = tops[i];
      if (xx >= t.x && xx < t.x + t.w) {
        const edgeL = xx - t.x;
        const edgeR = t.x + t.w - xx;
        const prev = tops[(i - 1 + tops.length) % tops.length].h;
        const next = tops[(i + 1) % tops.length].h;
        let h = t.h;
        if (edgeL < 6) h = Math.round(prev + (t.h - prev) * (edgeL / 6) ** 0.5);
        if (edgeR < 6) h = Math.round(next + (t.h - next) * (edgeR / 6) ** 0.5);
        return h;
      }
    }
    return minH;
  };
  for (let xx = 0; xx < W; xx++) {
    const h = heightAt(xx);
    const y0 = base - h;
    const slopeL = heightAt((xx + W - 1) % W) < h;
    const slopeR = heightAt((xx + 1) % W) < h;
    for (let y = y0; y < H; y++) {
      const layer = Math.floor((y - y0 + (xx % 7 === 0 ? 1 : 0)) / 5) % 3;
      let c = layer === 1 ? light : color;
      if (layer === 2) c = dark;
      if (slopeR && y - y0 < 40) c = dark;
      if (slopeL && y - y0 < 40) c = light;
      px(ctx, xx, y, c);
    }
    px(ctx, xx, y0, light);
    if (grass) px(ctx, xx, y0, grass, 1, 2);
  }
}

// Шар туману/серпанку: напівпрозора смуга з дизерингом (між паралакс-шарами).
export function haze(ctx, { W, y0, y1, color, alpha }) {
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) / Math.max(1, y1 - y0);
    ctx.fillStyle = `rgba(${color}, ${alpha * (1 - Math.abs(k - 0.5) * 2) ** 0.6})`;
    ctx.fillRect(0, y, W, 1);
  }
}
