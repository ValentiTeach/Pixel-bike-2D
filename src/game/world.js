// Ігровий світ (вид збоку): уся логіка без DOM — фізика велосипеда, траса, фази заїзду,
// чекпоінти, трюки, монети, частинки. Рендер і звук живуть окремо, тож World легко тестувати в Node.
import {
  VIEW_W, VIEW_H, PX_PER_M as M, CAM_X, CAM_Y, COUNTDOWN_TIME, FINISH_TIME, CRASH_TIME, RESPAWN_FREEZE, GRAVITY, kmh,
} from './constants.js';
import { createRng, clamp } from './rng.js';
import { Track, MAT, MATERIALS } from './terrain.js';
import { BikeBody } from './bikePhysics.js';
import { getBike } from './bikes.js';
import { LevelGen, START_X } from './levelGen.js';
import { createWeather, updateWeather } from './weather.js';
import { botInput } from './bot.js';

const MAX_PARTICLES = 500;
const TAU = Math.PI * 2;
const wrap = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

// Очки за трюки. Монети за трюки = очки / 250 (нараховуються на фініші).
const POINTS = { backflip: 1000, frontflip: 1200, air: 150, clean: 250, wheelie: 40, stoppie: 70 };

export class World {
  /**
   * @param {object} o
   * @param {object} o.location  опис локації з locations.js
   * @param {'level'|'endless'|'demo'} o.mode
   * @param {number} o.seed      сід траси (у режимі рівня — фіксований для локації)
   * @param {string} [o.bikeId]
   */
  constructor({ location, mode = 'level', seed = 1, bikeId = 'trail' }) {
    this.location = location;
    this.mode = mode;
    this.rng = createRng(seed);
    this.fx = createRng(seed ^ 0x5bd1e995); // окремий генератор для ефектів, щоб не впливати на трасу
    this.lengthPx = location.lengthM * M;
    this.startX = START_X;
    this.finishX = mode === 'level' ? START_X + this.lengthPx : Infinity;
    this.track = new Track();
    this.entities = [];
    this.coins = [];
    this.checkpoints = [];
    this.particles = [];
    this.texts = [];
    this.events = [];
    this.nextId = 1;
    this.env = { wet: location.weather === 'rain', gripMul: 1 };

    this.time = 0;
    this.rideTime = 0;
    this.coinCount = 0;
    this.score = 0;
    this.crashes = 0;
    this.tricks = [];
    this.maxSpeed = 0;
    this.maxAir = 0;
    this.shake = 0;
    this.flash = 0;
    this.fade = 0;
    this.result = null;
    this.input = { pedal: 0, brake: 0, lean: 0, hop: false };
    this.coinPtr = 0;
    this.cpPassed = 0;

    this.gen = new LevelGen(location, this.rng, mode, this);
    // старт — на краю помосту, тож фініш рахуємо від нього (рівно lengthM метрів)
    if (mode === 'level') this.finishX = this.startX + this.lengthPx;
    // рівень генеруємо одразу повністю — щоб знати всі чекпоінти і показати їх на смузі прогресу
    if (mode === 'level') this.gen.ensure(this.finishX + 260 * M);
    else this.gen.ensure(this.startX + VIEW_W * 3);
    this.coins.sort((a, b) => a.x - b.x);

    this.bike = new BikeBody(getBike(bikeId));
    this.bike.place(this.track, this.startX);
    this.lastCheckpoint = this.startX;
    this.rider = null; // райдер, що злетів з велосипеда при аварії
    this.camX = this.bike.x - CAM_X;
    this.camY = this.bike.y - CAM_Y;
    this.camRefY = this.camY;
    this.air = null;
    this.manual = null;
    this.pending = null;
    this.stuck = 0;
    this.freeze = 0;

    this.phase = mode === 'demo' ? 'ride' : 'countdown';
    this.phaseTime = 0;
    this.countdown = COUNTDOWN_TIME;
    this.weather = createWeather(location.weather, this.fx);
  }

  get player() {
    return this.bike;
  }

  get distance() {
    return Math.max(0, this.bike.x - this.startX);
  }

  // ---------- Побудова світу (викликає генератор) ----------
  add(e) {
    e.id = this.nextId++;
    this.entities.push(e);
    return e;
  }

  addCoin(x, y, size = 'small') {
    const c = this.add({ kind: 'coin', x, y, size, value: size === 'big' ? 5 : 1, w: 8, h: 8 });
    this.coins.push(c);
    return c;
  }

  addDecor(item, x, y) {
    return this.add({ kind: 'decor', sprite: item.sprite, x, y, light: item.light ?? null, front: Boolean(item.front) });
  }

  addGate(style, x) {
    return this.add({ kind: 'gate', style, x, y: this.track.heightAt(x) });
  }

  addCheckpoint(x) {
    const c = this.add({ kind: 'checkpoint', x, y: this.track.heightAt(x), passed: false, n: this.checkpoints.length + 1 });
    this.checkpoints.push(c);
    return c;
  }

  addSign(x, type) {
    return this.add({ kind: 'sign', x, y: this.track.floorAt(x), type });
  }

  addLog(x, y, r, style) {
    return this.add({ kind: 'log', x, y, r, style });
  }

  addRail(x0, y0, x1, y1) {
    return this.add({ kind: 'rail', x: x0, y: y0, x1, y1 });
  }

  emit(type, data = {}) {
    if (this.mode === 'demo' && type !== 'end') return;
    this.events.push({ type, ...data });
  }

  // ---------- Складність ----------
  difficultyAt(x) {
    if (this.mode === 'demo') return 0.35;
    const dist = Math.max(0, x - START_X);
    if (this.mode === 'level') return clamp(dist / this.lengthPx, 0, 1);
    return clamp(dist / (this.lengthPx * 1.2), 0, 1);
  }

  progress() {
    return this.mode === 'level' ? clamp(this.distance / (this.finishX - this.startX), 0, 1) : 0;
  }

  // ---------- Керування ----------
  setInput({ pedal = 0, brake = 0, lean = 0, hop = false }) {
    this.input.pedal = pedal;
    this.input.brake = brake;
    this.input.lean = lean;
    if (hop) this.input.hop = true;
  }

  // Повернутись на останній чекпоінт (клавіша R) — рахується як падіння.
  requestRespawn() {
    if (this.phase !== 'ride' || this.mode === 'endless') return;
    this.crashes += 1;
    this.respawn();
  }

  // ---------- Головний крок симуляції ----------
  update(dt) {
    this.time += dt;
    this.phaseTime += dt;

    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after > 0) this.emit('beep', { n: after });
      if (this.countdown <= 0) {
        this.setPhase('ride');
        this.emit('go');
      }
    }
    if (this.phase === 'ride' || this.phase === 'crash') this.rideTime += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.shake *= Math.exp(-dt * 8);
    this.freeze = Math.max(0, this.freeze - dt);
    this.fade = Math.max(0, this.fade - dt * 2.5);

    const camBefore = this.camX;
    this.updateBike(dt);
    this.updateCamera(dt);
    if (this.mode !== 'level') {
      this.gen.ensure(this.camX + VIEW_W * 2.5);
      this.cull();
    }
    this.collectCoins();
    this.updateCheckpoints();

    if (this.mode === 'level' && this.phase === 'ride' && this.bike.x >= this.finishX) this.finishRun();

    this.updateParticles(dt);
    updateWeather(this.weather, dt, this.camX - camBefore, this.fx, this.time);

    if (this.phase === 'crash' && this.phaseTime >= CRASH_TIME) {
      if (this.mode === 'endless') this.endRun();
      else this.respawn();
    }
    if (this.phase === 'finish' && this.phaseTime >= FINISH_TIME) this.endRun();
  }

  setPhase(phase) {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // ---------- Велосипед ----------
  updateBike(dt) {
    const b = this.bike;
    let inp = { pedal: 0, brake: 0, lean: 0, hop: false };
    if (this.phase === 'ride' && this.freeze <= 0) {
      inp = this.mode === 'demo' ? botInput(this) : { ...this.input };
    } else if (this.phase === 'countdown') {
      inp.brake = 1;
    } else if (this.phase === 'finish' || this.phase === 'over') {
      inp.brake = this.phase === 'over' || this.phaseTime > 0.6 ? 0.5 : 0;
    }
    this.input.hop = false;
    this.lastInput = inp;

    const wasGrounded = b.grounded;
    const r = b.step(dt, inp, this.track, this.env);
    const v = b.speed;
    if (this.phase === 'ride') this.maxSpeed = Math.max(this.maxSpeed, v);

    // падіння в провалля / у воду
    if (!b.riderless && this.track.isGap(b.x) && b.y > this.track.floorAt(b.x) - 0.6 * M) r.crash = r.crash ?? 'fall';
    if (b.riderless && this.track.isGap(b.x) && b.y > this.track.floorAt(b.x)) {
      // байк тоне/падає на дно — зупиняємо
      b.vx *= 0.9;
      b.vy = Math.min(b.vy, 30);
    }

    if (r.crash && (this.phase === 'ride' || this.phase === 'finish') && !b.riderless) this.crash(r.crash);
    if (r.landing > 1.2 && this.phase !== 'countdown') {
      this.emit('land', { power: clamp(r.landing / 6, 0, 1) });
      if (r.landing > 3.2) this.shake = Math.max(this.shake, Math.min(4, r.landing * 0.6));
      const wh = b.rear.contact ? b.rear : b.front;
      if (wh.contact) this.dustBurst(wh.hx, wh.hy + b.P.R, Math.round(4 + r.landing * 2), wh.contact.mat);
    }
    if (r.scrape && v > 2 * M) this.emit('scrape');

    if (this.phase === 'ride' && !b.riderless) {
      this.trackTricks(dt, wasGrounded);
      // «застряг» (бот у демо): повернутись на чекпоінт
      this.stuck = v < 0.4 * M && this.mode === 'demo' ? this.stuck + dt : 0;
      if (this.stuck > 3) this.respawn();
    }

    this.surfaceEffects(dt);
    if (this.rider) this.updateRider(dt);
  }

  // Пил, бризки, сліди заносу.
  surfaceEffects(dt) {
    const b = this.bike;
    const v = b.speed;
    for (const wh of b.wheels) {
      const c = wh.contact;
      if (!c) continue;
      const mat = MATERIALS[c.mat] ?? MATERIALS[0];
      const px = wh.hx + 0;
      const py = wh.hy + b.P.R;
      const colors = this.location.dust?.[mat.id] ?? this.location.dust?.default;
      if (wh.skid && v > 1.2 * M && this.fx.chance(dt * 40)) {
        this.addParticle(px, py - 1, -b.vx * 0.15 + this.fx.range(-15, 15), -this.fx.range(8, 30), { color: this.fx.pick(colors ?? ['#9a8a7a']), life: 0.5, g: 90, size: 2 });
      } else if (mat.dust && colors && v > 4 * M && this.fx.chance(dt * (v / M) * 1.4)) {
        this.addParticle(px - 2, py - 1, -this.fx.range(10, 40), -this.fx.range(4, 20), { color: this.fx.pick(colors), life: 0.4, g: 60 });
      }
      if (mat.splash && v > 1.5 * M && this.fx.chance(dt * (v / M) * 4)) {
        const col = mat.id === 'mud' ? ['#5a3a1e', '#7a5230'] : ['#cfe8ff', '#8ab8ff', '#ffffff'];
        this.addParticle(px, py - 2, -b.vx * 0.2 + this.fx.range(-20, 20), -this.fx.range(30, 70), { color: this.fx.pick(col), life: 0.5, g: 260 });
        if (!wh.splashing) this.emit('splash');
        wh.splashing = true;
      } else if (!mat.splash) wh.splashing = false;
    }
  }

  // ---------- Трюки ----------
  trackTricks(dt, wasGrounded) {
    const b = this.bike;
    const grounded = b.grounded;
    // повітря: час, обертання
    if (!grounded) {
      if (wasGrounded || !this.air) this.air = { t: 0, rot: 0, a: b.a, peak: b.y };
      const air = this.air;
      air.t += dt;
      air.rot += wrap(b.a - air.a);
      air.a = b.a;
      air.peak = Math.min(air.peak, b.y);
      this.maxAir = Math.max(this.maxAir, air.t);
    } else if (this.air) {
      const air = this.air;
      this.air = null;
      if (air.t > 0.35) {
        // чисте приземлення: обидва колеса на землі, байк паралельно схилу
        const rel = Math.abs(wrap(b.relAngle(this.track)));
        this.pending = { t: 0, air, clean: rel < 0.21 };
      }
    }
    // рахуємо трюк лише якщо після приземлення не впав
    if (this.pending) {
      const p = this.pending;
      p.t += dt;
      if (p.t > 0.08 && p.clean && !(b.rear.contact && b.front.contact)) p.clean = false;
      if (p.t > 0.35) {
        this.pending = null;
        this.awardAir(p.air, p.clean);
      }
    }

    // вілі / стопі: їзда на одному колесі
    const speed = b.speed;
    const onRear = b.rear.contact && !b.front.contact && b.relAngle(this.track) < -0.12;
    const onFront = b.front.contact && !b.rear.contact && b.relAngle(this.track) > 0.08;
    const kind = speed > 1.5 * M ? (onRear ? 'wheelie' : onFront ? 'stoppie' : null) : null;
    if (kind && (!this.manual || this.manual.kind !== kind)) {
      this.endManual();
      this.manual = { kind, x0: b.x, t: 0 };
    } else if (!kind && this.manual) {
      this.manual.grace = (this.manual.grace ?? 0) + dt;
      if (this.manual.grace > 0.12) this.endManual();
    }
    if (this.manual && kind) {
      this.manual.t += dt;
      this.manual.grace = 0;
    }
  }

  endManual() {
    const m = this.manual;
    this.manual = null;
    if (!m) return;
    const dist = (this.bike.x - m.x0) / M;
    const min = m.kind === 'wheelie' ? 4 : 2.5;
    if (dist < min || m.t < 0.6) return;
    const meters = Math.round(dist);
    this.awardTrick(m.kind === 'wheelie' ? `Вілі ${meters} м` : `Стопі ${meters} м`, Math.round(POINTS[m.kind] * dist), m.kind);
  }

  awardAir(air, clean) {
    const turns = Math.floor((Math.abs(air.rot) + 0.9) / TAU);
    const parts = [];
    let pts = 0;
    if (turns >= 1) {
      const back = air.rot < 0;
      const name = back ? 'Бекфліп' : 'Фронтфліп';
      parts.push(turns > 1 ? `${name} ×${turns}` : name);
      pts += (back ? POINTS.backflip : POINTS.frontflip) * turns * turns;
    }
    if (air.t >= 0.9) {
      parts.push(`Політ ${air.t.toFixed(1)} с`);
      pts += Math.round(POINTS.air * air.t * air.t);
    }
    if (!parts.length && !clean) return;
    if (clean) {
      if (!parts.length) {
        if (air.t < 0.6) return;
        parts.push('Чисте приземлення');
        pts += POINTS.clean;
      } else {
        parts.push('чисто');
        pts = Math.round(pts * 1.25);
      }
    }
    this.awardTrick(parts.join(' · '), pts, turns ? 'flip' : 'air');
  }

  awardTrick(name, points, type) {
    this.score += points;
    this.tricks.push({ name, points, type });
    this.emit('trick', { name, points, kind: type });
    const b = this.bike;
    this.addText(b.x, b.y - 2.4 * M, `+${points}`, '#ffd23f');
  }

  // ---------- Аварія і відродження ----------
  crash(reason) {
    const b = this.bike;
    this.crashes += 1;
    this.air = null;
    this.pending = null;
    this.manual = null;
    this.setPhase('crash');
    this.shake = Math.max(this.shake, 5);
    this.flash = 0.2;
    // райдер злітає: позиція — тулуб, швидкість — як у байка плюс підкид
    const [sx, sy] = b.riderWorld('shoulder');
    const [hx, hy] = b.riderWorld('hip');
    this.rider = {
      x: (sx + hx) / 2,
      y: (sy + hy) / 2,
      vx: b.vx * 0.85 - b.w * (((sy + hy) / 2 - b.y) * 0.6),
      vy: Math.min(b.vy, 0) - 2.2 * M,
      a: b.a,
      w: b.w * 0.7 + (b.vx > 0 ? 6 : -6),
      onGround: false,
      lean: b.lean,
    };
    b.detachRider();
    if (reason === 'fall' && this.track.floorMats[Math.round(this.track.index(b.x))] === MAT.water) this.emit('splashBig');
    this.burst(this.rider.x, this.rider.y, ['#ffffff', '#ffd23f'], 8, 40);
    this.emit('crash', { reason });
    if (this.mode === 'endless') this.result = this.makeResult(false);
  }

  updateRider(dt) {
    const r = this.rider;
    r.vy += GRAVITY * dt;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.a += r.w * dt;
    const rad = 0.32 * M;
    const q = this.track.query(r.x, r.y, rad);
    if (q && !this.track.isGap(r.x)) {
      r.x += q.nx * q.depth;
      r.y += q.ny * q.depth;
      const vn = r.vx * q.nx + r.vy * q.ny;
      if (vn < 0) {
        if (vn < -3 * M) {
          this.dustBurst(r.x, r.y + rad, 6, q.mat);
          this.emit('thud', { power: clamp(-vn / (8 * M), 0, 1) });
        }
        r.vx -= 1.3 * vn * q.nx;
        r.vy -= 1.3 * vn * q.ny;
      }
      // тертя об землю: ковзання й «перекати»
      const tx = -q.ny;
      const ty = q.nx;
      const vt = r.vx * tx + r.vy * ty;
      const dv = vt * Math.min(1, dt * 3.5);
      r.vx -= tx * dv;
      r.vy -= ty * dv;
      r.w += (vt / rad - r.w) * Math.min(1, dt * 4);
      r.onGround = true;
    } else r.onGround = false;
  }

  respawn() {
    const b = this.bike;
    const spec = b.spec;
    this.bike = new BikeBody(spec);
    this.bike.place(this.track, this.lastCheckpoint);
    this.rider = null;
    this.air = null;
    this.pending = null;
    this.manual = null;
    this.stuck = 0;
    this.freeze = RESPAWN_FREEZE;
    this.fade = 1;
    this.camX = this.bike.x - CAM_X;
    this.camY = this.bike.y - CAM_Y;
    this.camRefY = this.camY;
    this.setPhase('ride');
    this.emit('respawn');
  }

  // ---------- Камера ----------
  updateCamera(dt) {
    const b = this.bike;
    const focus = this.rider && this.phase === 'crash' ? this.rider : b;
    const vx = focus.vx ?? 0;
    // попереду — більше місця на швидкості; по вертикалі — дивимось трохи вниз на спуск
    const look = clamp(vx * 0.32, -40, 70);
    const tx = focus.x - CAM_X + look;
    const ahead = this.track.heightAt(focus.x + 7 * M + Math.max(0, vx) * 0.5);
    const groundHere = this.track.heightAt(focus.x);
    const slopeLook = clamp((ahead - groundHere) * 0.35, -24, 34);
    const ty = focus.y - CAM_Y + slopeLook;
    this.camX += (tx - this.camX) * Math.min(1, dt * 6);
    this.camY += (ty - this.camY) * Math.min(1, dt * (b.grounded ? 5 : 3.2));
    // велосипед завжди в кадрі
    const sy = focus.y - this.camY;
    if (sy < 34) this.camY = focus.y - 34;
    else if (sy > VIEW_H - 26) this.camY = focus.y - (VIEW_H - 26);
    this.camRefY += (this.camY - this.camRefY) * Math.min(1, dt * 0.35);
  }

  // ---------- Монети і чекпоінти ----------
  collectCoins() {
    const b = this.bike;
    if (b.riderless) return;
    const [hx, hy] = b.riderWorld('shoulder');
    const cx = (b.x + hx) / 2;
    const cy = (b.y + hy) / 2;
    const coins = this.coins;
    while (this.coinPtr < coins.length && coins[this.coinPtr].x < cx - 3 * M) this.coinPtr++;
    for (let i = this.coinPtr; i < coins.length && coins[i].x < cx + 3 * M; i++) {
      const c = coins[i];
      if (c.taken) continue;
      const rr = c.size === 'big' ? 18 : 14;
      if ((c.x - cx) ** 2 + (c.y - cy) ** 2 > rr * rr) continue;
      c.taken = true;
      c.dead = true;
      this.coinCount += c.value;
      this.burst(c.x, c.y, ['#ffd23f', '#fff3a0', '#ffffff'], c.size === 'big' ? 14 : 6, 30);
      this.addText(c.x, c.y - 6, `+${c.value}`, '#ffd23f');
      this.emit(c.size === 'big' ? 'bigcoin' : 'coin');
    }
  }

  updateCheckpoints() {
    if (this.phase !== 'ride') return;
    const b = this.bike;
    for (const c of this.checkpoints) {
      if (c.passed || b.x < c.x) continue;
      c.passed = true;
      this.lastCheckpoint = c.x;
      this.cpPassed += 1;
      this.emit('checkpoint', { n: c.n, total: this.checkpoints.length });
    }
  }

  cull() {
    const left = this.camX - 200;
    let n = 0;
    for (const e of this.entities) {
      const right = e.kind === 'rail' ? e.x1 : e.x + 120;
      if (!e.dead && right > left) this.entities[n++] = e;
    }
    this.entities.length = n;
    const keep = this.coins.filter((c) => c.x > left);
    this.coinPtr = Math.max(0, this.coinPtr - (this.coins.length - keep.length));
    this.coins = keep;
    this.track.prune(Math.min(left, this.lastCheckpoint) - 400);
  }

  // ---------- Фініш і результат ----------
  finishRun() {
    this.setPhase('finish');
    this.result = this.makeResult(true);
    const y = this.track.heightAt(this.finishX);
    for (let i = 0; i < 80; i++) {
      this.addParticle(this.finishX + this.fx.range(-10, 10), y - this.fx.range(40, 70), this.fx.range(-70, 70), this.fx.range(-120, -30), {
        color: this.fx.pick(['#ff4d5e', '#ffd23f', '#4cd6ff', '#7ed957', '#ff4fd8', '#ffffff']),
        life: this.fx.range(0.8, 1.6),
        g: 120,
        size: 2,
      });
    }
    this.emit('finish');
  }

  endRun() {
    if (!this.result) this.result = this.makeResult(false);
    this.setPhase('over');
    this.emit('end', { result: this.result });
  }

  makeResult(completed) {
    const times = this.location.times ?? { gold: 0, silver: 0 };
    const time = Math.round(this.rideTime * 100) / 100;
    let stars = 0;
    if (completed) stars = time <= times.gold ? 3 : time <= times.silver ? 2 : 1;
    const best = this.tricks.reduce((a, t) => (!a || t.points > a.points ? t : a), null);
    return {
      locationId: this.location.id,
      mode: this.mode,
      bikeId: this.bike.spec.id,
      completed,
      distanceM: completed ? this.location.lengthM : Math.floor(this.distance / M),
      lengthM: this.location.lengthM,
      time,
      crashes: this.crashes,
      coins: this.coinCount,
      trickCoins: Math.floor(this.score / 250),
      score: this.score,
      tricks: this.tricks.length,
      bestTrick: best?.name ?? null,
      maxSpeedKmh: Math.round(kmh(this.maxSpeed)),
      maxAir: Math.round(this.maxAir * 10) / 10,
      stars,
      times,
    };
  }

  // ---------- Частинки та тексти (у світових координатах) ----------
  addParticle(x, y, vx, vy, { color = '#ffffff', life = 0.5, g = 0, size = 1 } = {}) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, color, life, max: life, g, size });
  }

  burst(x, y, colors, count, power) {
    for (let i = 0; i < count; i++) {
      const a = this.fx.range(0, Math.PI * 2);
      const s = this.fx.range(power * 0.3, power);
      this.addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, {
        color: this.fx.pick(colors),
        life: this.fx.range(0.3, 0.7),
        g: 200,
        size: this.fx.chance(0.3) ? 2 : 1,
      });
    }
  }

  dustBurst(x, y, n, mat = MAT.dirt) {
    const m = MATERIALS[mat] ?? MATERIALS[0];
    const colors = this.location.dust?.[m.id] ?? this.location.dust?.default;
    if (!colors) return;
    for (let i = 0; i < n; i++) {
      this.addParticle(x + this.fx.range(-5, 5), y - 1, this.fx.range(-45, 45), -this.fx.range(10, 45), { color: this.fx.pick(colors), life: this.fx.range(0.3, 0.6), g: 120 });
    }
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 0.9 });
  }

  updateParticles(dt) {
    let n = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.particles[n++] = p;
    }
    this.particles.length = n;
    let m = 0;
    for (const t of this.texts) {
      t.life -= dt;
      if (t.life <= 0) continue;
      t.y -= 22 * dt;
      this.texts[m++] = t;
    }
    this.texts.length = m;
  }

  // ---------- Дані для HUD і звуку ----------
  hud() {
    const b = this.bike;
    const total = this.finishX - this.startX;
    return {
      phase: this.phase,
      phaseTime: this.phaseTime,
      countdown: this.phase === 'countdown' ? Math.ceil(this.countdown) : 0,
      time: this.rideTime,
      coins: this.coinCount,
      score: this.score,
      crashes: this.crashes,
      distanceM: Math.floor(Math.min(this.distance, this.mode === 'level' ? total : Infinity) / M),
      lengthM: this.location.lengthM,
      progress: this.progress(),
      checkpoints: this.mode === 'level' ? this.checkpoints.map((c) => ({ at: (c.x - this.startX) / total, passed: c.passed })) : [],
      speedKmh: Math.round(kmh(b.riderless ? 0 : b.speed)),
      airborne: !b.grounded && !b.riderless,
      times: this.location.times,
    };
  }

  // Стан для звуку кочення/тріскачки (щокадру).
  rideSound() {
    const b = this.bike;
    const wh = b.rear.contact ? b.rear : b.front;
    return {
      speed: b.speed / M,
      grounded: b.grounded,
      mat: wh.contact ? MATERIALS[wh.contact.mat]?.id : null,
      skid: b.rear.skid || b.front.skid,
      pedaling: b.pedaling,
      wheelSpin: Math.abs(b.rear.spin * b.P.Rm),
      active: this.phase === 'ride' || this.phase === 'finish' || this.phase === 'crash',
    };
  }
}
