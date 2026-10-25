// Погодні частинки (в екранних координатах): дощ, сніг, листя, піщаний вітер.
// Коли камера їде вправо, частинки зміщуються вліво — з різною «глибиною» (паралакс).
import { VIEW_W, VIEW_H } from './constants.js';

const COUNTS = { rain: 90, snow: 70, leaves: 18, sand: 50 };
const LEAF_COLORS = ['#e07a2a', '#f2a94a', '#b8541e', '#d9c040'];
const SAND_COLORS = ['#fff0c8', '#f6dc9e', '#e9c47c'];

function makeParticle(type, rng, anywhere) {
  const x = anywhere ? rng.range(0, VIEW_W) : rng.range(0, VIEW_W + 40);
  const y = anywhere ? rng.range(0, VIEW_H) : rng.range(-20, -4);
  const depth = rng.range(0.4, 1); // ближчі частинки рухаються швидше
  switch (type) {
    case 'rain':
      return { x, y, vx: -40, vy: rng.range(240, 320) * depth, len: rng.int(3, 6), depth };
    case 'snow':
      return { x, y, vx: -6, vy: rng.range(14, 30) * depth, size: depth > 0.8 ? 2 : 1, phase: rng.range(0, 6.28), depth };
    case 'leaves':
      return { x, y, vx: -10, vy: rng.range(12, 22), color: rng.pick(LEAF_COLORS), phase: rng.range(0, 6.28), depth };
    case 'sand':
      return {
        x: anywhere ? x : VIEW_W + rng.range(2, 30),
        y: rng.range(20, VIEW_H),
        vx: -rng.range(110, 190),
        vy: rng.range(-6, 6),
        color: rng.pick(SAND_COLORS),
        len: rng.int(1, 3),
        depth,
      };
    default:
      return null;
  }
}

export function createWeather(type, rng) {
  if (!type || !COUNTS[type]) return null;
  const parts = [];
  for (let i = 0; i < COUNTS[type]; i++) parts.push(makeParticle(type, rng, true));
  return { type, parts };
}

export function updateWeather(w, dt, camDx, rng, time) {
  if (!w) return;
  for (let i = 0; i < w.parts.length; i++) {
    const p = w.parts[i];
    const sway = p.phase !== undefined ? Math.sin(time * 2 + p.phase) * 12 : 0;
    p.x += (p.vx + sway) * dt - camDx * p.depth;
    p.y += p.vy * dt;
    if (p.x < -10) p.x += VIEW_W + 20;
    if (p.x > VIEW_W + 40 && w.type !== 'sand') p.x -= VIEW_W + 40;
    if (p.y > VIEW_H + 6 || (w.type === 'sand' && p.x < -6)) w.parts[i] = makeParticle(w.type, rng, false);
  }
}
