// Генератор MTB-траси (вид збоку): висотне поле з фічами, як у справжньому байк-парку.
//
// Траса будується шматками попереду камери: «стежка» (плавний спуск із хвилями) → «фіча»
// (ролери, тейбл, кікер, дроп, геп, кам'яний сад, корені, колода, місток, підйом, крутий схил,
// сходи, бордюр, компресія, брід, смуга багна/піску/снігу/льоду) → знову стежка…
//
// Головне — РЕАЛІЗМ і ЧЕСНІСТЬ:
//  • генератор паралельно «прокочує» точкову модель райдера (гравітація, опір кочення, повітря,
//    педалі) і знає очікувану швидкість у кожній точці;
//  • стрибки проєктуються під цю швидкість: довжина тейбла і кут приземлення рахуються з
//    балістичної траєкторії — на «правильній» швидкості приземлишся на схил приземлення;
//  • геп будується лише там, де його реально перелетіти, розігнавшись педалями від останнього
//    чекпоінта (а якщо розгону мало — перед ним з'являється крутіший заїзд);
//  • приземлення дропів достатньо довгі й круті, щоб не «пробити» підвіску на розрахунковій швидкості;
//  • перед великими фічами стоїть попереджувальний знак, як у байк-парках, а монети показують лінію.
import { DX, PX_PER_M as M } from './constants.js';
import { MAT, MATERIALS, GAP_DEPTH } from './terrain.js';
import { lerp, clamp, smoothstep } from './rng.js';
import { spriteSize } from './sprites.js';

const G = 9.81;
const RIDER_M = 89;
export const START_X = 0;

// ---------- Балістика (метри, y — вниз від губи трампліна) ----------
export function trajY(x, v, ang) {
  const c = Math.cos(ang);
  return -Math.tan(ang) * x + (G * x * x) / (2 * v * v * c * c);
}

export function trajSlope(x, v, ang) {
  const c = Math.cos(ang);
  return -Math.tan(ang) + (G * x) / (v * v * c * c);
}

// Перша точка, де траєкторія опускається нижче поверхні surf(x) (y — вниз).
export function landingX(v, ang, surf, xMax = 80) {
  for (let x = 0.1; x < xMax; x += 0.05) if (trajY(x, v, ang) >= surf(x)) return x;
  return xMax;
}

const weightOf = (v, d) => (Array.isArray(v) ? lerp(v[0], v[1], d) : v ?? 0);
// Швидкість на підводці, щоб на губі трампліна висотою H лишилось vLip (з запасом на втрати).
export const approachSpeed = (vLip, H) => Math.sqrt(vLip * vLip + 2 * G * H * 1.12) + 0.15;
// Яку швидкість можна мати на губі, якщо на підводці v.
const lipSpeed = (v, H) => Math.sqrt(Math.max(0, v * v - 2 * G * H * 1.12));

export class LevelGen {
  /**
   * @param {object} location   локація з locations.js (поле gen — налаштування генератора)
   * @param {object} rng
   * @param {'level'|'endless'|'demo'} mode
   * @param {object} world      World (track + методи додавання об'єктів)
   */
  constructor(location, rng, mode, world) {
    this.loc = location;
    this.g = location.gen;
    this.rng = rng;
    this.mode = mode;
    this.world = world;
    this.track = world.track;
    this.surface = this.g.surface ?? MAT.dirt;
    this.x = START_X - 24 * M;
    this.y = 0;
    this.vTyp = 0; // м/с — швидкість «звичайного» райдера
    this.vReach = 0; // м/с — що можна набрати педалями від останнього чекпоінта (без гальм)
    this.cap = this.g.vCap ?? 12;
    this.plan = []; // підказки швидкості для бота: { x0, x1, v, min, max }
    this.speeds = []; // очікувана швидкість «звичайного» райдера: { x, v }
    this.journal = []; // журнал фіч — для тестів
    this.checkpoints = [];
    this.finished = false;
    this.every = (this.g.checkpointEvery ?? 220) * M;
    this.nextCheckpoint = START_X + this.every;
    this.count = 0;
    this.propX = this.x;
    this.track.x0 = this.x;
    this.track.push(this.y, this.surface);
    this.start();
  }

  get finishX() {
    return this.world.finishX;
  }

  difficulty() {
    return this.world.difficultyAt(this.x);
  }

  size() {
    const s = this.g.size ?? [0.4, 1];
    const d = this.difficulty();
    const base = lerp(s[0], s[1], d);
    // у нескінченному режимі після «довжини рівня» фічі ростуть далі
    if (this.mode === 'endless') {
      const extra = Math.max(0, (this.x - START_X) / (this.world.lengthPx * 1.2) - 1);
      return Math.min(1.25, base + extra * 0.1);
    }
    return base;
  }

  // ---------- Низькорівневе додавання семплів ----------

  /**
   * Додає семпли на довжину len px. yFn(d, u) → y (d — px від початку, u — 0…1).
   * Колбеки викликаються послідовно, тож у них можна тримати стан.
   */
  emit(len, yFn, mat, floorFn = null, floorMat = this.surface) {
    const n = Math.max(1, Math.round(len / DX));
    const x0 = this.x;
    const y0 = this.y;
    for (let k = 1; k <= n; k++) {
      const d = k * DX;
      const u = k / n;
      const y = yFn(d, u);
      const m = typeof mat === 'function' ? mat(d, u) : mat;
      const f = floorFn ? floorFn(d, u) : NaN;
      const fm = typeof floorMat === 'function' ? floorMat(d, u) : floorMat;
      this.track.push(y, m, f, fm);
    }
    this.x = x0 + n * DX;
    this.y = this.track.ys[this.track.ys.length - 1];
    this.simulate(x0);
    this.speeds.push({ x: this.x, v: this.vTyp });
    return { x0, x1: this.x, y0, y1: this.y };
  }

  // Плавна ділянка: ухил (частка, «+» — униз) змінюється від g0 до g1, з хвилями амплітуди amp м.
  path(lenM, g0, g1, { amp = 0, mat = this.surface, rough = 0 } = {}) {
    const rng = this.rng;
    // хвилі рельєфу з обмеженою кривизною: на гребені з типовою швидкістю не «вистрілює» в повітря
    const lamM = rng.range(16, 30);
    const k = (lam) => 0.045 * (lam / (2 * Math.PI)) ** 2;
    const a1 = Math.min(amp, k(lamM));
    const a2 = Math.min(a1 * 0.3, k(lamM * 0.45));
    const lam = lamM * M;
    const p1 = rng.range(0, Math.PI * 2);
    const p2 = rng.range(0, Math.PI * 2);
    let yb = this.y;
    let r = 0;
    return this.emit(
      lenM * M,
      (d, u) => {
        yb += (g0 + (g1 - g0) * smoothstep(u)) * DX;
        const env = Math.sin(Math.PI * u);
        const wave = M * env * (a1 * Math.sin((2 * Math.PI * d) / lam + p1) + a2 * Math.sin((2 * Math.PI * d) / (lam * 0.45) + p2));
        if (rough) r += (rng.range(-1, 1) * rough * M - r) * 0.45;
        return yb + wave + r * env;
      },
      mat,
    );
  }

  // Пряма під ухилом grade (частка) довжиною lenM.
  line(lenM, grade, mat = this.surface, floorFn = null, floorMat = this.surface) {
    const y0 = this.y;
    return this.emit(lenM * M, (d) => y0 + grade * d, mat, floorFn, floorMat);
  }

  // Дуга кола: кут поверхні змінюється від a0 до a1 (рад, «+» — униз) з радіусом rM.
  arc(a0, a1, rM, mat = this.surface, floorFn = null) {
    const len = Math.abs(Math.sin(a1) - Math.sin(a0)) * rM * M;
    if (len < DX) return null;
    let y = this.y;
    return this.emit(
      len,
      (d) => {
        const ang = a0 + ((a1 - a0) * (d - DX / 2)) / len;
        y += Math.tan(ang) * DX;
        return y;
      },
      mat,
      floorFn,
    );
  }

  // ---------- Оцінка швидкості (точкова модель райдера) ----------
  simulate(fromX) {
    const t = this.track;
    const i0 = Math.max(0, Math.round(t.index(fromX)));
    for (let i = i0; i < t.ys.length - 1; i++) {
      const dx = DX / M;
      const dy = clamp((t.ys[i + 1] - t.ys[i]) / M, -dx * 0.9, dx * 0.9); // стіни (гепи, дропи) — як схил
      const ds = Math.hypot(dx, dy);
      const sin = dy / ds;
      const cos = dx / ds;
      const mat = MATERIALS[t.mats[i]] ?? MATERIALS[0];
      const step = (v, P, cap) => {
        const Fp = P > 0 ? Math.min(290, P / Math.max(0.5, v)) : 0;
        const a = G * sin - mat.roll * G * cos - (0.5 * 1.2 * 0.45 * v * v) / RIDER_M + Fp / RIDER_M;
        return Math.min(cap, Math.sqrt(Math.max(0.36, v * v + 2 * a * ds)));
      };
      this.vTyp = step(this.vTyp, this.vTyp < 7 ? 380 : this.vTyp < 9 ? 200 : 0, this.cap);
      this.vReach = step(this.vReach, this.vReach < 12 ? 620 : 0, 16);
    }
  }

  hint(x0, x1, v, min = 0, max = 99) {
    this.plan.push({ x0, x1, v, min, max });
    // райдер пригальмовує на фічі — і виїжджає з неї повільніше, ніж «вільна» точкова модель
    if (x1 >= this.x - 2 * M) {
      this.vTyp = Math.min(this.vTyp, max);
      this.vReach = Math.min(this.vReach, max + 1);
    }
  }

  // ---------- Головний цикл ----------

  ensure(untilX) {
    while (this.x < untilX) this.next();
  }

  start() {
    // стартова «будка»: дерев'яний поміст на висоті 1.2 м і рампа вниз — як на даунхіл-змаганнях
    this.line(14, 0);
    const groundY = this.y;
    const deckY = groundY - 1.2 * M;
    this.track.push(deckY, MAT.wood, groundY);
    this.x += DX;
    this.y = deckY;
    this.line(9, 0, MAT.wood, () => groundY);
    this.world.startX = this.x - 2.6 * M;
    this.line(1.2 / 0.28, 0.28, MAT.wood, () => groundY);
    this.path(16, 0.04, this.grade(), { amp: 0.15 });
    this.hint(this.world.startX, this.x, 6);
  }

  grade() {
    const gr = this.g.grade ?? [0.04, 0.1];
    return lerp(gr[0], gr[1], this.difficulty()) * this.rng.range(0.7, 1.25);
  }

  next() {
    const finishX = this.finishX;
    if (this.mode === 'level' && !this.finished && this.x > finishX - 70 * M) {
      // фінішна пряма: пологий накат, фінішна арка, далі — рівна зона гальмування
      this.path((finishX - this.x) / M + 6, this.grade() * 0.5, 0.02, { amp: 0.1 });
      this.world.addGate('finish', finishX);
      this.line(160, 0.01, this.surface);
      this.decorate();
      this.finished = true;
      return;
    }
    if (this.finished) {
      this.line(200, 0, this.surface);
      return;
    }

    if (this.x >= this.nextCheckpoint && (this.mode !== 'level' || this.x < finishX - 120 * M)) this.checkpoint();

    // стежка між фічами — 1.5–3 с їзди
    const v = Math.max(5, this.vTyp);
    const len = clamp(v * this.rng.range(1.4, 2.8), 12, 40);
    const trail = this.path(len, this.grade(), this.grade(), { amp: (this.g.amp ?? 0.5) * this.rng.range(0.5, 1.2), rough: this.g.rough ?? 0.01 });
    // монети вздовж стежки — на висоті грудей райдера
    if (this.rng.chance(0.5)) this.coinsLine(trail.x0 + len * M * 0.3, trail.x0 + len * M * 0.75, 1.15);
    this.decorate();

    const d = this.difficulty();
    const F = this.g.features;
    const options = Object.keys(F)
      .filter((id) => this[id] && d >= (this.g.from?.[id] ?? 0))
      .map((id) => ({ id, weight: weightOf(F[id], d) * (id === this.lastFeature ? 0.35 : 1) }))
      .filter((o) => o.weight > 0);
    if (!options.length) return;
    const kind = this.rng.weighted(options).id;
    const x0 = this.x;
    const vIn = this.vTyp;
    const info = this[kind](d) ?? {};
    this.lastFeature = kind;
    this.count++;
    this.journal.push({ kind, x0, x1: this.x, vIn, ...info });
    this.decorate();
  }

  checkpoint() {
    this.path(6, 0.02, 0.02);
    const x = this.x - 3 * M;
    this.world.addCheckpoint(x);
    this.checkpoints.push(x);
    this.nextCheckpoint = x + this.every;
    this.vReach = 0; // після падіння розганяєшся з місця
  }

  // ---------- Фічі ----------

  // Ролери (памп-трек): кілька горбів підряд.
  rollers() {
    const s = this.size();
    const n = this.rng.int(3, 6);
    const h = lerp(0.3, 0.75, s) * this.rng.range(0.85, 1.1);
    const wl = this.rng.range(5.5, 7.5) + h * 2;
    const y0 = this.y;
    const grade = this.grade() * 0.4;
    const x0 = this.x;
    this.emit(n * wl * M, (d) => y0 + grade * d - h * M * 0.5 * (1 - Math.cos((2 * Math.PI * d) / (wl * M))), this.surface);
    for (let i = 0; i < n; i++) this.coinsAt(x0 + (i + 0.5) * wl * M, 1.2);
    // памп-трек катають на помірній швидкості — інакше кожен ролер стає трампліном
    const vMax = Math.sqrt(9.81 / ((h / 2) * ((2 * Math.PI) / wl) ** 2)) * 0.95;
    this.hint(x0 - 8 * M, this.x, Math.min(this.vTyp, vMax), 3, vMax);
    return { n, h };
  }

  // Тейбл: трамплін → стіл → схил приземлення. Короткий стрибок = приземлення на стіл (безпечно).
  table(d) {
    const s = this.size();
    const rng = this.rng;
    const ang = lerp(0.36, 0.52, s) * rng.range(0.92, 1.05); // 21–30°
    const H = lerp(0.7, 1.8, s) * rng.range(0.9, 1.1);
    this.prepareRunIn(approachSpeed(6.5, H));
    // розрахункова швидкість на губі: те, що «звичайний» райдер має після заїзду на трамплін
    const v = clamp(lipSpeed(Math.min(this.vTyp, this.cap), H), 5.5, 10);
    const lipLen = 1.4;
    // дизайн: на розрахунковій швидкості приземляємось на 1.5 м за «колінцем» столу
    let beta = 0.5;
    let deck = 2;
    for (let it = 0; it < 4; it++) {
      const target = (dk) => {
        const xl = landingX(v, ang, (x) => (x < dk ? 0 : (x - dk) * Math.tan(beta)));
        return xl - dk;
      };
      deck = 0.5;
      while (deck < 14 && target(deck) > 1.6) deck += 0.1;
      const xl = landingX(v, ang, (x) => (x < deck ? 0 : (x - deck) * Math.tan(beta)));
      beta = clamp(Math.atan(trajSlope(xl, v, ang)) - 0.1, 0.36, 0.62);
    }
    deck = Math.max(1.2, deck);
    const lipX = this.kicker(ang, H, lipLen);
    const lipY = this.y;
    this.line(deck, 0, this.surface);
    const drop = H + lerp(0.2, 1.2, d);
    const landLen = Math.max(drop / Math.tan(beta), landingX(v + 2.5, ang, (x) => (x < deck ? 0 : (x - deck) * Math.tan(beta))) - deck + 2.5);
    this.landing(beta, Math.max(drop, landLen * Math.tan(beta)), this.surface);
    this.coinsArc(lipX, lipY, v, ang);
    this.sign(lipX - (H / Math.tan(ang)) * M - 14 * M, 'jump');
    const vApp = approachSpeed(v, H);
    this.hint(lipX - (H / Math.tan(ang) + 14) * M, lipX, vApp, vApp - 1.2, vApp + 1.2);
    return { lipX, v, vApp, ang, H, deck, beta };
  }

  // Дроп: рівний заїзд → край → вертикальна стінка → схил приземлення → викат.
  // Приземлення розраховане на помірну швидкість: якщо «перелетіти» схил — жорстко, як у житті.
  drop() {
    const s = this.size();
    const rng = this.rng;
    const mat = this.g.dropMat ?? MAT.rock;
    const H = lerp(0.6, 1.7, s) * rng.range(0.9, 1.08);
    const v = clamp(this.vTyp * 0.75, 4.5, 6.5) * rng.range(0.95, 1.05);
    const beta = lerp(0.5, 0.62, s) * rng.range(0.95, 1.05);
    this.prepareRunIn(v);
    const lipY = this.y;
    const wooden = mat === MAT.wood;
    const deckLen = rng.range(4, 7);
    if (wooden) {
      // поміст: «земля» під ним плавно опускається
      const y0 = this.y;
      this.emit(deckLen * M, () => y0, MAT.wood, (dd) => y0 + (H * M * dd) / (deckLen * M));
    } else {
      // скельний / бетонний уступ: останні метри перед краєм — камінь
      const edge = mat === MAT.concrete ? MAT.concrete : MAT.rock;
      this.line(deckLen, 0, (dd) => (dd > (deckLen - 2.2) * M ? edge : this.surface));
    }
    const lipX = this.x;
    const xFast = landingX(v + 1.6, 0, (x) => H + x * Math.tan(beta));
    const landLen = Math.min(14, xFast + 2.5);
    const faceY = lipY + H * M;
    this.track.push(faceY, this.surface, NaN);
    this.x += DX;
    this.y = faceY;
    this.landing(beta, landLen * Math.tan(beta), this.surface, true);
    this.sign(lipX - deckLen * M - 10 * M, 'drop');
    this.hint(lipX - deckLen * M - 10 * M, lipX, v, v - 1.2, v + 1.2);
    this.coinsDropArc(lipX, lipY, v);
    return { lipX, H, v, beta, landLen };
  }

  // Геп: трамплін → провалля (вода, каньйон) → приземлення. Перелетіти можна лише на швидкості.
  gap() {
    const s = this.size();
    const rng = this.rng;
    const ang = lerp(0.4, 0.52, s) * rng.range(0.95, 1.05);
    const H = lerp(0.9, 1.6, s);
    // розгін: якщо від чекпоінта не набрати швидкості — додаємо крутіший заїзд
    const need = lerp(7.2, 9.5, s);
    // вважаємо, що на геп заїжджають зі звичайною швидкістю (а не розігнавшись від чекпоінта)
    this.vReach = Math.min(this.vReach, this.vTyp);
    const xStart = this.x;
    let guard = 0;
    while (lipSpeed(this.vReach, H) * 0.92 < need + 0.5 && guard++ < 8) this.path(rng.range(16, 24), 0.18, 0.2, { amp: 0.1 });
    this.prepareRunIn(approachSpeed(need, H), true);
    const vReachLip = lipSpeed(this.vReach, H);
    const vReq = Math.min(need, vReachLip * 0.92 - 0.5);
    const knuckle = lerp(0.2, 0.6, s); // приземлення трохи нижче губи
    // ширина гепу: на vReq перелітаємо провалля і «колінце» з запасом 0.8 м
    let gapW = 2;
    while (gapW < 14 && trajY(gapW + 1.0, vReq, ang) <= knuckle - 0.15) gapW += 0.1;
    gapW = Math.max(2, gapW - 0.1);
    const lipX = this.kicker(ang, H, 1.5);
    const lipY = this.y;
    const bottom = this.g.gapBottom ?? MAT.water;
    const floorY = lipY + rng.range(3, 6) * M;
    this.emit(gapW * M, () => lipY + GAP_DEPTH, MAT.gap, () => floorY, bottom);
    // стінка приземлення і «колінце»
    const kY = lipY + knuckle * M;
    this.track.push(kY, this.surface, NaN);
    this.x += DX;
    this.y = kY;
    this.line(0.6, 0.05, this.surface);
    const vt = Math.max(vReq + 2, this.vTyp);
    let beta = clamp(Math.atan(trajSlope(gapW + 1.5, vReq + 1, ang)) - 0.05, 0.38, 0.7);
    const xFar = landingX(vt + 2.5, ang, (x) => (x < gapW + 0.6 ? knuckle : knuckle + (x - gapW - 0.6) * Math.tan(beta)));
    const landLen = Math.max(4, xFar - gapW + 2);
    this.landing(beta, landLen * Math.tan(beta) * 0.9 + 0.6, this.surface);
    this.coinsArc(lipX, lipY, vReq + 1, ang);
    this.sign(lipX - (H / Math.tan(ang)) * M - 16 * M, 'gap');
    const vApp = approachSpeed(vReq + 0.7, H);
    this.hint(xStart - 6 * M, lipX, vApp, vApp - 0.3, vApp + 2);
    return { lipX, gapW, vReq, vApp, ang, H, knuckle, vReachLip };
  }

  // Кам'яний сад: крутіший схил, усіяний камінням.
  rockGarden() {
    const s = this.size();
    const rng = this.rng;
    const len = rng.range(10, 18 + 10 * s);
    const grade = lerp(0.1, 0.24, s) * rng.range(0.85, 1.15);
    const rocks = [];
    let x = rng.range(0.5, 1.5);
    while (x < len - 1) {
      const w = rng.range(0.5, 1.4);
      // камінь до ~60% радіуса колеса: з розгону перекочується, з місця — лише хопом
      const h = Math.min(w * 0.4, lerp(0.07, 0.22, s) * rng.range(0.6, 1.1));
      rocks.push({ x, w, h, k: rng.range(0.35, 0.65) });
      x += w * rng.range(0.6, 1.6) + rng.range(0.2, 1.4);
    }
    const y0 = this.y;
    const rockMat = this.g.rockMat ?? MAT.rock;
    const bump = (dm) => {
      let top = 0;
      for (const r of rocks) {
        const u = (dm - r.x) / r.w;
        if (u < 0 || u > 1) continue;
        // асиметричний камінь: крутий фронт, похилий тил
        const prof = u < r.k ? smoothstep(u / r.k) : smoothstep((1 - u) / (1 - r.k));
        top = Math.max(top, r.h * Math.min(1, prof * 1.4));
      }
      return top;
    };
    this.emit(
      len * M,
      (d) => y0 + grade * d - bump(d / M) * M,
      (d) => (bump(d / M) > 0.03 ? rockMat : this.surface),
    );
    const v = lerp(7, 5.8, s);
    this.hint(this.x - len * M - 8 * M, this.x, v, 4, v + 2);
    return { rocks: rocks.length, grade };
  }

  // Корені поперек стежки — дрібні, але часті.
  roots() {
    const rng = this.rng;
    const len = rng.range(8, 16);
    const bumps = [];
    let x = 0.5;
    while (x < len - 0.5) {
      // корінь — округлий, 3–8 см заввишки: трусить, але колесо його перекочує
      bumps.push({ x, w: rng.range(0.22, 0.4), h: rng.range(0.03, 0.08) });
      x += rng.range(0.45, 1.2);
    }
    const y0 = this.y;
    const grade = this.grade();
    this.emit(
      len * M,
      (d) => {
        const dm = d / M;
        let top = 0;
        for (const b of bumps) {
          const u = (dm - b.x) / b.w;
          if (u > 0 && u < 1) top = Math.max(top, b.h * Math.sin(Math.PI * u));
        }
        return y0 + grade * d - top * M;
      },
      MAT.roots,
    );
    this.hint(this.x - (len + 8) * M, this.x, Math.min(this.vTyp, 8.5), 3, 9);
    return { n: bumps.length };
  }

  // Повалене дерево поперек стежки — колесо 29″ перекочує, але краще підстрибнути.
  log() {
    const s = this.size();
    const r = lerp(0.1, 0.2, s) * this.rng.range(0.9, 1.1); // діаметр 20–44 см
    this.line(3, 0.02);
    const y0 = this.y;
    const cx = 0.6 + r;
    this.emit(
      (cx + r + 0.4) * M,
      (d) => {
        const dm = d / M - cx;
        const base = y0 + 0.02 * d;
        if (Math.abs(dm) > r) return base;
        return base - (r + Math.sqrt(r * r - dm * dm)) * M;
      },
      (d) => (Math.abs(d / M - cx) <= r ? MAT.log : this.surface),
    );
    const lx = this.x - (r + 0.4) * M;
    this.world.addLog(lx, y0 + 0.02 * cx * M - r * M, r * M, this.g.logStyle ?? 'wood');
    this.coinsAt(lx, 1.6);
    this.hint(lx - 12 * M, lx + 3 * M, 5.5, 3.5, 8);
    return { r };
  }

  // Дерев'яний місток (north shore) над яром із струмком.
  bridge() {
    const rng = this.rng;
    const len = rng.range(9, 18);
    const depth = rng.range(1.6, 3.6);
    const grade = rng.range(-0.02, 0.06);
    const y0 = this.y;
    const water = this.g.bridgeWater ?? MAT.water;
    this.emit(
      len * M,
      (d) => y0 + grade * d,
      MAT.wood,
      (d, u) => y0 + grade * d + depth * M * Math.pow(Math.sin(Math.PI * u), 0.7),
      (d, u) => (u > 0.35 && u < 0.65 ? water : this.surface === MAT.concrete ? MAT.dirt : this.surface),
    );
    this.coinsLine(this.x - len * M * 0.75, this.x - len * M * 0.25, 1.0);
    return { len, depth };
  }

  // Підйом — без педалей не заїдеш.
  climb() {
    const rng = this.rng;
    const len = rng.range(12, 28);
    const g = -rng.range(0.05, 0.11);
    this.path(4, this.grade(), g * 0.6);
    this.path(len, g, g, { amp: 0.15, mat: this.g.climbMat ?? this.surface });
    this.path(5, g * 0.5, this.grade());
    return { len, g };
  }

  // Крутий спуск (30–45%): гальмуй і відкидайся назад.
  steep() {
    const s = this.size();
    const rng = this.rng;
    const len = rng.range(6, 10 + 8 * s);
    const g = lerp(0.3, 0.6, s) * rng.range(0.9, 1.1);
    const ang = Math.atan(g);
    this.arc(Math.atan(Math.max(0, this.grade())), ang, 4);
    this.path(len, g, g, { amp: 0.08, rough: 0.025, mat: this.g.steepMat ?? this.surface });
    this.arc(ang, Math.atan(0.03), 9);
    this.hint(this.x - (len + 12) * M, this.x, 6.5, 2.5, 9);
    return { len, g };
  }

  // Сходи (міський даунхіл).
  stairs() {
    const s = this.size();
    const n = this.rng.int(6, Math.round(lerp(10, 22, s)));
    const rise = this.rng.range(0.14, 0.18);
    const run = this.rng.range(0.3, 0.38);
    this.line(3, 0, MAT.concrete);
    const x0 = this.x;
    const y0 = this.y;
    this.emit(n * run * M, (d) => y0 + Math.floor(d / (run * M)) * rise * M, MAT.concrete);
    this.world.addRail(x0, y0, this.x, this.y);
    this.line(4, 0.01, MAT.concrete);
    this.hint(x0 - 10 * M, this.x, 5.5, 3, 8);
    return { n, rise, run };
  }

  // Бордюр / парапет: невеликий дроп на рівне.
  ledge() {
    const s = this.size();
    const H = lerp(0.35, 0.9, s) * this.rng.range(0.85, 1.1);
    this.line(4, 0, MAT.concrete);
    const lipX = this.x;
    this.track.push(this.y + H * M, MAT.concrete, NaN);
    this.x += DX;
    this.y += H * M;
    this.line(6, 0.02, MAT.concrete);
    this.hint(lipX - 10 * M, lipX, 6.5, 5, 10);
    return { lipX, H };
  }

  // Компресія: западина, де підвіска стискається до упору.
  compression() {
    const s = this.size();
    const depth = lerp(0.7, 1.6, s) * this.rng.range(0.8, 1.1);
    const len = depth * 9 + this.rng.range(6, 10);
    const y0 = this.y;
    const grade = this.grade() * 0.5;
    this.emit(len * M, (d, u) => y0 + grade * d + depth * M * 0.5 * (1 - Math.cos(2 * Math.PI * u)), this.surface);
    return { depth };
  }

  // Брід через струмок: вода сповільнює і бризкає.
  water() {
    const len = this.rng.range(4, 7);
    const y0 = this.y;
    const depth = this.rng.range(0.25, 0.4);
    const level = y0 + depth * 0.25 * M;
    this.emit(
      len * M,
      (d, u) => y0 + depth * M * Math.pow(Math.sin(Math.PI * u), 0.6),
      (d, u) => (u > 0.12 && u < 0.88 ? MAT.water : this.surface),
      (d, u) => (u > 0.12 && u < 0.88 ? level : NaN),
      MAT.water,
    );
    this.hint(this.x - (len + 10) * M, this.x, 5, 3, 8);
    return { len };
  }

  // Смуга іншого покриття (багно, пісок, сніг, лід, гравій).
  patch() {
    const mat = this.g.patchMat ?? MAT.mud;
    const len = this.rng.range(8, 20);
    this.path(len, this.grade() * 0.7, this.grade() * 0.7, { amp: 0.1, mat });
    if (mat === MAT.ice) this.hint(this.x - (len + 10) * M, this.x, 7, 4, 10);
    return { mat: MATERIALS[mat].id, len };
  }

  // ---------- Будівельні блоки фіч ----------

  // Перед стрибком: рівна підводка, а якщо швидкість не та — розгін або гальмівна ділянка.
  prepareRunIn(vWant, mustReach = false) {
    if (!mustReach && this.vTyp < vWant - 1.2) this.path(this.rng.range(14, 22), 0.14, 0.12, { amp: 0.1 });
    this.path(5, Math.min(0.06, this.grade()), 0.0, { amp: 0 });
    this.vReachAtLip = this.vReach;
  }

  // Трамплін: перехідна дуга до кута ang, далі пряма «губа». Повертає x губи.
  kicker(ang, H, lipLen) {
    const mat = this.g.kickerMat ?? this.surface;
    const y0 = this.y;
    const floorFn = mat === MAT.wood ? () => y0 : null;
    const straight = Math.min(lipLen * Math.sin(ang), H * 0.6);
    const R = Math.max(2.5, (H - straight) / (1 - Math.cos(ang)));
    this.arc(0, -ang, R, mat, floorFn);
    const remaining = H * M - (y0 - this.y);
    if (remaining > DX) this.line(remaining / M / Math.tan(ang), -Math.tan(ang), mat, floorFn);
    return this.x;
  }

  // Схил приземлення під кутом beta з плавним переходом у викат.
  landing(beta, dropM, mat, fromFace = false) {
    if (!fromFace) this.arc(0, beta, 1.5, mat);
    const len = Math.max(1, dropM / Math.tan(beta));
    this.line(len, Math.tan(beta), mat);
    this.arc(beta, Math.atan(Math.max(0.02, this.grade() * 0.6)), 9, mat);
    this.path(6, Math.max(0.02, this.grade() * 0.6), this.grade(), { amp: 0 });
  }

  // ---------- Монети, знаки, декор ----------

  coinsAt(x, hM) {
    const y = this.track.heightAt(x) - hM * M;
    this.world.addCoin(x, y);
  }

  coinsLine(x0, x1, hM = 1.1) {
    for (let x = x0; x <= x1; x += 1.6 * M) {
      if (this.track.isGap(x)) continue;
      this.coinsAt(x, hM);
    }
  }

  // Дуга монет уздовж траєкторії стрибка — показує «правильну» швидкість.
  coinsArc(lipX, lipY, v, ang) {
    const t = this.track;
    const pts = [];
    for (let xm = 1.4; xm < 40; xm += 1.5) {
      const y = lipY + (trajY(xm, v, ang) - 1.0) * M;
      const x = lipX + xm * M;
      if (x > t.x1 || y > t.heightAt(x) - 1.2 * M) break;
      pts.push([x, y]);
    }
    for (const [x, y] of pts) this.world.addCoin(x, y);
    if (pts.length > 3 && this.rng.chance(0.5)) {
      const [x, y] = pts[Math.floor(pts.length / 2)];
      this.world.addCoin(x, y - 2.2 * M, 'big'); // велика монета — для тих, хто «попнув» з губи
    }
  }

  coinsDropArc(lipX, lipY, v) {
    for (let xm = 1.2; xm < 30; xm += 1.4) {
      const y = lipY + (trajY(xm, v, 0) - 1.0) * M;
      const x = lipX + xm * M;
      if (y > this.track.heightAt(x) - 1.2 * M) break;
      this.world.addCoin(x, y);
    }
  }

  sign(x, type) {
    if (x < this.track.x0 + 8) return;
    this.world.addSign(x, type);
  }

  // Декор (дерева, кущі, каміння) уздовж уже побудованої траси — стоїть на «підлозі».
  decorate() {
    const list = this.loc.props;
    if (!list?.length) return;
    const rng = this.rng;
    const t = this.track;
    const [g0, g1] = this.loc.propGap ?? [20, 80];
    let x = Math.round(Math.max(this.propX, t.x0 + 4));
    for (;;) {
      const item = rng.weighted(list);
      const { w, h } = spriteSize(item.sprite);
      if (x + w > this.x - 4) break; // уся ширина має стояти на вже збудованій землі
      let bottom = -Infinity;
      let top = Infinity;
      let ok = true;
      for (let px = x; px <= x + w; px += DX) {
        if (t.isGap(px) && !item.inGap) ok = false;
        const fy = t.floorAt(px);
        bottom = Math.max(bottom, fy);
        top = Math.min(top, fy);
      }
      // низ спрайта — не вище найнижчої точки під ним (нічого не «висить»), трохи вкопаний
      if (ok && bottom - top < (item.maxSlope ?? 7)) this.world.addDecor(item, x, Math.ceil(bottom - h + (item.sink ?? 2)));
      x += w + rng.int(g0, g1);
    }
    this.propX = x;
  }
}
