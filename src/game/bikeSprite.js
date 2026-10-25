// Велосипедист збоку, що малюється кодом щокадру (чіткими пікселями, без згладжування).
//
// Анімація «як у житті»:
//  • педалі крутяться від швидкості (каденс), а накатом / у повітрі / при гальмуванні — стоять;
//  • колеса обертаються окремо від педалей, на великій швидкості спиці «розмиваються»;
//  • пози: сидячи (ride), стоячи на педалях при розгоні (stand), пригнувшись при гальмуванні (tuck),
//    у польоті (air) — руки й ноги випрямлені;
//  • тулуб підстрибує в такт педалям, «амортизація» просідає при приземленні;
//  • увесь велосипед нахиляється (pitch) у стрибку — точки повертаються ДО растеризації, тож
//    пікселі лишаються чіткими під будь-яким кутом.
// Ноги й руки рахуються зворотною кінематикою (стегно+гомілка, плече+передпліччя).
import { PLAYER_W, PLAYER_H } from './constants.js';

export const BIKE_FRAMES = 8;

// Полотно для малювання з запасом на нахил: локальна коробка 26×22 зміщена на (OX, OY).
export const RIDER_CANVAS = { w: 44, h: 40, ox: 9, oy: 12 };

// Ключі палітри збігаються зі скінами (skins.js): f рама, j джерсі, J смуга, H шолом,
// h вставка шолома, p шорти, L взуття, s шкіра, t шини, m метал.
export const BIKE_PALETTE = {
  t: '#1d1b26', m: '#9aa3b5', g: '#2b2b38', f: '#e8383d', j: '#e8383d', J: '#ffcc33',
  H: '#f4f4f4', h: '#3a3a4a', p: '#24223a', L: '#f4f4f4', s: '#e8b48a',
};

const shadeCache = new Map();
const shade = (hex, k) => {
  const key = hex + k;
  let v = shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const c = (x) => Math.max(0, Math.min(255, Math.round(x * k)));
  v = `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  shadeCache.set(key, v);
  return v;
};

// Опорні точки велосипеда і поз райдера в локальних координатах (коробка 26×22).
const BIKE = {
  R: { x: 5, y: 16 }, // заднє колесо
  F: { x: 20, y: 16 }, // переднє колесо
  BB: { x: 11, y: 16 }, // каретка
  S: { x: 9, y: 10 }, // підсідельний вузол
  HT: { x: 17, y: 10 }, // рульова колонка
  bar: { x: 18.5, y: 7 }, // кермо
};
const POSES = {
  ride: { hip: [9, 8], shoulder: [14, 4], head: [16, 2], hand: [18.5, 7] },
  stand: { hip: [12, 6], shoulder: [16.5, 3.5], head: [18.5, 1.5], hand: [19, 7] },
  tuck: { hip: [8, 8.5], shoulder: [13, 5.5], head: [15.5, 4], hand: [18.5, 7] },
  air: { hip: [10, 7.5], shoulder: [14.5, 3.5], head: [16.5, 1.5], hand: [19, 7] },
};
const PIVOT = { x: 12.5, y: 15 };
const WHEEL_R = 4.9;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} palette   кольори скіна
 * @param {object} st        стан анімації
 * @param {number} st.pedal  кут шатунів (рад)
 * @param {number} st.wheel  кут коліс (рад)
 * @param {number} st.pitch  нахил велосипеда (рад, «−» — ніс угору)
 * @param {'ride'|'stand'|'tuck'|'air'} st.pose
 * @param {number} st.crouch просідання амортизації/тіла (px, −1…3)
 * @param {number} st.bob    підскок тулуба в такт педалям (px)
 * @param {number} st.sway   хитання тулуба вперед-назад, коли стоїш на педалях (px)
 * @param {number} st.blur   0…1 — розмиття спиць на швидкості
 * @param {'all'|'bike'|'rider'} st.part
 */
export function drawRider(ctx, palette, st, ox = RIDER_CANVAS.ox, oy = RIDER_CANVAS.oy, bounds = RIDER_CANVAS) {
  const pal = { ...BIKE_PALETTE, ...palette };
  const cos = Math.cos(st.pitch || 0);
  const sin = Math.sin(st.pitch || 0);
  const T = (x, y) => ({
    x: ox + PIVOT.x + (x - PIVOT.x) * cos - (y - PIVOT.y) * sin,
    y: oy + PIVOT.y + (x - PIVOT.x) * sin + (y - PIVOT.y) * cos,
  });

  const plot = (x, y, c) => {
    if (!c || x < 0 || y < 0 || x >= bounds.w || y >= bounds.h) return;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const line = (a, b, c) => {
    let x0 = Math.round(a.x);
    let y0 = Math.round(a.y);
    const x1 = Math.round(b.x);
    const y1 = Math.round(b.y);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      plot(x0, y0, c);
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
  };
  // «Капсула» — товстий відрізок: усі пікселі ближче r до відрізка ab.
  const thick = (a, b, r, c) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(a.y, b.y) - r); y <= Math.ceil(Math.max(a.y, b.y) + r); y++) {
      for (let x = Math.floor(Math.min(a.x, b.x) - r); x <= Math.ceil(Math.max(a.x, b.x) + r); x++) {
        const t = Math.max(0, Math.min(1, ((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / len2));
        if (Math.hypot(x + 0.5 - (a.x + dx * t), y + 0.5 - (a.y + dy * t)) <= r) plot(x, y, c);
      }
    }
  };
  const disc = (c0, r, color) => {
    for (let y = Math.floor(c0.y - r); y <= Math.ceil(c0.y + r); y++) {
      for (let x = Math.floor(c0.x - r); x <= Math.ceil(c0.x + r); x++) {
        if (Math.hypot(x + 0.5 - c0.x, y + 0.5 - c0.y) <= r) plot(x, y, color(x + 0.5 - c0.x, y + 0.5 - c0.y));
      }
    }
  };
  // Дволанковий «суглоб» (коліно / лікоть): bend > 0 — згин уперед, < 0 — назад/вниз.
  const joint = (a, b, len, bend) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.min(Math.hypot(dx, dy), len * 2 - 0.01);
    const base = Math.atan2(dy, dx);
    const off = Math.acos(d / (2 * len));
    const p = { x: a.x + Math.cos(base - off) * len, y: a.y + Math.sin(base - off) * len };
    const q = { x: a.x + Math.cos(base + off) * len, y: a.y + Math.sin(base + off) * len };
    // обираємо розв'язок за напрямком згину в локальній системі (до нахилу)
    const pick = (pt) => (pt.x - (a.x + b.x) / 2) * cos + (pt.y - (a.y + b.y) / 2) * sin;
    return bend > 0 ? (pick(p) > pick(q) ? p : q) : pick(p) > pick(q) ? q : p;
  };

  const showBike = st.part !== 'rider';
  const showRider = st.part !== 'bike';
  const crouch = st.crouch || 0;
  const sus = Math.max(0, crouch) * 0.4; // просідання вилки/рами
  const pose = POSES[st.pose] ?? POSES.ride;
  const bob = st.bob || 0;
  const sway = st.sway || 0;
  const P = (pt, k = 1) => T(pt[0] + sway * k, pt[1] + crouch * k + bob * k);
  const hip = P(pose.hip, 1);
  const shoulder = P(pose.shoulder, 1.15);
  const head = P(pose.head, 1.15);
  const hand = T(BIKE.bar.x + 0.5, BIKE.bar.y + sus);

  const R = T(BIKE.R.x, BIKE.R.y);
  const F = T(BIKE.F.x, BIKE.F.y);
  const BB = T(BIKE.BB.x, BIKE.BB.y);
  const S = T(BIKE.S.x, BIKE.S.y + sus);
  const HT = T(BIKE.HT.x, BIKE.HT.y + sus);

  const wheel = (c0) => {
    disc(c0, WHEEL_R + 0.1, (x, y) => {
      const d = Math.hypot(x, y);
      if (d > 3.7) return pal.t;
      if (d > 3.0) return pal.m;
      return null;
    });
    const blur = st.blur || 0;
    if (blur < 0.6) {
      const spoke = blur > 0.25 ? '#8a8a98' : '#6a6a7a';
      for (const a of [st.wheel + (st.pitch || 0), st.wheel + (st.pitch || 0) + Math.PI / 2]) {
        const ex = Math.cos(a) * 2.7;
        const ey = Math.sin(a) * 2.7;
        line({ x: c0.x - ex, y: c0.y - ey }, { x: c0.x + ex, y: c0.y + ey }, spoke);
      }
    } else {
      // розмиті спиці — лише світле кільце
      disc(c0, 2.3, (x, y) => (Math.hypot(x, y) > 1.6 ? 'rgba(170, 176, 196, 0.55)' : null));
    }
    plot(Math.floor(c0.x), Math.floor(c0.y), pal.g);
  };
  const pedalPos = (angle) => {
    const lx = BIKE.BB.x + Math.cos(angle) * 3;
    const ly = BIKE.BB.y + Math.sin(angle) * 3;
    return T(lx, ly);
  };
  const leg = (angle, near) => {
    const pedal = pedalPos(angle);
    line(BB, pedal, '#3a3a4a');
    if (!showRider) return;
    const foot = { x: pedal.x, y: pedal.y - 1 };
    const legLen = st.pose === 'stand' ? 6 : 5.5;
    const knee = joint(hip, foot, legLen, 1);
    const skin = near ? pal.s : shade(pal.s, 0.7);
    thick(hip, knee, 1.15, near ? pal.p : shade(pal.p, 0.8));
    thick(knee, foot, 0.75, skin);
    const shoe = near ? pal.L : shade(pal.L, 0.6);
    plot(Math.round(pedal.x), Math.round(pedal.y), shoe);
    plot(Math.round(pedal.x) + 1, Math.round(pedal.y), shoe);
  };

  if (showBike) {
    wheel(R);
    wheel(F);
  }
  leg(st.pedal + Math.PI, false); // дальня нога — за рамою

  if (showBike) {
    line(R, BB, pal.f);
    line(R, S, pal.f);
    line(BB, S, pal.f);
    line(BB, HT, pal.f);
    line(S, HT, pal.f);
    line(HT, F, shade(pal.f, 0.75));
    line(HT, hand, pal.m);
    plot(Math.round(hand.x), Math.round(hand.y), pal.g);
    plot(Math.round(hand.x), Math.round(hand.y) + 1, pal.g);
    // сідло і зірка
    const saddle = T(BIKE.S.x - 1.5, BIKE.S.y - 1 + sus);
    line(saddle, T(BIKE.S.x + 1.5, BIKE.S.y - 1 + sus), '#1d1b26');
    disc(BB, 1.6, (x, y) => (Math.hypot(x, y) > 0.9 ? '#5a5a68' : null));
  }

  if (showRider) {
    // тулуб: суцільна «капсула» джерсі зі смугою-акцентом
    thick(hip, shoulder, 1.7, pal.j);
    const back = { x: (hip.y - shoulder.y) * 0.35, y: -(hip.x - shoulder.x) * 0.35 };
    line({ x: hip.x - back.x * 1.4, y: hip.y - back.y * 1.4 }, { x: shoulder.x - back.x * 1.4, y: shoulder.y - back.y * 1.4 }, shade(pal.j, 1.25));
    line(hip, shoulder, pal.J);
    thick(hip, hip, 1.4, pal.p);
    // рука: плече → лікоть (зігнутий вниз) → кермо
    const elbow = joint(shoulder, hand, st.pose === 'air' ? 3.4 : 3.1, -1);
    thick(shoulder, elbow, 0.85, shade(pal.j, 0.85));
    line(elbow, hand, pal.s);
    // голова: шолом зверху, обличчя знизу, козирок
    disc(head, 2.4, (x, y) => {
      const ly = x * -sin + y * cos; // «вертикаль» у системі велосипеда
      const lx = x * cos + y * sin;
      if (ly < 0.2) return lx > 1.4 ? pal.h : pal.H;
      return lx < -1.2 ? shade(pal.s, 0.8) : pal.s;
    });
    // око (вперед і трохи вниз) та козирок шолома (вперед і трохи вгору)
    plot(Math.floor(head.x + cos * 1.3 - sin * 0.6), Math.floor(head.y + sin * 1.3 + cos * 0.6), '#1d1b26');
    plot(Math.floor(head.x + cos * 2.6 + sin * 0.4), Math.floor(head.y + sin * 2.6 - cos * 0.4), pal.H);
  }

  leg(st.pedal, true); // ближня нога
}

// Статичний кадр для інтерфейсу (гараж, «Як грати»): поза «сидячи», педалі в кадрі frame з 8.
export function drawBike(ctx, palette, frame) {
  drawRider(
    ctx,
    palette,
    { pedal: (frame / BIKE_FRAMES) * Math.PI * 2, wheel: -(frame / BIKE_FRAMES) * Math.PI, pitch: 0, pose: 'ride', crouch: 0, bob: 0, part: 'all' },
    0,
    0,
    { w: PLAYER_W, h: PLAYER_H },
  );
}
