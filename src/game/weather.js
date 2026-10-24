// Погодні частинки: дощ, сніг, листя, піщаний вітер.
import { VIEW_W, VIEW_H } from './constants.js';

const COUNTS = { rain: 70, snow: 60, leaves: 16, sand: 45 };
const LEAF_COLORS = ['#e07a2a', '#f2a94a', '#b8541e', '#d9c040'];
const SAND_COLORS = ['#f6dc9e', '#e9c47c', '#fff0c8'];
// наскільки частинка «їде» разом із землею
const SCROLL_FACTOR = { rain: 0.25, snow: 0.55, leaves: 0.7, sand: 0.35 };

function makeParticle(type, rng, anywhere) {
  const x = rng.range(-10, VIEW_W + 10);
  const y = anywhere ? rng.range(-10, VIEW_H) : rng.range(-24, -4);
  switch (type) {
    case 'rain':
      return { x, y, vx: -35, vy: rng.range(260, 340), len: rng.int(3, 5) };
    case 'snow':
      return { x, y, vx: rng.range(-8, 8), vy: rng.range(16, 32), size: rng.chance(0.3) ? 2 : 1, phase: rng.range(0, 6.28) };
    case 'leaves':
      return { x, y, vx: rng.range(-10, 10), vy: rng.range(12, 22), color: rng.pick(LEAF_COLORS), phase: rng.range(0, 6.28) };
    case 'sand':
      return {
        x: anywhere ? x : rng.range(-30, -4),
        y: rng.range(0, VIEW_H),
        vx: rng.range(90, 160),
        vy: rng.range(-4, 8),
        color: rng.pick(SAND_COLORS),
        len: rng.int(1, 3),
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

export function updateWeather(w, dt, scroll, rng, time) {
  if (!w) return;
  const f = SCROLL_FACTOR[w.type];
  for (let i = 0; i < w.parts.length; i++) {
    const p = w.parts[i];
    const sway = p.phase !== undefined ? Math.sin(time * 2 + p.phase) * 14 : 0;
    p.x += (p.vx + sway) * dt;
    p.y += p.vy * dt + scroll * f;
    if (p.y > VIEW_H + 10 || p.x > VIEW_W + 34 || p.x < -34) w.parts[i] = makeParticle(w.type, rng, false);
  }
}
