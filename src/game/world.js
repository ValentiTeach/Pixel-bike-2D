// Ігровий світ (вид збоку): уся логіка без DOM — фізика велосипеда, рельєф, зіткнення,
// фази заїзду, частинки. Рендер і звук живуть окремо, тож World легко тестувати в Node.
import {
  VIEW_W, VIEW_H, PX_PER_METER, GROUND_Y, PLAYER_W, PLAYER_H, PLAYER_HITBOX, PLAYER_SCREEN_X, START_X,
  PHYSICS, AIR_TIME, MAX_HEARTS, INVULN_TIME, SHIELD_TIME, SLOW_FACTOR, SLOW_TIME, SLIP_TIME,
  COUNTDOWN_TIME, FINISH_TIME, CRASH_TIME,
} from './constants.js';
import { createRng, lerp, clamp, smoothstep } from './rng.js';
import { ENTITY_TYPES } from './entities.js';
import { spriteSize } from './sprites.js';
import { overlaps, hitboxOf } from './collision.js';
import { LevelGen } from './levelGen.js';
import { createWeather, updateWeather } from './weather.js';

const FEET = PLAYER_H - PLAYER_HITBOX.b; // від верху спрайта до «підошви» коліс
const MAX_PARTICLES = 420;

export class World {
  /**
   * @param {object} o
   * @param {object} o.location  опис локації з locations.js
   * @param {'level'|'endless'|'demo'} o.mode
   * @param {number} o.seed
   */
  constructor({ location, mode = 'level', seed = 1 }) {
    this.location = location;
    this.mode = mode;
    this.rng = createRng(seed);
    this.fx = createRng(seed ^ 0x5bd1e995); // окремий генератор для ефектів, щоб не впливати на рівень
    this.lengthPx = location.lengthM * PX_PER_METER;
    this.finishX = START_X + this.lengthPx;

    this.segments = []; // рельєф: { x0, x1, top }, відсортований; проміжки між ними — ями
    this.entities = [];
    this.particles = [];
    this.texts = [];
    this.events = [];
    this.nextId = 1;

    this.player = { x: START_X, y: GROUND_Y - FEET, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, onGround: true, pedal: 0, spin: 0 };
    this.camX = START_X - PLAYER_SCREEN_X;
    this.dir = 0; // -1 гальмо, 0, 1 розгін
    this.jumpHeld = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.lastSafeX = START_X;

    this.time = 0;
    this.rideTime = 0;
    this.hearts = MAX_HEARTS;
    this.coins = 0;
    this.hits = 0;
    this.jumps = 0;
    this.shield = 0;
    this.invuln = 0;
    this.slow = 0;
    this.slip = 0;
    this.shake = 0;
    this.flash = 0;
    this.result = null;

    this.phase = mode === 'demo' ? 'ride' : 'countdown';
    this.phaseTime = 0;
    this.countdown = COUNTDOWN_TIME;
    if (mode === 'demo') this.player.vx = this.targetSpeedAt(START_X);

    this.weather = createWeather(location.weather, this.fx);
    this.gen = new LevelGen(location, this.rng, mode);
    this.gen.ensure(this, this.camX + VIEW_W + 260);
    if (mode !== 'demo') this.addGate('start', START_X + PLAYER_W + 6);
  }

  get distance() {
    return Math.max(0, this.player.x - START_X);
  }

  // ---------- Побудова світу (викликається генератором) ----------
  addSegment(x0, x1, top) {
    const last = this.segments[this.segments.length - 1];
    if (last && last.x1 === x0 && last.top === top) last.x1 = x1;
    else this.segments.push({ x0, x1, top });
  }

  spawn(typeId, x, y, extra = {}) {
    const T = ENTITY_TYPES[typeId];
    const sprite = this.rng.pick(T.sprites);
    const { w, h, frames } = spriteSize(sprite);
    const e = {
      id: this.nextId++,
      kind: T.kind,
      type: typeId,
      T,
      sprite,
      x,
      y,
      w,
      h,
      hitbox: T.hitbox,
      vx: 0,
      dy: 0,
      frames,
      anim: this.fx.range(0, 1),
      flip: false,
      active: true,
      ...extra,
    };
    if (T.facesRight) e.flip = e.vx < 0;
    this.entities.push(e);
    return e;
  }

  spawnDecor(item, x, y) {
    const { w, h } = spriteSize(item.sprite);
    this.entities.push({ id: this.nextId++, kind: 'decor', sprite: item.sprite, x, y, w, h, light: item.light ?? null, frames: 1 });
  }

  addGate(style, x) {
    this.entities.push({ id: this.nextId++, kind: 'gate', style, x, y: 0, w: 4, h: 0, frames: 1 });
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  // ---------- Рельєф ----------
  segmentAt(x) {
    for (const s of this.segments) if (x >= s.x0 && x < s.x1) return s;
    return null;
  }

  groundAt(x) {
    return this.segmentAt(x)?.top ?? null;
  }

  // Найвища поверхня під відрізком [a, b] (або null — під ногами яма).
  surfaceUnder(a, b) {
    let top = null;
    for (const s of this.segments) {
      if (s.x1 <= a || s.x0 >= b) continue;
      if (top === null || s.top < top) top = s.top;
    }
    return top;
  }

  // ---------- Складність і швидкість ----------
  difficultyAt(x) {
    if (this.mode === 'demo') return 0.3;
    const dist = Math.max(0, x - START_X);
    if (this.mode === 'level') return clamp(dist / this.lengthPx, 0, 1);
    return clamp(dist / (this.lengthPx * 1.2), 0, 1);
  }

  targetSpeedAt(x) {
    const [base, max] = this.location.speed;
    if (this.mode === 'demo') return lerp(base, max, 0.25);
    if (this.mode === 'level') return lerp(base, max, smoothstep(this.difficultyAt(x)));
    // нескінченний режим: після «довжини рівня» швидкість росте далі, до +25%
    const p = Math.max(0, x - START_X) / (this.lengthPx * 1.2);
    if (p <= 1) return lerp(base, max, smoothstep(p));
    return Math.min(max * 1.25, max * (1 + (p - 1) * 0.08));
  }

  progress() {
    return this.mode === 'level' ? clamp(this.distance / this.lengthPx, 0, 1) : 0;
  }

  // ---------- Керування ----------
  pressJump() {
    this.jumpBuffer = PHYSICS.buffer;
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
    if (this.phase === 'ride') this.rideTime += dt;

    this.invuln = Math.max(0, this.invuln - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.slip = Math.max(0, this.slip - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.shake *= Math.exp(-dt * 9);

    const camBefore = this.camX;
    this.updatePlayer(dt);
    this.updateCamera(dt);
    this.gen.ensure(this, this.camX + VIEW_W + 260);
    this.updateEntities(dt);
    this.collide();
    this.cull();

    if (this.mode === 'level' && this.phase === 'ride' && this.player.x + PLAYER_W / 2 >= this.finishX) this.finishRun();

    this.updateParticles(dt);
    updateWeather(this.weather, dt, this.camX - camBefore, this.fx, this.time);

    if (this.phase === 'finish' && this.phaseTime >= FINISH_TIME) this.endRun();
    if (this.phase === 'crash' && this.phaseTime >= CRASH_TIME) this.endRun();
  }

  setPhase(phase) {
    this.phase = phase;
    this.phaseTime = 0;
  }

  // ---------- Гравець ----------
  updatePlayer(dt) {
    const p = this.player;
    let dir = this.dir;
    let held = this.jumpHeld;
    if (this.mode === 'demo') {
      const b = botInput(this);
      dir = b.dir;
      if (b.jump) this.pressJump();
      held = true;
    }

    // швидкість по горизонталі
    let target = 0;
    if (this.phase === 'ride') {
      target = this.targetSpeedAt(p.x);
      if (dir > 0) target *= PHYSICS.boost;
      else if (dir < 0) target *= PHYSICS.brake;
    } else if (this.phase === 'finish') {
      target = this.targetSpeedAt(p.x) * 0.5;
    }
    if (this.slow > 0) target *= SLOW_FACTOR;
    if (this.slip > 0 && this.phase === 'ride') target = Math.max(target, p.vx); // на льоду не загальмуєш
    if (this.phase === 'crash' || this.phase === 'over') {
      p.vx *= Math.exp(-dt * 2.5);
    } else {
      const a = this.slip > 0 ? PHYSICS.slipAccel : target > p.vx ? PHYSICS.accel : PHYSICS.decel;
      p.vx += clamp(target - p.vx, -a * dt, a * dt);
    }

    // стрибок: буфер натискання + «час койота» після з'їзду з краю
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = p.onGround ? PHYSICS.coyote : Math.max(0, this.coyote - dt);
    const canAct = this.phase === 'ride' || this.phase === 'finish';
    if (canAct && this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -PHYSICS.jumpV;
      p.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumps += 1;
      this.dustBurst(p.x + 6, p.y + FEET, 5);
      if (this.mode !== 'demo') this.emit('jump');
    }
    if (!held && p.vy < -PHYSICS.jumpCut) p.vy = -PHYSICS.jumpCut;

    this.movePlayer(dt);

    if (this.phase === 'crash') p.spin += dt * 9;
    p.pedal += p.vx * dt * 0.09;

    // пил з-під заднього колеса
    const dust = this.location.dust;
    if (dust && p.onGround && p.vx > 50 && this.fx.chance(dt * (p.vx / 8))) {
      this.addParticle(p.x + 4, p.y + FEET - 1, -this.fx.range(10, 40), -this.fx.range(5, 25), {
        color: this.fx.pick(dust),
        life: 0.35,
        g: 60,
      });
    }

    if (p.y > VIEW_H + 30) this.fall();
  }

  movePlayer(dt) {
    const p = this.player;
    const hb = PLAYER_HITBOX;
    const prevFeet = p.y + FEET;
    p.vy = Math.min(p.vy + PHYSICS.gravity * dt, 620);

    // по горизонталі: стіна вищого уступу зупиняє велосипед
    const oldRight = p.x + p.w - hb.r;
    p.x += p.vx * dt;
    const newRight = p.x + p.w - hb.r;
    for (const s of this.segments) {
      if (s.x0 < oldRight - 0.5 || s.x0 > newRight) continue;
      if (s.top < prevFeet - 3) {
        p.x = s.x0 - (p.w - hb.r) - 0.01;
        if (p.vx > 60 && this.mode !== 'demo') this.emit('bump');
        p.vx = 0;
        break;
      }
    }

    // по вертикалі: приземлення на найвищу поверхню під колесами
    p.y += p.vy * dt;
    const surface = this.surfaceUnder(p.x + hb.l, p.x + p.w - hb.r);
    const feet = p.y + FEET;
    if (surface !== null && p.vy >= 0 && prevFeet <= surface + 3 && feet >= surface) {
      p.y = surface - FEET;
      if (!p.onGround) {
        if (p.vy > 200) this.dustBurst(p.x + p.w / 2, surface, 6);
        if (p.vy > 200 && this.mode !== 'demo') this.emit('land');
      }
      p.vy = 0;
      p.onGround = true;
      if (this.slow <= 0 && this.slip <= 0) this.lastSafeX = p.x;
    } else {
      p.onGround = false;
    }
  }

  // Падіння в яму: мінус життя і повернення трохи назад, з розгоном.
  fall() {
    const p = this.player;
    if (this.phase === 'crash' || this.phase === 'over') {
      p.y = VIEW_H + 30;
      p.vy = 0;
      return;
    }
    if (this.mode !== 'demo') {
      this.hearts -= 1;
      this.hits += 1;
      this.flash = 0.25;
      this.emit('fall', { hearts: this.hearts });
      if (this.hearts <= 0) {
        this.setPhase('crash');
        this.result = this.makeResult(false);
        this.emit('crash');
        p.y = VIEW_H + 30;
        p.vy = 0;
        p.vx = 0;
        return;
      }
    }
    const seg = this.segmentAt(this.lastSafeX + 1) ?? this.segments.findLast((s) => s.x1 <= p.x) ?? this.segments[0];
    const x = Math.max(seg.x0 + 2, Math.min(this.lastSafeX, seg.x1 - 90));
    p.x = x;
    p.y = seg.top - FEET;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
    this.invuln = INVULN_TIME;
    this.camX = p.x - PLAYER_SCREEN_X;
  }

  updateCamera(dt) {
    const p = this.player;
    if (this.phase === 'crash' || this.phase === 'over') return;
    const target = p.x - PLAYER_SCREEN_X;
    this.camX += (target - this.camX) * Math.min(1, dt * 10);
  }

  // ---------- Об'єкти ----------
  updateEntities(dt) {
    for (const e of this.entities) {
      if (e.kind === 'decor' || e.kind === 'gate') continue;
      if (!e.active && e.x - this.camX < VIEW_W + 6) e.active = true;
      if (e.frames > 1) e.anim += dt;
      if (!e.active || !e.vx) continue;
      e.x += e.vx * dt;
      const beh = e.T.behavior;
      if (beh === 'walk' || beh === 'roll') {
        if (e.x < e.minX) {
          e.x = e.minX;
          e.vx = Math.abs(e.vx);
        } else if (e.x + e.w > e.maxX) {
          e.x = e.maxX - e.w;
          e.vx = -Math.abs(e.vx);
        }
        if (beh === 'roll' && e.T.hop) {
          e.anim += dt;
          e.dy = -Math.abs(Math.sin(e.anim * 5)) * e.T.hop;
        }
      } else if (beh === 'fly') {
        e.y = e.baseY + Math.round(Math.sin(this.time * 3 + e.id) * 2);
      }
      if (e.T.facesRight) e.flip = e.vx < 0;
    }
  }

  cull() {
    const left = this.camX - 120;
    let n = 0;
    for (const e of this.entities) {
      if (!e.dead && e.x + e.w > left) this.entities[n++] = e;
    }
    this.entities.length = n;
    while (this.segments.length > 2 && this.segments[0].x1 < left - 200) this.segments.shift();
  }

  playerBox() {
    const p = this.player;
    const hb = PLAYER_HITBOX;
    return { x: p.x + hb.l, y: p.y + hb.t, w: p.w - hb.l - hb.r, h: p.h - hb.t - hb.b };
  }

  collide() {
    if (this.phase !== 'ride' && this.phase !== 'finish') return;
    const pb = this.playerBox();
    for (const e of this.entities) {
      if (e.dead || e.kind === 'decor' || e.kind === 'gate') continue;
      const hb = hitboxOf(e);
      hb.y += e.dy || 0;
      if (!overlaps(pb, hb)) {
        if (e.kind === 'hazard') e.inside = false;
        continue;
      }
      if (e.kind === 'obstacle') this.hitObstacle(e);
      else if (e.kind === 'hazard' && this.player.onGround) this.enterHazard(e);
      else if (e.kind === 'pickup') this.collect(e);
    }
  }

  hitObstacle(e) {
    if (e.hit || this.mode === 'demo') return;
    const p = this.player;
    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = 0.5;
      e.dead = true;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, [...(e.T.debris ?? ['#ffffff']), '#4cd6ff'], 22, 80);
      this.shake = 3;
      this.emit('shieldBreak');
      return;
    }
    if (this.invuln > 0) return;
    e.hit = true;
    this.hearts -= 1;
    this.hits += 1;
    this.invuln = INVULN_TIME;
    this.shake = 5;
    this.flash = 0.22;
    p.vx *= 0.35;
    if (p.onGround) {
      p.vy = -150;
      p.onGround = false;
    }
    this.burst(p.x + p.w - 4, p.y + 10, e.T.debris ?? ['#ffffff'], 16, 70);
    this.emit('hit', { hearts: this.hearts });
    if (this.hearts <= 0) {
      this.setPhase('crash');
      p.vy = -220;
      this.shake = 8;
      this.result = this.makeResult(false);
      this.emit('crash');
    }
  }

  enterHazard(e) {
    const eff = e.T.effect;
    if (eff === 'slow') this.slow = SLOW_TIME;
    if (eff === 'slip') this.slip = SLIP_TIME;
    const p = this.player;
    if (this.fx.chance(0.5)) this.addParticle(p.x + 4, p.y + FEET - 2, -this.fx.range(20, 60), -this.fx.range(20, 70), { color: this.fx.pick(e.T.splash), life: 0.4, g: 300 });
    if (!e.inside) {
      e.inside = true;
      this.burst(p.x + p.w / 2, p.y + FEET - 2, e.T.splash ?? ['#ffffff'], 10, 50);
      if (eff === 'slip') p.vx *= 1.15;
      if (this.mode !== 'demo') this.emit(eff === 'slip' ? 'slip' : 'splash');
    }
  }

  collect(e) {
    e.dead = true;
    const x = e.x + e.w / 2;
    const y = e.y + e.h / 2;
    const eff = e.T.effect;
    if (eff === 'coin') {
      this.burst(x, y, ['#ffd23f', '#fff3a0', '#ffffff'], 6, 30);
      if (this.mode === 'demo') return;
      this.coins += 1;
      this.addText(x, y - 6, '+1', '#ffd23f');
      this.emit('coin');
    } else if (eff === 'heart') {
      this.burst(x, y, ['#ff3b5c', '#ffd0d8'], 10, 40);
      if (this.mode === 'demo') return;
      if (this.hearts < MAX_HEARTS) {
        this.hearts += 1;
        this.addText(x, y - 6, '+1', '#ff5b7a');
      } else {
        this.coins += 5;
        this.addText(x, y - 6, '+5', '#ffd23f');
      }
      this.emit('heart');
    } else if (eff === 'shield') {
      this.burst(x, y, ['#4cd6ff', '#e6fbff'], 12, 45);
      if (this.mode === 'demo') return;
      this.shield = SHIELD_TIME;
      this.emit('shield');
    }
  }

  finishRun() {
    this.setPhase('finish');
    this.result = this.makeResult(true);
    for (let i = 0; i < 70; i++) {
      this.addParticle(this.finishX + this.fx.range(-10, 10), GROUND_Y - this.fx.range(30, 60), this.fx.range(-70, 70), this.fx.range(-120, -30), {
        color: this.fx.pick(['#ff4d5e', '#ffd23f', '#4cd6ff', '#7ed957', '#ff4fd8', '#ffffff']),
        life: this.fx.range(0.8, 1.6),
        g: 120,
        size: 2,
      });
    }
    this.emit('finish');
  }

  endRun() {
    this.setPhase('over');
    this.emit('end', { result: this.result });
  }

  makeResult(completed) {
    return {
      locationId: this.location.id,
      mode: this.mode,
      completed,
      distanceM: Math.floor((completed ? this.lengthPx : Math.min(this.distance, this.mode === 'level' ? this.lengthPx : Infinity)) / PX_PER_METER),
      lengthM: this.location.lengthM,
      coins: this.coins,
      hearts: Math.max(0, this.hearts),
      stars: completed ? Math.max(1, this.hearts) : 0,
      time: Math.round(this.rideTime * 10) / 10,
      hits: this.hits,
      jumps: this.jumps,
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

  dustBurst(x, y, n) {
    const dust = this.location.dust;
    if (!dust) return;
    for (let i = 0; i < n; i++) {
      this.addParticle(x + this.fx.range(-4, 4), y - 1, this.fx.range(-40, 40), -this.fx.range(10, 40), { color: this.fx.pick(dust), life: 0.35, g: 120 });
    }
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 0.8 });
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

  // ---------- Дані для HUD ----------
  hud() {
    return {
      phase: this.phase,
      phaseTime: this.phaseTime,
      countdown: this.phase === 'countdown' ? Math.ceil(this.countdown) : 0,
      hearts: Math.max(0, this.hearts),
      coins: this.coins,
      distanceM: Math.floor(Math.min(this.distance, this.mode === 'level' ? this.lengthPx : Infinity) / PX_PER_METER),
      lengthM: this.location.lengthM,
      progress: this.progress(),
      speedKmh: Math.round((this.player.vx / PX_PER_METER) * 3.6),
      shield: this.shield / SHIELD_TIME,
      slow: this.slow > 0,
      slip: this.slip > 0,
    };
  }
}

/**
 * Простий «бот»: стрибає перед ямами, уступами і перешкодами, не стрибає під птахами.
 * Використовується в демо-режимі (фон меню) і в тестах для перевірки, що рівні прохідні.
 */
export function botInput(world) {
  const p = world.player;
  const hb = PLAYER_HITBOX;
  const v = Math.max(p.vx, 30);
  const front = p.x + p.w - hb.r;
  const back = p.x + hb.l;
  const feet = p.y + FEET;
  let jump = false;
  if (!p.onGround) return { dir: 0, jump: false };

  // яма: стрибаємо, коли заднє колесо підходить до краю
  if (world.surfaceUnder(back + 6, back + 7) === null) jump = true;
  // уступ угору попереду
  for (const s of world.segments) {
    if (s.x0 >= front - 1 && s.x0 - front < v * 0.18 + 6 && s.top < feet - 3) jump = true;
  }
  // перешкода: верхня точка стрибка має бути над її серединою
  let bird = false;
  for (const e of world.entities) {
    if (e.kind !== 'obstacle' || e.dead) continue;
    const rel = v - (e.active ? e.vx : 0);
    const gap = e.x + e.hitbox[0] - front;
    if (e.T.behavior === 'fly') {
      if (gap > -e.w && gap < rel * AIR_TIME + 10) bird = true;
      continue;
    }
    const takeoff = Math.max(3, (rel * AIR_TIME) / 2 - (e.w - e.hitbox[0] - e.hitbox[2]) / 2 - (p.w - hb.l - hb.r) / 2);
    if (gap > 0 && gap <= takeoff) jump = true;
  }
  if (bird && world.surfaceUnder(back, front + v * 0.25) !== null) {
    // під птахом їдемо рівно, якщо попереду немає ями
    let pitAhead = false;
    for (let x = front; x < front + v * 0.3; x += 4) if (world.groundAt(x) === null) pitAhead = true;
    if (!pitAhead) jump = false;
  }
  return { dir: 0, jump };
}
