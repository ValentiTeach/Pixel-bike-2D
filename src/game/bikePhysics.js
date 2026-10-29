// Фізика гірського велосипеда (вид збоку).
//
// Модель — «рама + безмасові колеса на підвісці», як у симуляторах авто:
//  • рама разом із райдером — одне тверде тіло (маса, момент інерції, кут, кутова швидкість);
//  • кожне колесо ковзає вздовж осі підвіски (вилка йде під кутом рульової колони, задній
//    амортизатор — майже вертикально). Де саме стоїть колесо, визначає «каст» кола вздовж осі
//    до поверхні — тож колесо обходить каміння, корені й гострі краї уступів;
//  • пружина з прогресією і демпфер (окремо стиск/відбій, «пробій» на швидкому стиску);
//  • колеса обертаються: педалі крутять заднє колесо, гальма гальмують обертання, а тертя шини
//    перетворює обертання на рух. Зчеплення залежить від матеріалу (ґрунт, камінь, лід, пісок…);
//  • нахил райдера: на землі переносить вагу (вілі/стопі), у повітрі — крутить байк (фліпи);
//  • якщо голова чи тулуб райдера торкнулися землі або підвіска «пробилась» на надто жорсткому
//    приземленні — падіння.
// Усі параметри задаються в справжніх одиницях (bikes.js) і тут переводяться в пікселі.
import { PX_PER_M, GRAVITY } from './constants.js';
import { RIDER_MASS } from './bikes.js';
import { MATERIALS, MAT } from './terrain.js';

const M = PX_PER_M;
const SAG = 0.3; // просідання підвіски під вагою райдера
const PROG = 1.3; // прогресія пружини (повітряна камера жорсткішає в кінці ходу)
const ITER = 8;
const AIR_ALPHA = 17; // рад/с² — кутове прискорення від нахилу в повітрі
const AIR_SPIN_MAX = 9; // рад/с
const GROUND_LEAN = 430; // Н·м — перенесення ваги: трохи більше, ніж треба, щоб відірвати переднє колесо
const HOP_V = 2.6 * M; // px/с — банні-хоп (~35 см)
const HARD_LANDING = 5.2 * M; // px/с — «пробій» сильніший за цей — падіння

// Поза райдера (м, від каретки, y — вниз): нейтральна «атакувальна» стійка, нахил назад/вперед, сидячи.
export const RIDER_POSES = {
  attack: { hip: [-0.1, -0.84], shoulder: [0.2, -1.24], head: [0.31, -1.42] },
  back: { hip: [-0.42, -0.72], shoulder: [-0.07, -1.06], head: [0.03, -1.26] },
  forward: { hip: [0.08, -0.9], shoulder: [0.43, -1.14], head: [0.58, -1.27] },
  seated: { hip: [-0.2, -0.8], shoulder: [0.16, -1.28], head: [0.27, -1.47] },
};

const lerp = (a, b, t) => a + (b - a) * t;

// Позиція точки скелета для нахилу lean (−1…1), «сидячи» seat (0…1) і присідання crouch (м).
export function riderPoint(name, lean, seat, crouch) {
  const a = RIDER_POSES.attack[name];
  const t = lean < 0 ? RIDER_POSES.back[name] : RIDER_POSES.forward[name];
  const k = Math.abs(lean);
  let x = lerp(a[0], t[0], k);
  let y = lerp(a[1], t[1], k);
  if (seat > 0) {
    const s = RIDER_POSES.seated[name];
    x = lerp(x, s[0], seat);
    y = lerp(y, s[1], seat);
  }
  const down = name === 'hip' ? 1 : 1.25;
  return [x, y + crouch * down];
}

// Перераховує характеристики велосипеда (bikes.js) у пікселі та локальну систему рами.
export function deriveBike(spec, riderMass = RIDER_MASS) {
  const ha = (spec.headAngle * Math.PI) / 180;
  const uf = [Math.cos(ha), Math.sin(ha)];
  const ulen = Math.hypot(-0.1, 1);
  const ur = [-0.1 / ulen, 1 / ulen];
  const hubR = [-spec.chainstay, -spec.hubRise];
  const hubF = [spec.wheelbase - spec.chainstay, -spec.hubRise];
  // у хардтейла задньої підвіски нема: удар гасять покришка і ноги райдера (~5 см), тож
  // «підвіска» коротка, а демпфування сильніше
  const Lr = Math.max(spec.travelR, 0.05);
  const hardtail = spec.travelR <= 0;
  const Lf = spec.travelF;
  // центр мас: райдер у стійці + велосипед
  const riderCom = [-0.02, -0.68];
  const bikeCom = [0.14, -0.24];
  // підвіска налаштована під вагу райдера; без райдера (після падіння) байк легкий і «стрибучий»
  const mFull = RIDER_MASS + spec.mass;
  const comFull = [(riderCom[0] * RIDER_MASS + bikeCom[0] * spec.mass) / mFull, (riderCom[1] * RIDER_MASS + bikeCom[1] * spec.mass) / mFull];
  const m = riderMass + spec.mass;
  const com = [(riderCom[0] * riderMass + bikeCom[0] * spec.mass) / m, (riderCom[1] * riderMass + bikeCom[1] * spec.mass) / m];
  const d2 = (p) => (p[0] - com[0]) ** 2 + (p[1] - com[1]) ** 2;
  const I = riderMass * (0.31 ** 2 + d2(riderCom)) + spec.mass * (0.42 ** 2 + d2(bikeCom));
  // статичний розподіл ваги між колесами
  const loadR = (hubF[0] - comFull[0]) / (hubF[0] - hubR[0]);
  const loadF = 1 - loadR;
  const spring = (load, L) => (load * mFull * 9.81) / (SAG * L * (1 + PROG * SAG * SAG));
  const kR = spring(loadR, Lr);
  const kF = spring(loadF, Lf);
  const R = spec.wheelR;
  const mw = 1.9 + (spec.tire - 2.4) * 0.3;
  const toLocal = (p) => [(p[0] - com[0]) * M, (p[1] - com[1]) * M];
  const wheel = (hub, u, L, k, load, damp = 1) => {
    const top = [hub[0] - u[0] * L * (1 - SAG), hub[1] - u[1] * L * (1 - SAG)];
    return {
      T: toLocal(top),
      u,
      L: L * M,
      k,
      c: damp * spec.damping * 2 * Math.sqrt(k * mFull * load),
      rigidFrame: false,
    };
  };
  const rearDef = wheel(hubR, ur, Lr, kR, loadR, hardtail ? 1.5 : 1);
  rearDef.rigidFrame = hardtail;
  return {
    spec,
    m,
    I: I * M * M,
    R: R * M,
    Rm: R,
    Iw: mw * R * R * 0.85 * M * M,
    com,
    toLocal,
    rear: rearDef,
    front: wheel(hubF, uf, Lf, kF, loadF),
    bb: toLocal([0, 0]),
  };
}

const matGrip = (spec, mat, env) => {
  const M0 = MATERIALS[mat] ?? MATERIALS[0];
  let g = env.wet && M0.wetGrip ? M0.wetGrip : M0.grip;
  if (env.wet) g *= 0.88;
  g *= spec.grip * (spec.gripMat?.[M0.id] ?? 1);
  return g * (env.gripMul ?? 1);
};
const matRoll = (spec, mat) => {
  const M0 = MATERIALS[mat] ?? MATERIALS[0];
  return M0.roll * (spec.rollMat?.[M0.id] ?? 1);
};

export class BikeBody {
  constructor(spec) {
    this.P = deriveBike(spec);
    this.spec = spec;
    this.x = 0;
    this.y = 0;
    this.a = 0; // кут рами (рад): «+» — ніс униз
    this.vx = 0;
    this.vy = 0;
    this.w = 0;
    this.lean = 0;
    this.seat = 0;
    this.crouch = 0; // присідання райдера (м) — «ноги» гасять удар
    this.crouchV = 0;
    this.crank = 0;
    this.pedaling = false;
    this.braking = false;
    this.hopCool = 0;
    this.hopT = 0;
    this.impact = 0;
    this.wheels = [this.makeWheel(this.P.rear, 'rear'), this.makeWheel(this.P.front, 'front')];
  }

  makeWheel(def, id) {
    return {
      id,
      def,
      e: def.L,
      s: 0,
      sPrev: 0,
      spin: 0,
      angle: 0,
      contact: null,
      rigid: false,
      load: 0,
      skid: false,
      hx: 0,
      hy: 0,
      airTime: 0,
    };
  }

  get rear() {
    return this.wheels[0];
  }

  get front() {
    return this.wheels[1];
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  get grounded() {
    return this.rear.contact !== null || this.front.contact !== null;
  }

  // Локальна точка рами (px від центру мас) → світові координати.
  toWorld(lx, ly) {
    const c = Math.cos(this.a);
    const s = Math.sin(this.a);
    return [this.x + c * lx - s * ly, this.y + s * lx + c * ly];
  }

  // Точка скелета райдера у світі (для зіткнень і малювання).
  riderWorld(name) {
    const [mx, my] = riderPoint(name, this.lean, this.seat, this.crouch);
    const [lx, ly] = this.P.toLocal([mx, my]);
    return this.toWorld(lx, ly);
  }

  // Ставить велосипед на поверхню в точці x: колеса на землі, кут — уздовж схилу.
  place(track, x) {
    const P = this.P;
    const ang = track.slopeAt(x + 2, P.R * 3);
    this.a = ang;
    this.vx = this.vy = this.w = 0;
    this.lean = 0;
    this.crouch = 0;
    this.crouchV = 0;
    this.impact = 0;
    const hubY = P.rear.T[1] + P.rear.u[1] * P.rear.L * (1 - SAG);
    this.x = x;
    this.y = track.heightAt(x) - P.R - hubY - 1;
    for (const wh of this.wheels) {
      wh.spin = 0;
      wh.contact = null;
      wh.skid = false;
    }
    // даємо підвісці «осісти»
    for (let i = 0; i < 90; i++) {
      this.step(1 / 240, { pedal: 0, brake: 1, lean: 0 }, track, {});
      this.vx *= 0.9;
      this.w *= 0.9;
    }
    this.vx = this.vy = this.w = 0;
    for (const wh of this.wheels) wh.spin = 0;
  }

  // Шукає, на якому виносі e колесо торкається землі (каст кола вздовж осі підвіски).
  castWheel(wh, track, c, s, dt) {
    const d = wh.def;
    const tx = this.x + c * d.T[0] - s * d.T[1];
    const ty = this.y + s * d.T[0] + c * d.T[1];
    const ux = c * d.u[0] - s * d.u[1];
    const uy = s * d.u[0] + c * d.u[1];
    const R = this.P.R;
    const L = d.L;
    let e = L;
    let q = track.query(tx + ux * L, ty + uy * L, R);
    wh.rigid = false;
    wh.bottom = false;
    wh.side = false;
    if (q) {
      const q0 = track.query(tx, ty, R);
      if (q0) {
        e = 0;
        q = q0;
        wh.rigid = true; // пробій: колесо вперлося в упор
        wh.bottom = true;
      } else {
        let lo = 0;
        let hi = L;
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) / 2;
          const qm = track.query(tx + ux * mid, ty + uy * mid, R);
          if (qm) {
            hi = mid;
            q = qm;
          } else lo = mid;
        }
        e = lo;
      }
    }
    wh.e = e;
    wh.hx = tx + ux * e;
    wh.hy = ty + uy * e;
    wh.ux = ux;
    wh.uy = uy;
    wh.contact = q;
    const sNew = L - e;
    wh.sdot = dt > 0 ? (sNew - wh.s) / dt : 0;
    wh.s = sNew;
    if (q) {
      const nu = -(q.nx * ux + q.ny * uy);
      wh.nu = nu;
      if (nu < 0.3) {
        wh.rigid = true; // удар збоку (стінка уступу) — підвіска не допоможе
        wh.side = true;
      }
    }
  }

  /**
   * Один крок симуляції.
   * @param {number} dt
   * @param {{pedal:number, brake:number, lean:number, hop?:boolean}} inp
   * @param {import('./terrain.js').Track} track
   * @param {{wet?:boolean, gripMul?:number, noRider?:boolean}} env
   * @returns {{crash:string|null, landing:number, scrape:boolean}}
   */
  step(dt, inp, track, env) {
    const P = this.P;
    const spec = this.spec;
    const out = { crash: null, landing: 0, scrape: false };
    const noRider = env.noRider || this.riderless;
    const wasGrounded = this.grounded;
    let c = Math.cos(this.a);
    let s = Math.sin(this.a);

    this.lean += (inp.lean - this.lean) * Math.min(1, dt * 9);
    for (const wh of this.wheels) this.castWheel(wh, track, c, s, dt);
    const grounded = this.grounded;

    // гравітація і опір повітря
    this.vy += GRAVITY * dt;
    const v = Math.hypot(this.vx, this.vy);
    if (v > 1e-3) {
      const vm = v / M;
      const drag = 0.5 * 1.2 * spec.cda * vm * vm * M; // px-сила
      const dv = Math.min(v, (drag / P.m) * dt);
      this.vx -= (this.vx / v) * dv;
      this.vy -= (this.vy / v) * dv;
    }

    // нахил райдера
    if (!noRider) {
      if (grounded) {
        this.w += ((inp.lean * GROUND_LEAN * M * M) / P.I) * dt;
      } else {
        const want = inp.lean * AIR_ALPHA * spec.air;
        if (!(Math.sign(want) === Math.sign(this.w) && Math.abs(this.w) > AIR_SPIN_MAX * Math.min(1.2, spec.air))) this.w += want * dt;
        // без нахилу райдер «тримає» байк — обертання поступово гасне
        this.w *= Math.exp(-(Math.abs(inp.lean) < 0.1 ? 1.3 : 0.3) * dt);
      }
    }

    // банні-хоп: підкидаємо байк угору (по осі рами) і трохи задираємо ніс
    this.hopCool = Math.max(0, this.hopCool - dt);
    if (inp.hop && grounded && this.hopCool <= 0 && !noRider) {
      this.vx += s * HOP_V;
      this.vy += -c * HOP_V;
      this.w -= 1.6;
      this.hopCool = 0.45;
      this.hopT = 0.25;
      this.crouchV -= 1.2;
    }
    this.hopT = Math.max(0, this.hopT - dt);

    // підвіска: сила пружини й демпфера → нормальна сила землі
    for (const wh of this.wheels) {
      wh.load = 0;
      // при пробої пружина стиснута повністю і далі штовхає раму вгору (разом з жорстким упором)
      if (!wh.contact || wh.side) continue;
      const d = wh.def;
      const sx = wh.s / d.L;
      let fs = d.k * wh.s * (1 + PROG * sx * sx);
      const knee = 1.4 * M;
      const sd = wh.sdot;
      if (sd > 0) fs += d.c * (sd < knee ? sd : knee + (sd - knee) * 0.35);
      else fs += d.c * 1.25 * sd;
      if (fs <= 0) continue;
      const q = wh.contact;
      const N = fs / Math.max(0.3, wh.nu);
      wh.load = N;
      const rx = wh.hx - this.x;
      const ry = wh.hy - this.y;
      const jx = q.nx * N * dt;
      const jy = q.ny * N * dt;
      this.vx += jx / P.m;
      this.vy += jy / P.m;
      this.w += (rx * jy - ry * jx) / P.I;
    }

    // педалі: сила на задньому колесі обмежена силою ніг, потужністю і передачами
    const rear = this.rear;
    const vw = (rear.spin * P.R) / M; // м/с — швидкість обода
    let F = 0;
    if (inp.pedal > 0 && !noRider) {
      F = Math.min(spec.force, spec.power / Math.max(1, vw)) * inp.pedal;
      if (vw > spec.topSpeed) F *= Math.max(0, 1 - (vw - spec.topSpeed) / 1.2);
      if (spec.assist) F += spec.assist * inp.pedal * Math.max(0, Math.min(1, (25 / 3.6 - vw) / 1.2));
    }
    this.pedaling = F > 0;
    if (F > 0) {
      const tau = F * P.Rm * M * M;
      rear.spin += (tau * dt) / P.Iw;
      this.w -= (tau * dt) / P.I;
    }

    // опір коченню і тертя підшипників
    for (const wh of this.wheels) {
      if (wh.contact) {
        const N = wh.load + (wh.rigid ? P.m * GRAVITY * 0.5 : 0);
        const tau = matRoll(spec, wh.contact.mat) * N * P.R;
        const dw = Math.min(Math.abs(wh.spin), (tau * dt) / P.Iw);
        wh.spin -= Math.sign(wh.spin) * dw;
      } else {
        wh.spin *= Math.exp(-0.12 * dt);
      }
    }

    // ---------- Імпульси: контакти, тертя, гальма ----------
    this.braking = inp.brake > 0 && !noRider;
    // райдер дозує передне гальмо: коли заднє колесо розвантажується (ось-ось перелетить через
    // кермо), переднє відпускається. Нахил уперед це «вимикає» — тоді стопі або перекид, як у житті.
    const rearShare = rear.contact ? Math.min(1, rear.load / (P.m * GRAVITY * 0.22) + (rear.rigid ? 1 : 0)) : 0;
    const frontMod = inp.lean > 0.3 ? 1 : Math.max(0.25, rearShare);
    const brakeMax = [190 * spec.brake * M * M * inp.brake * dt, 240 * spec.brake * M * M * inp.brake * frontMod * dt];
    const contacts = [];
    for (let i = 0; i < 2; i++) {
      const wh = this.wheels[i];
      wh.lt = 0;
      wh.lb = 0;
      wh.ln = 0;
      if (!wh.contact) continue;
      wh.mu = matGrip(spec, wh.contact.mat, env);
      if (wh.rigid) {
        contacts.push({ wh, rx: wh.hx - this.x, ry: wh.hy - this.y, nx: wh.contact.nx, ny: wh.contact.ny, depth: wh.contact.depth, mu: wh.mu, ln: 0, lt: 0, v0: 0 });
      }
    }
    // точки тіла: каретка (може чиркнути об камінь) і райдер (дотик — падіння)
    const bodyPts = [{ name: 'bb', lx: P.bb[0], ly: P.bb[1] + 0.06 * M, r: 0.1 * M, crash: false }];
    if (!noRider) {
      for (const [name, r] of [
        ['head', 0.14],
        ['shoulder', 0.13],
        ['hip', 0.12],
      ]) {
        const [mx, my] = riderPoint(name, this.lean, this.seat, this.crouch);
        const [lx, ly] = P.toLocal([mx, my]);
        bodyPts.push({ name, lx, ly, r: r * M, crash: true });
      }
    }
    for (const b of bodyPts) {
      const [wx, wy] = this.toWorld(b.lx, b.ly);
      const q = track.query(wx, wy, b.r);
      if (!q) continue;
      if (b.crash) {
        if (q.depth > 1) out.crash = out.crash ?? b.name;
        continue;
      }
      out.scrape = true;
      contacts.push({ wh: null, rx: q.x - this.x, ry: q.y - this.y, nx: q.nx, ny: q.ny, depth: q.depth, mu: 0.5, ln: 0, lt: 0, v0: 0 });
    }
    for (const ct of contacts) ct.v0 = (this.vx - this.w * ct.ry) * ct.nx + (this.vy + this.w * ct.rx) * ct.ny;

    for (let it = 0; it < ITER; it++) {
      // жорсткі контакти (пробій підвіски, удар у стінку, каретка)
      for (const ct of contacts) {
        const { rx, ry, nx, ny } = ct;
        const vn = (this.vx - this.w * ry) * nx + (this.vy + this.w * rx) * ny;
        const rn = rx * ny - ry * nx;
        const K = 1 / P.m + (rn * rn) / P.I;
        let target = (0.25 * Math.max(0, ct.depth - 0.3)) / dt;
        if (ct.v0 < -2 * M) target = Math.max(target, -0.08 * ct.v0);
        let dl = (target - vn) / K;
        const old = ct.ln;
        ct.ln = Math.max(0, old + dl);
        dl = ct.ln - old;
        this.vx += (nx * dl) / P.m;
        this.vy += (ny * dl) / P.m;
        this.w += (rn * dl) / P.I;
        if (!ct.wh) {
          const tx = -ny;
          const ty = nx;
          const vt = (this.vx - this.w * ry) * tx + (this.vy + this.w * rx) * ty;
          const rt = rx * ty - ry * tx;
          const Kt = 1 / P.m + (rt * rt) / P.I;
          const lim = ct.mu * ct.ln;
          const o = ct.lt;
          ct.lt = Math.max(-lim, Math.min(lim, o - vt / Kt));
          const d2 = ct.lt - o;
          this.vx += (tx * d2) / P.m;
          this.vy += (ty * d2) / P.m;
          this.w += (rt * d2) / P.I;
        } else {
          ct.wh.ln = ct.ln;
        }
      }

      for (let i = 0; i < 2; i++) {
        const wh = this.wheels[i];
        // гальма: гасять обертання колеса відносно рами
        if (inp.brake > 0) {
          const rel = wh.spin - this.w;
          const Kb = 1 / P.Iw + 1 / P.I;
          const o = wh.lb;
          wh.lb = Math.max(-brakeMax[i], Math.min(brakeMax[i], o - rel / Kb));
          const d = wh.lb - o;
          wh.spin += d / P.Iw;
          this.w -= d / P.I;
        }
        if (!wh.contact) continue;
        // тертя шини: прослизання між ободом і землею → сила на раму + обертання колеса
        const q = wh.contact;
        const tx = -q.ny;
        const ty = q.nx;
        const rx = wh.hx - this.x;
        const ry = wh.hy - this.y;
        const vslip = (this.vx - this.w * ry) * tx + (this.vy + this.w * rx) * ty - P.R * wh.spin;
        const rt = rx * ty - ry * tx;
        const K = 1 / P.m + (rt * rt) / P.I + (P.R * P.R) / P.Iw;
        const lim = wh.mu * (wh.skid ? 0.82 : 1) * (wh.load * dt + wh.ln);
        const o = wh.lt;
        wh.lt = Math.max(-lim, Math.min(lim, o - vslip / K));
        const d = wh.lt - o;
        this.vx += (tx * d) / P.m;
        this.vy += (ty * d) / P.m;
        this.w += (rt * d) / P.I;
        wh.spin -= (P.R * d) / P.Iw;
      }
    }

    // занос: тертя впиралося в межу
    for (const wh of this.wheels) {
      if (!wh.contact) {
        wh.skid = false;
        continue;
      }
      const lim = wh.mu * (wh.load * dt + wh.ln);
      wh.skid = lim > 0 && Math.abs(wh.lt) >= lim * 0.98 && Math.abs(this.vx) > 0.5 * M;
    }

    // жорстке приземлення: сумарний імпульс пробою одразу після польоту (корені й каміння
    // трясуть, але з байка не скидають — ноги райдера гасять дрібні удари)
    this.impact *= Math.exp(-dt * 25);
    this.airT = grounded ? this.airT : (this.airT ?? 0) + dt;
    if (grounded && !wasGrounded && (this.airT ?? 0) > 0.22) this.landWindow = 0.2;
    if (grounded) this.airT = 0;
    this.landWindow = Math.max(0, (this.landWindow ?? 0) - dt);
    if (this.landWindow > 0) {
      for (const ct of contacts) {
        if (ct.wh) this.impact += ct.ln / P.m;
      }
    }
    if (this.impact > HARD_LANDING * (0.85 + 0.15 * spec.stability) && !noRider) out.crash = out.crash ?? 'hard';

    // інтеграція
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.a += this.w * dt;
    if (this.a > Math.PI) this.a -= Math.PI * 2;
    else if (this.a < -Math.PI) this.a += Math.PI * 2;
    c = Math.cos(this.a);
    s = Math.sin(this.a);

    for (const wh of this.wheels) {
      wh.angle += wh.spin * dt;
      wh.airTime = wh.contact ? 0 : wh.airTime + dt;
    }

    // «ноги» райдера: присідання від удару + сидіння під час педалювання на малій швидкості
    if (!wasGrounded && grounded) {
      const vn = Math.max(0, this.vy * c - this.vx * s);
      out.landing = vn / M;
      this.crouchV += Math.min(2.5, vn / M) * 0.9;
    }
    const acc = -170 * this.crouch - 16 * this.crouchV;
    this.crouchV += acc * dt;
    this.crouch = Math.max(-0.06, Math.min(0.22, this.crouch + this.crouchV * dt));
    const wantSeat = this.pedaling && grounded && v < 5.2 * M && Math.abs(inp.lean) < 0.5 ? 1 : 0;
    this.seat += (wantSeat - this.seat) * Math.min(1, dt * 5);
    if (this.pedaling) this.crank += dt * Math.min(10, 3 + vw * 0.75);
    else if (!grounded) this.crank += (Math.round(this.crank / Math.PI) * Math.PI - this.crank) * Math.min(1, dt * 6);

    return out;
  }

  // Райдер злетів (аварія): далі велосипед котиться/кувиркається сам, з масою лише байка.
  detachRider() {
    const oldCom = this.P.com;
    this.P = deriveBike(this.spec, 0);
    this.riderless = true;
    const dx = (this.P.com[0] - oldCom[0]) * M;
    const dy = (this.P.com[1] - oldCom[1]) * M;
    const [nx, ny] = this.toWorld(dx, dy);
    // швидкість точки нового центру мас з урахуванням обертання
    this.vx += -this.w * (ny - this.y);
    this.vy += this.w * (nx - this.x);
    this.x = nx;
    this.y = ny;
    this.wheels[0].def = this.P.rear;
    this.wheels[1].def = this.P.front;
  }

  // Кут рами відносно поверхні під велосипедом (для чистого приземлення і бота).
  relAngle(track) {
    return this.a - track.slopeAt(this.x, this.P.R * 4);
  }
}

export { MAT };
