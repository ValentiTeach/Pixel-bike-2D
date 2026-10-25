// Велосипедист збоку, намальований кодом (8 кадрів обертання педалей).
// Ноги рахуються зворотною кінематикою: стегно + гомілка від сідла до педалі,
// тож педалювання виглядає «по-справжньому», а скіни просто підміняють кольори палітри.
import { PLAYER_W, PLAYER_H } from './constants.js';

export const BIKE_FRAMES = 8;

// Ключі палітри збігаються зі скінами (skins.js): f рама, j джерсі, J смуга, H шолом,
// h вставка шолома, p шорти, L взуття, s шкіра, t шини, m метал.
export const BIKE_PALETTE = {
  t: '#1d1b26', m: '#9aa3b5', g: '#2b2b38', f: '#e8383d', j: '#e8383d', J: '#ffcc33',
  H: '#f4f4f4', h: '#3a3a4a', p: '#24223a', L: '#f4f4f4', s: '#e8b48a',
};

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};

function plot(ctx, x, y, c) {
  if (x < 0 || y < 0 || x >= PLAYER_W || y >= PLAYER_H) return;
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
}

// Відрізок Брезенхема — чіткі пікселі без згладжування.
function line(ctx, x0, y0, x1, y1, c) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    plot(ctx, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// «Капсула» — товстий відрізок: усі пікселі ближче r до відрізка ab.
function thick(ctx, a, b, r, c) {
  const minX = Math.floor(Math.min(a.x, b.x) - r);
  const maxX = Math.ceil(Math.max(a.x, b.x) + r);
  const minY = Math.floor(Math.min(a.y, b.y) - r);
  const maxY = Math.ceil(Math.max(a.y, b.y) + r);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
      const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
      if (d <= r) plot(ctx, x, y, c);
    }
  }
}

function wheel(ctx, cx, cy, angle, pal) {
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d <= 4.9 && d > 3.7) plot(ctx, cx + x, cy + y, pal.t);
      else if (d <= 3.7 && d > 3.0) plot(ctx, cx + x, cy + y, pal.m);
    }
  }
  for (const a of [angle, angle + Math.PI / 2]) {
    line(ctx, cx - Math.cos(a) * 2.6, cy - Math.sin(a) * 2.6, cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6, '#6a6a7a');
  }
  plot(ctx, cx, cy, pal.g);
}

// Коліно — точка, де сходяться стегно і гомілка (обираємо розв'язок «коліном вперед»).
function knee(hip, foot, len) {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const d = Math.min(Math.hypot(dx, dy), len * 2 - 0.01);
  const base = Math.atan2(dy, dx);
  const off = Math.acos(d / (2 * len));
  const a = { x: hip.x + Math.cos(base - off) * len, y: hip.y + Math.sin(base - off) * len };
  const b = { x: hip.x + Math.cos(base + off) * len, y: hip.y + Math.sin(base + off) * len };
  return a.x > b.x ? a : b;
}

function leg(ctx, hip, angle, bb, skin, shoe, shorts) {
  const pedal = { x: bb.x + Math.cos(angle) * 3, y: bb.y + Math.sin(angle) * 3 };
  const k = knee(hip, { x: pedal.x, y: pedal.y - 1 }, 5.4);
  line(ctx, bb.x, bb.y, pedal.x, pedal.y, '#3a3a4a');
  thick(ctx, hip, k, 1.1, shorts);
  thick(ctx, k, { x: pedal.x, y: pedal.y - 1 }, 0.7, skin);
  plot(ctx, Math.round(pedal.x), Math.round(pedal.y), shoe);
  plot(ctx, Math.round(pedal.x) + 1, Math.round(pedal.y), shoe);
}

export function drawBike(ctx, palette, frame) {
  const pal = { ...BIKE_PALETTE, ...palette };
  const a = (frame / BIKE_FRAMES) * Math.PI * 2;
  const R = { x: 5, y: 16 }; // заднє колесо
  const F = { x: 20, y: 16 }; // переднє колесо
  const BB = { x: 11, y: 16 }; // каретка
  const S = { x: 9, y: 10 }; // підсідельна труба
  const HT = { x: 17, y: 10 }; // рульова колонка
  const hip = { x: 9, y: 8 };

  wheel(ctx, R.x, R.y, -a, pal);
  wheel(ctx, F.x, F.y, -a, pal);

  // дальня нога — темніша, за рамою
  leg(ctx, hip, a + Math.PI, BB, shade(pal.s, 0.7), shade(pal.L, 0.6), shade(pal.p, 0.8));

  // рама
  line(ctx, R.x, R.y, BB.x, BB.y, pal.f);
  line(ctx, R.x, R.y, S.x, S.y, pal.f);
  line(ctx, BB.x, BB.y, S.x, S.y, pal.f);
  line(ctx, BB.x, BB.y, HT.x, HT.y, pal.f);
  line(ctx, S.x, S.y, HT.x, HT.y, pal.f);
  line(ctx, HT.x, HT.y, F.x, F.y, shade(pal.f, 0.75));
  line(ctx, HT.x, HT.y, 18, 7, pal.m);
  plot(ctx, 19, 7, pal.g);
  plot(ctx, 19, 8, pal.g);
  // сідло
  line(ctx, 7, 9, 10, 9, '#1d1b26');

  // тулуб нахилений вперед: суцільна «капсула» джерсі зі смугою-акцентом
  thick(ctx, { x: 9, y: 7 }, { x: 14, y: 4 }, 1.7, pal.j);
  line(ctx, 9, 6, 14, 3, shade(pal.j, 1.25));
  line(ctx, 10, 8, 14, 5, pal.J);
  thick(ctx, { x: 8.5, y: 8 }, { x: 10, y: 8 }, 1.2, pal.p);
  // рука до керма
  thick(ctx, { x: 14, y: 5 }, { x: 16, y: 6.5 }, 0.8, shade(pal.j, 0.8));
  line(ctx, 17, 7, 18, 7, pal.s);
  // голова і шолом
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      if (x * x + y * y > 5) continue;
      plot(ctx, 16 + x, 2 + y, y <= 0 ? pal.H : pal.s);
    }
  }
  plot(ctx, 14, 1, pal.h);
  plot(ctx, 16, 0, pal.h);
  plot(ctx, 18, 2, pal.H);
  plot(ctx, 17, 3, '#1d1b26');

  // ближня нога
  leg(ctx, hip, a, BB, pal.s, pal.L, pal.p);
}
