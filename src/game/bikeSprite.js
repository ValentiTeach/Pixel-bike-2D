// Гірський велосипед і райдер збоку — малюються кодом щокадру, чіткими пікселями.
//
// Що робить картинку «реалістичною» в піксель-арті 16 px/м:
//  • геометрія береться з фізики: колеса стоять там, де їх поставила підвіска (видно, як
//    працюють вилка й амортизатор), а нахил рами — справжній кут велосипеда;
//  • вилка телескопічна: «ноги» ковзають по штоках; у даунхілу — подвійна корона;
//  • покришки з грунтозацепами, обід, спиці, гальмівний диск, касета; на швидкості спиці розмиваються;
//  • привід: зірка, ланцюг, шатуни й платформи педалей; педалі крутяться, лише коли райдер крутить;
//  • райдер — скелет з тих самих точок, що й фізичні зіткнення: стегна, плечі, голова; коліна й лікті
//    рахуються зворотною кінематикою; нахил переносить тіло над заднім чи переднім колесом;
//  • кожна частина тіла — «капсула» з об'ємним світлом (зліва згори), тож форма читається при
//    будь-якому куті, навіть у сальто: точки повертаються ДО растеризації.
import { RIDER_CANVAS, PX_PER_M as M } from './constants.js';
import { deriveBike, riderPoint } from './bikePhysics.js';

export { RIDER_CANVAS };

// Ключі палітри збігаються зі скінами (skins.js): j джерсі, J смуга, H шолом, h акцент шолома,
// p шорти, L взуття, s шкіра, g рукавички, k наколінники.
export const RIDER_PALETTE = {
  j: '#e8383d', J: '#ffcc33', H: '#f4f4f4', h: '#3a3a4a', p: '#2a2838', L: '#3a3a44', s: '#e8b48a', g: '#2a2a34', k: '#1d1b26',
};

const shadeCache = new Map();
export const shade = (hex, k) => {
  const key = hex + k;
  let v = shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const c = (x) => Math.max(0, Math.min(255, Math.round(x * k)));
  v = `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  shadeCache.set(key, v);
  return v;
};

const LIGHT = { x: -0.55, y: -0.83 }; // напрям «до сонця»

const derivedCache = new Map();
const derived = (spec) => {
  let P = derivedCache.get(spec.id);
  if (!P) {
    P = deriveBike(spec);
    derivedCache.set(spec.id, P);
  }
  return P;
};

/**
 * Малює велосипед і/або райдера.
 * @param {object} ctx       контекст canvas (або «фейк» із fillRect для тестів)
 * @param {object} spec      велосипед із bikes.js
 * @param {object} pal       палітра райдера (скін)
 * @param {object} st        стан: a (кут), eR/eF (винос коліс, px), spinR/spinF (кут коліс),
 *                           crank, lean, seat, crouch, blur (0…1), part ('all'|'bike'|'rider'),
 *                           pose ('ride'|'crash'), dropper (0…1)
 * @param {number} ox        де на полотні центр мас
 * @param {number} oy
 * @param {{w:number,h:number}} bounds
 */
export function drawBikeRider(ctx, spec, pal, st, ox = RIDER_CANVAS.ox, oy = RIDER_CANVAS.oy, bounds = RIDER_CANVAS) {
  const P = derived(spec);
  const C = spec.colors;
  const R = { ...RIDER_PALETTE, ...pal };
  const cos = Math.cos(st.a || 0);
  const sin = Math.sin(st.a || 0);
  // локальні px (від центру мас) → полотно
  const T = (lx, ly) => ({ x: ox + cos * lx - sin * ly, y: oy + sin * lx + cos * ly });
  // метри від каретки → полотно
  const W = (mx, my) => {
    const [lx, ly] = P.toLocal([mx, my]);
    return T(lx, ly);
  };

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
    for (let i = 0; i < 200; i++) {
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
  // «Капсула» з об'ємним світлом: base — основний тон, світліший/темніший — автоматично.
  const capsule = (a, b, r, base, { hi = null, lo = null, edge = null } = {}) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-6;
    const H = hi ?? shade(base, 1.22);
    const L = lo ?? shade(base, 0.72);
    const E = edge ?? shade(base, 0.5);
    for (let y = Math.floor(Math.min(a.y, b.y) - r); y <= Math.ceil(Math.max(a.y, b.y) + r); y++) {
      for (let x = Math.floor(Math.min(a.x, b.x) - r); x <= Math.ceil(Math.max(a.x, b.x) + r); x++) {
        const t = Math.max(0, Math.min(1, ((x + 0.5 - a.x) * dx + (y + 0.5 - a.y) * dy) / len2));
        const qx = x + 0.5 - (a.x + dx * t);
        const qy = y + 0.5 - (a.y + dy * t);
        const d = Math.hypot(qx, qy);
        if (d > r) continue;
        const nx = d > 1e-3 ? qx / d : 0;
        const ny = d > 1e-3 ? qy / d : 0;
        const lit = (nx * LIGHT.x + ny * LIGHT.y) * Math.min(1, d / Math.max(0.6, r * 0.6));
        let c = base;
        if (r >= 1.2 && d > r - 0.55 && lit < -0.1) c = E;
        else if (lit > 0.4) c = H;
        else if (lit < -0.3) c = L;
        plot(x, y, c);
      }
    }
  };
  const disc = (c0, r, colorFn) => {
    for (let y = Math.floor(c0.y - r); y <= Math.ceil(c0.y + r); y++) {
      for (let x = Math.floor(c0.x - r); x <= Math.ceil(c0.x + r); x++) {
        const fx = x + 0.5 - c0.x;
        const fy = y + 0.5 - c0.y;
        const d = Math.hypot(fx, fy);
        if (d <= r) plot(x, y, colorFn(fx, fy, d));
      }
    }
  };
  // Зворотна кінематика двох ланок (коліно/лікоть). bend > 0 — згин уперед (за напрямком байка).
  const joint = (a, b, l1, l2, bend) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const base = Math.atan2(dy, dx);
    const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1)));
    const off = Math.acos(cosA);
    const p = { x: a.x + Math.cos(base - off) * l1, y: a.y + Math.sin(base - off) * l1 };
    const q = { x: a.x + Math.cos(base + off) * l1, y: a.y + Math.sin(base + off) * l1 };
    // напрям «уперед» у системі велосипеда
    const fwd = (pt) => (pt.x - (a.x + b.x) / 2) * cos + (pt.y - (a.y + b.y) / 2) * sin;
    return bend > 0 ? (fwd(p) > fwd(q) ? p : q) : fwd(p) > fwd(q) ? q : p;
  };

  const showBike = st.part !== 'rider';
  const showRider = st.part !== 'bike';
  const crash = st.pose === 'crash';

  // ---------- Геометрія велосипеда ----------
  const hubOf = (def, e) => T(def.T[0] + def.u[0] * e, def.T[1] + def.u[1] * e);
  const eR = st.eR ?? P.rear.L * 0.7;
  const eF = st.eF ?? P.front.L * 0.7;
  const hubR = hubOf(P.rear, eR);
  const hubF = hubOf(P.front, eF);
  const BB = W(0, 0);
  const uf = { x: cos * P.front.u[0] - sin * P.front.u[1], y: sin * P.front.u[0] + cos * P.front.u[1] };
  // корона вилки закріплена на рамі: це верх «повністю стиснутої» вилки мінус запас
  const fT = T(P.front.T[0], P.front.T[1]);
  const crownGap = 0.34 * M; // від осі (повний стиск) до корони
  const crown = { x: fT.x - uf.x * crownGap, y: fT.y - uf.y * crownGap };
  const htTop = { x: crown.x - uf.x * 0.13 * M, y: crown.y - uf.y * 0.13 * M };
  const bar = W(spec.wheelbase - spec.chainstay - 0.2, -0.74 - (spec.dualCrown ? 0.03 : 0));
  const stDir = { x: -0.29, y: -0.957 };
  const stTop = W(stDir.x * 0.4, stDir.y * 0.4);
  const stMid = W(stDir.x * 0.22, stDir.y * 0.22);
  const dropper = st.dropper ?? 0;
  const post = 0.06 + 0.15 * dropper;
  const saddle = W(stDir.x * (0.4 + post), stDir.y * (0.4 + post));
  const R0 = P.R;
  const tireT = Math.max(1.6, Math.min(3.2, (spec.tire / 2.4) * 1.9));

  const wheel = (c0, spin, front) => {
    const blur = st.blur || 0;
    disc(c0, R0, (fx, fy, d) => {
      if (d > R0 - tireT) {
        // покришка: грунтозацепи — лише відтінок зовнішнього краю, що обертається з колесом
        const lit = (fx * LIGHT.x + fy * LIGHT.y) / d;
        if (d > R0 - 0.8 && blur < 0.5) {
          const ang = Math.atan2(fy, fx) - spin;
          if (Math.floor(((ang / (Math.PI * 2)) * 24 + 240) % 2)) return lit > 0.5 ? '#3a3844' : '#1a1820';
        }
        return lit > 0.55 ? '#55505e' : '#2a2832';
      }
      if (d > R0 - tireT - 0.75) return (fx * LIGHT.x + fy * LIGHT.y) / d > 0.3 ? shade(C.rim, 1.8) : C.rim;
      return null;
    });
    if (blur < 0.55) {
      const sc = blur > 0.25 ? 'rgba(200, 204, 214, 0.55)' : 'rgba(190, 196, 208, 0.85)';
      for (let i = 0; i < 4; i++) {
        const a = spin + (i * Math.PI) / 4;
        const ex = Math.cos(a) * (R0 - tireT - 0.6);
        const ey = Math.sin(a) * (R0 - tireT - 0.6);
        line({ x: c0.x - ex, y: c0.y - ey }, { x: c0.x + ex, y: c0.y + ey }, sc);
      }
    } else {
      disc(c0, R0 - tireT - 0.6, (fx, fy, d) => (d > 1.4 ? 'rgba(170, 176, 196, 0.35)' : null));
    }
    // гальмівний диск і втулка
    disc(c0, 1.6, (fx, fy, d) => (d > 0.9 ? '#b8bcc8' : '#3a3a44'));
    if (!front) plot(Math.floor(c0.x), Math.floor(c0.y), '#8a8e9a');
  };

  // ---------- Райдер ----------
  const pt = (name) => {
    const [mx, my] = riderPoint(name, st.lean || 0, st.seat || 0, st.crouch || 0);
    return W(mx, my);
  };
  let hip;
  let shoulder;
  let head;
  let handN;
  let handF;
  let footN;
  let footF;
  if (crash) {
    // «регдол» без велосипеда: руки й ноги розкидані
    hip = W(-0.05, -0.7);
    shoulder = W(0.3, -1.05);
    head = W(0.44, -1.2);
    handN = W(0.62, -0.78);
    handF = W(0.1, -1.38);
    footN = W(0.26, -0.08);
    footF = W(-0.42, -0.24);
  } else {
    hip = pt('hip');
    shoulder = pt('shoulder');
    head = pt('head');
    handN = bar;
    handF = { x: bar.x - 0.5, y: bar.y + 0.3 };
  }
  const crank = st.crank || 0;
  const crankLen = 0.17 * M;
  const pedalAt = (ang) => {
    // шатун крутиться в площині рами
    const lx = Math.cos(ang) * crankLen;
    const ly = Math.sin(ang) * crankLen;
    return { x: BB.x + cos * lx - sin * ly, y: BB.y + sin * lx + cos * ly };
  };
  const pedalN = pedalAt(crank);
  const pedalF = pedalAt(crank + Math.PI);
  if (!crash) {
    // ступня стоїть на педалі (трохи вище осі педалі)
    footN = { x: pedalN.x - sin * -1, y: pedalN.y - cos * 1 };
    footF = { x: pedalF.x - sin * -1, y: pedalF.y - cos * 1 };
  }
  const thigh = 0.46 * M;
  const shin = 0.47 * M;
  const upper = 0.3 * M;
  const fore = 0.29 * M;

  const leg = (foot, near) => {
    const knee = joint(hip, foot, thigh, shin, 1);
    const k = near ? 1 : 0.68;
    capsule(hip, knee, 1.45, shade(R.p, k));
    capsule(knee, foot, 1.05, shade(R.p, k * 0.92));
    // наколінник
    capsule({ x: knee.x + (foot.x - knee.x) * 0.12, y: knee.y + (foot.y - knee.y) * 0.12 }, { x: knee.x + (foot.x - knee.x) * 0.4, y: knee.y + (foot.y - knee.y) * 0.4 }, 1.25, shade(R.k, k));
    // взуття
    const toe = { x: foot.x + cos * 1.6, y: foot.y + sin * 1.6 };
    capsule({ x: foot.x - cos * 0.6, y: foot.y - sin * 0.6 }, toe, 0.85, shade(R.L, k));
  };
  const arm = (hand, near) => {
    const elbow = joint(shoulder, hand, upper, fore, -1);
    const k = near ? 1 : 0.66;
    capsule(shoulder, elbow, 1.15, shade(R.j, k));
    capsule(elbow, hand, 0.95, shade(R.j, k * 0.95));
    capsule(hand, hand, 1.0, shade(R.g, k));
  };

  // ---------- Порядок малювання (ззаду наперед) ----------
  if (showRider) {
    leg(footF, false);
    arm(handF, false);
  }
  if (showBike) {
    wheel(hubR, st.spinR || 0, false);
    wheel(hubF, st.spinF || 0, true);
    // дальній шатун і педаль
    line(BB, pedalF, '#3a3a44');
    capsule(pedalF, pedalF, 0.9, '#4a4a54');
    // ланцюг і зірка
    const ring = 0.075 * M;
    const top0 = { x: BB.x + sin * ring, y: BB.y - cos * ring };
    const top1 = { x: hubR.x + sin * 1.2, y: hubR.y - cos * 1.2 };
    line(top0, top1, '#6a6a74');
    line({ x: BB.x - sin * ring * 0.7, y: BB.y + cos * ring * 0.7 }, { x: hubR.x - sin * 0.8, y: hubR.y + cos * 0.8 }, '#4a4a54');
    disc(hubR, 1.3, (fx, fy, d) => (d > 0.7 ? '#9a9eaa' : null)); // касета
    // заднє перо й верхні пера
    const stay = W(stDir.x * 0.3, stDir.y * 0.3);
    capsule(BB, hubR, 1.0, C.frame2);
    capsule(hubR, stay, 0.75, C.frame2);
    // підсідельна труба, підсідельний штир і сідло
    capsule(BB, stTop, 1.1, C.frame);
    capsule(stTop, saddle, 0.6, '#2a2a34', { hi: '#5a5a64' });
    const sBack = { x: saddle.x - cos * 2.2 + sin * 0.4, y: saddle.y - sin * 2.2 - cos * 0.4 };
    const sFront = { x: saddle.x + cos * 1.8, y: saddle.y + sin * 1.8 };
    capsule(sBack, sFront, 0.75, '#1d1b26', { hi: '#4a4a54' });
    // амортизатор (у двопідвісів)
    if (spec.travelR > 0) {
      const sa = W(0.1, -0.2);
      const sb = stMid;
      const k = Math.max(0, Math.min(1, (eR / Math.max(1, P.rear.L)) * 0.6 + 0.2));
      const mid = { x: sa.x + (sb.x - sa.x) * (0.45 + k * 0.15), y: sa.y + (sb.y - sa.y) * (0.45 + k * 0.15) };
      capsule(sa, mid, 1.15, C.shock);
      capsule(mid, sb, 0.6, '#d8dce6');
    }
    // батарея е-байка в нижній трубі
    // нижня і верхня труби (нижня — найтовща)
    capsule(BB, crown, spec.battery ? 2.0 : 1.45, C.frame);
    if (spec.battery) capsule(W(0.12, -0.12), W(0.32, -0.38), 1.0, '#1d1b26', { hi: '#3a3a44' });
    const ttEnd = { x: htTop.x + uf.x * 0.03 * M, y: htTop.y + uf.y * 0.03 * M };
    capsule(stTop, ttEnd, 1.05, C.frame);
    // наклейка на нижній трубі
    const dA = { x: BB.x + (crown.x - BB.x) * 0.35, y: BB.y + (crown.y - BB.y) * 0.35 };
    const dB = { x: BB.x + (crown.x - BB.x) * 0.6, y: BB.y + (crown.y - BB.y) * 0.6 };
    line(dA, dB, C.decal);
    // рульова колона
    capsule(crown, htTop, 1.3, C.frame);
    // вилка: штоки від корони, «ноги» від осі
    const lowerLen = 0.32 * M;
    const lowerTop = { x: hubF.x - uf.x * lowerLen, y: hubF.y - uf.y * lowerLen };
    capsule(crown, lowerTop, 0.85, C.stanchion, { hi: '#ffffff' });
    capsule(lowerTop, hubF, 1.15, C.fork);
    capsule(crown, crown, 1.3, C.fork);
    if (spec.dualCrown) {
      const upperCrown = { x: htTop.x - uf.x * 0.5, y: htTop.y - uf.y * 0.5 };
      capsule(crown, upperCrown, 0.8, C.stanchion, { hi: '#ffffff' });
      capsule(upperCrown, upperCrown, 1.2, C.fork);
    }
    // винос і кермо
    capsule(htTop, bar, 0.75, '#2a2a34', { hi: '#5a5a64' });
    capsule(bar, bar, 1.0, '#1d1b26');
    // каретка, зірка і ближній шатун з педаллю
    disc(BB, 1.5, (fx, fy, d) => (d > 0.8 ? '#5a5a66' : '#2a2a34'));
    line(BB, pedalN, '#8a8e9a');
    capsule({ x: pedalN.x - cos * 1, y: pedalN.y - sin * 1 }, { x: pedalN.x + cos * 1, y: pedalN.y + sin * 1 }, 0.7, '#3a3a44');
  }
  if (showRider) {
    // тулуб: джерсі з об'ємом, смуга-акцент і гідратор на спині
    const tl = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y) || 1;
    const back = { x: (shoulder.y - hip.y) / tl, y: -(shoulder.x - hip.x) / tl }; // «за спиною»
    const pa = { x: hip.x + (shoulder.x - hip.x) * 0.4 + back.x * 1.7, y: hip.y + (shoulder.y - hip.y) * 0.4 + back.y * 1.7 };
    const pb = { x: hip.x + (shoulder.x - hip.x) * 0.82 + back.x * 1.7, y: hip.y + (shoulder.y - hip.y) * 0.82 + back.y * 1.7 };
    capsule(pa, pb, 1.15, '#2a2a34', { hi: '#4a4a54' }); // рюкзак-гідратор
    capsule(hip, shoulder, 2.05, R.j);
    line({ x: hip.x + (shoulder.x - hip.x) * 0.2, y: hip.y + (shoulder.y - hip.y) * 0.2 }, { x: hip.x + (shoulder.x - hip.x) * 0.85, y: hip.y + (shoulder.y - hip.y) * 0.85 }, R.J);
    capsule(hip, hip, 1.7, R.p);
    leg(footN, true);
    // шия
    capsule(shoulder, { x: shoulder.x + (head.x - shoulder.x) * 0.5, y: shoulder.y + (head.y - shoulder.y) * 0.5 }, 0.9, shade(R.s, 0.85));
    // голова: шолом (зверху), обличчя, окуляри / підборідник інтегрального шолома
    const hr = 2.55;
    disc(head, hr + 0.2, (fx, fy, d) => {
      const ly = fx * -sin + fy * cos; // «вертикаль» у системі байка
      const lx = fx * cos + fy * sin; // «уперед»
      const lit = (fx * LIGHT.x + fy * LIGHT.y) / Math.max(0.5, d);
      if (spec.fullFace) {
        if (lx > 0.9 && ly > -0.6 && ly < 0.9) return lx > 1.7 ? '#1d1b26' : '#3a3a48'; // окуляри
        if (ly > 0.9 && lx > -0.4) return d > hr - 0.4 ? shade(R.H, 0.6) : R.H; // підборідник
      } else if (ly > 0.15 && lx > -0.3) {
        return lx > 1.4 && ly < 1.1 ? shade(R.s, 0.8) : R.s; // обличчя
      }
      if (d > hr - 0.35 && lit < 0) return shade(R.H, 0.55);
      if (lit > 0.5) return shade(R.H, 1.15);
      if (lx < -1.2 && ly < 0.4) return R.h; // акцент шолома ззаду
      return R.H;
    });
    // козирок
    const visor = { x: head.x + cos * 2.4 + sin * 1.6, y: head.y + sin * 2.4 - cos * 1.6 };
    line({ x: head.x + cos * 0.8 + sin * 2.2, y: head.y + sin * 0.8 - cos * 2.2 }, visor, R.h);
    if (!spec.fullFace) plot(Math.round(head.x + cos * 1.6 - sin * 0.4), Math.round(head.y + sin * 1.6 + cos * 0.4), '#1d1b26');
    arm(handN, true);
  }
}

// Стан для статичного кадру (гараж, «Як грати»): байк рівно, підвіска в «сагу», педалі — кадр frame з 8.
export function previewState(spec, frame = 0) {
  const P = derived(spec);
  return {
    a: 0,
    eR: P.rear.L * 0.7,
    eF: P.front.L * 0.7,
    spinR: -frame * 0.4,
    spinF: -frame * 0.4,
    crank: (frame / 8) * Math.PI * 2,
    lean: 0,
    seat: 1,
    crouch: 0,
    dropper: 1,
    part: 'all',
  };
}

export const BIKE_FRAMES = 8;
