// «Бот»-райдер: їздить трасою як обережний живий гравець. Використовується для демо на фоні меню
// і в тестах — щоб перевірити, що кожна траса прохідна, а цільовий час реальний.
//  • швидкість: тримає очікувану швидкість траси, а перед фічами — розрахункову (підказки генератора);
//  • у повітрі: передбачає точку приземлення і вирівнює байк під схил приземлення;
//  • на землі: гасить випадкові вілі/стопі, відкидається назад, коли переднє колесо з'їжджає з краю;
//  • перед колодою — банні-хоп.
import { PX_PER_M as M, GRAVITY } from './constants.js';

const TAU = Math.PI * 2;
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Очікувана швидкість «звичайного» райдера в точці x (з журналу генератора).
function typicalSpeed(gen, x) {
  const s = gen.speeds;
  if (!s.length) return 6;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].x < x) lo = mid + 1;
    else hi = mid;
  }
  return s[lo].v;
}

// Цільова швидкість з урахуванням підказок попереду (стрибки, дропи, кам'яні сади).
export function targetSpeed(world, x, v) {
  const gen = world.gen;
  let target = Math.min(typicalSpeed(gen, x + 3 * M), gen.cap);
  const lead = (Math.max(v, 4) * 1.6 + 6) * M;
  for (const h of gen.plan) {
    if (h.x1 < x || h.x0 > x + lead) continue;
    // ближча підказка — пріоритетніша; швидкість перед стрибком — точна
    target = h.v;
    break;
  }
  return target;
}

// Де і коли центр мас торкнеться землі (балістика).
export function predictLanding(world) {
  const b = world.bike;
  const t = world.track;
  const clear = b.P.R + (b.P.rear.T[1] + b.P.rear.u[1] * b.P.rear.L * 0.7);
  let x = b.x;
  let y = b.y;
  let vx = b.vx;
  let vy = b.vy;
  const dt = 1 / 60;
  for (let i = 0; i < 240; i++) {
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    if (y >= t.heightAt(x) - clear) return { x, t: i * dt, slope: landingSlope(t, x) };
  }
  return { x, t: 4, slope: landingSlope(t, x) };
}

// Ухил у точці приземлення; якщо там стінка (геп, уступ) — беремо поверхню трохи далі.
function landingSlope(t, x) {
  for (const off of [0, 1.2, 2.4, 3.6]) {
    const s = t.slopeAt(x + off * M, 1.6 * M);
    if (s > -0.75 && s < 1.0) return s;
  }
  return 0.2;
}

export function botInput(world) {
  const b = world.bike;
  const t = world.track;
  const v = b.speed / M;
  const out = { pedal: 0, brake: 0, lean: 0, hop: false };

  if (!b.grounded) {
    // «час до приземлення»: обираємо кутову швидкість, з якою байк стане паралельно схилу якраз
    // до торкання, і нахилом наближаємо до неї (без розгойдування)
    const land = predictLanding(world);
    const target = land.slope + 0.04;
    const err = wrap(b.a - target);
    const wDes = -err / Math.max(0.22, land.t * 0.7);
    out.lean = clamp((wDes - b.w) * 0.7, -1, 1);
    return out;
  }

  const target = targetSpeed(world, b.x, v);
  if (v < target - 0.25) out.pedal = 1;
  else if (v > target + 0.4) out.brake = clamp((v - target) * 0.7, 0.25, 1);

  // баланс на землі
  const slope = t.slopeAt(b.x, 1.4 * M);
  const rel = wrap(b.a - slope);
  // м'якше для легких коротких байків — інакше «розгойдуємо» їх самі
  const gain = clamp((b.P.I / (b.P.m * 16 * 16)) / 0.13, 0.55, 1);
  if (b.rear.contact && !b.front.contact) {
    // переднє колесо в повітрі: або випадкове вілі (ніс угору), або з'їзд з краю (ніс униз)
    if (Math.abs(rel) > 0.05 || Math.abs(b.w) > 1) out.lean = clamp(-(rel * 3 + b.w * 0.55) * gain, -1, 1);
    if (rel < -0.05) out.pedal = 0;
  } else if (b.front.contact && !b.rear.contact) {
    if (Math.abs(rel) > 0.05 || Math.abs(b.w) > 1) out.lean = clamp(-(rel * 2.8 + b.w * 0.55) * gain, -1, 1);
    out.brake = 0;
  } else {
    out.lean = clamp(-(rel * 1.2 + b.w * 0.25), -0.5, 0.5);
    if (slope > 0.35) out.lean = Math.min(out.lean, -0.25);
  }

  // край дропа попереду (різкий злам схилу вниз): відкидаємось назад заздалегідь
  const fx0 = b.front.hx;
  const h0 = t.heightAt(fx0);
  const h1 = t.heightAt(fx0 + 0.7 * M);
  const h2 = t.heightAt(fx0 + 1.4 * M);
  if (h2 - h1 - (h1 - h0) > 0.3 * M && b.front.contact) out.lean = Math.min(out.lean, -0.5);

  // застряг перед каменем — підстрибуємо
  if (v < 0.6 && out.pedal) {
    world.botStuck = (world.botStuck ?? 0) + 1;
    if (world.botStuck > 60) {
      out.hop = true;
      world.botStuck = 0;
    }
  } else world.botStuck = 0;

  // колода: банні-хоп, коли переднє колесо за ~1 м до неї
  const fx = b.front.hx;
  for (const e of world.entities) {
    if (e.kind !== 'log' || e.x < fx || e.x > fx + 3 * M) continue;
    const gap = e.x - e.r - fx;
    if (gap > 0.5 * M && gap < 0.5 * M + v * M * 0.12 && v > 2.5) out.hop = true;
  }
  return out;
}
