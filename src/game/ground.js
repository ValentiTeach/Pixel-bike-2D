// Допоміжні функції для малювання безшовної плитки землі/дороги.
// Плитка має висоту TILE_H і повторюється по вертикалі під час прокрутки.

export const px = (ctx, x, y, c, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

// Заливка кольором + випадкові «шумові» пікселі (текстура асфальту, трави, піску).
export function noise(ctx, rng, x, y, w, h, base, colors, density = 0.25) {
  px(ctx, x, y, base, w, h);
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    px(ctx, x + rng.int(0, w - 1), y + rng.int(0, h - 1), rng.pick(colors));
  }
}

// Пунктир уздовж осі Y. Період (dash + gap) має ділити висоту плитки.
export function dashed(ctx, x, w, dash, gap, color, H, offset = 0) {
  for (let y = offset; y < H; y += dash + gap) px(ctx, x, y, color, w, dash);
}

// Нерівний край (трава заходить на ґрунтову дорогу тощо).
// Глибина — сума синусоїд з періодами, що ділять H, тож плитка лишається безшовною.
export function raggedEdge(ctx, rng, x, H, dir, colors, maxDepth = 3) {
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  for (let y = 0; y < H; y++) {
    const s = 0.5 + 0.3 * Math.sin((y / H) * Math.PI * 2 * 5 + p1) + 0.2 * Math.sin((y / H) * Math.PI * 2 * 13 + p2);
    const depth = Math.max(0, Math.round(s * maxDepth + rng.range(-0.6, 0.6)));
    for (let d = 0; d < depth; d++) px(ctx, dir > 0 ? x + d : x - 1 - d, y, rng.pick(colors));
  }
}

// Тротуар з плиткою.
export function sidewalk(ctx, rng, x, w, H, { base, joint, noiseColors, tile = 10 }) {
  noise(ctx, rng, x, 0, w, H, base, noiseColors, 0.18);
  for (let y = 0; y < H; y += tile) px(ctx, x, y, joint, w, 1);
  px(ctx, x + Math.floor(w / 2), 0, joint, 1, H);
}
