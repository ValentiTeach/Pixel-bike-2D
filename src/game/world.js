// Ігровий світ: уся логіка без DOM (рух, зіткнення, фази заїзду, частинки).
// Рендер і звук живуть окремо (renderer.js, audio.js), тож World легко тестувати в Node.
import {
  VIEW_H, PX_PER_METER, PLAYER_W, PLAYER_H, PLAYER_Y, PLAYER_PHYSICS, PLAYER_HITBOX,
  MAX_HEARTS, INVULN_TIME, SHIELD_TIME, SLOW_FACTOR, SLOW_TIME, SLIP_TIME,
  COUNTDOWN_TIME, FINISH_TIME, CRASH_TIME,
} from './constants.js';
import { createRng, lerp, clamp, smoothstep } from './rng.js';
import { ENTITY_TYPES } from './entities.js';
import { spriteSize } from './sprites.js';
import { overlaps, hitboxOf } from './collision.js';
import { Spawner } from './spawner.js';
import { createWeather, updateWeather } from './weather.js';

// Декор, що лежить на землі (без тіні, під усіма об'єктами).
const FLAT_DECOR = /^(towel|shell|starfish|flowers|grass|dune)/;
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
    this.road = { ...location.road };
    this.lengthPx = location.lengthM * PX_PER_METER;

    this.entities = [];
    this.markers = []; // центри проходів (для автопілота в демо-режимі)
    this.particles = [];
    this.texts = [];
    this.events = [];
    this.nextId = 1;

    this.player = {
      x: Math.round((this.road.left + this.road.right) / 2 - PLAYER_W / 2),
      y: PLAYER_Y,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      lean: 0,
      pedal: 0,
    };
    this.input = 0; // -1 вліво, 0, 1 вправо

    this.time = 0;
    this.rideTime = 0;
    this.distance = 0;
    this.speed = 0;
    this.hearts = MAX_HEARTS;
    this.coins = 0;
    this.hits = 0;
    this.shield = 0;
    this.invuln = 0;
    this.slow = 0;
    this.slip = 0;
    this.shake = 0;
    this.flash = 0;
    this.result = null;
    this.finishSpawned = false;

    this.phase = mode === 'demo' ? 'ride' : 'countdown';
    this.phaseTime = 0;
    this.countdown = COUNTDOWN_TIME;
    if (mode === 'demo') this.speed = this.targetSpeed();

    this.weather = createWeather(location.weather, this.fx);
    this.spawner = new Spawner(location, this.rng);
    this.spawner.updateDecor(this, 0); // заповнюємо узбіччя одразу на весь екран
    if (mode !== 'demo') this.addLine('start', this.player.y - 3);
  }

  // ---------- Створення об'єктів ----------
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
      frames,
      anim: this.fx.range(0, 1),
      flip: false,
      ...extra,
    };
    if (T.facesRight) e.flip = e.vx < 0;
    this.entities.push(e);
    return e;
  }

  spawnDecor(item, x, y) {
    const { w, h } = spriteSize(item.sprite);
    this.entities.push({
      id: this.nextId++,
      kind: 'decor',
      sprite: item.sprite,
      x,
      y,
      w,
      h,
      light: item.light ?? null,
      flat: item.flat ?? FLAT_DECOR.test(item.sprite),
      frames: 1,
    });
  }

  addLine(style, y) {
    const { left, right } = this.road;
    this.entities.push({ id: this.nextId++, kind: 'line', style, x: left, y, w: right - left, h: 6, frames: 1 });
  }

  addMarker(x, y) {
    this.markers.push({ x, y });
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  // ---------- Складність і швидкість ----------
  progress() {
    return this.mode === 'level' ? clamp(this.distance / this.lengthPx, 0, 1) : 0;
  }

  difficulty() {
    if (this.mode === 'demo') return 0.3;
    if (this.mode === 'level') return clamp(this.distance / this.lengthPx, 0, 1);
    return clamp(this.distance / (this.lengthPx * 1.2), 0, 1);
  }

  targetSpeed() {
    const [base, max] = this.location.speed;
    if (this.mode === 'demo') return lerp(base, max, 0.25);
    if (this.mode === 'level') return lerp(base, max, smoothstep(this.difficulty()));
    // нескінченний режим: після «довжини рівня» швидкість росте далі, до +25%
    const p = this.distance / (this.lengthPx * 1.2);
    if (p <= 1) return lerp(base, max, smoothstep(p));
    return Math.min(max * 1.25, max * (1 + (p - 1) * 0.08));
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

    let target = 0;
    if (this.phase === 'ride') target = this.targetSpeed();
    else if (this.phase === 'finish') target = this.targetSpeed() * 0.7;
    if (this.slow > 0) target *= SLOW_FACTOR;
    const k = this.phase === 'crash' ? 2.5 : this.slow > 0 ? 6 : 1.4;
    this.speed += (target - this.speed) * Math.min(1, dt * k);

    const scroll = this.phase === 'countdown' ? 0 : this.speed * dt;
    this.distance += scroll;
    if (this.phase === 'ride') this.rideTime += dt;

    this.invuln = Math.max(0, this.invuln - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.slip = Math.max(0, this.slip - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.shake *= Math.exp(-dt * 9);

    this.updatePlayer(dt);
    this.updateEntities(dt, scroll);

    this.spawner.updateDecor(this, scroll);
    const remaining = this.lengthPx - this.distance;
    const canSpawn = this.phase === 'ride' && (this.mode !== 'level' || remaining > PLAYER_Y + 80);
    if (canSpawn) this.spawner.updateRows(this, scroll, this.difficulty());

    if (this.mode === 'level' && !this.finishSpawned && remaining <= PLAYER_Y + 40) {
      this.finishSpawned = true;
      this.addLine('finish', this.player.y - remaining - 3);
    }
    if (this.mode === 'level' && this.phase === 'ride' && remaining <= 0) this.finishRun();

    this.collide();
    this.updateParticles(dt, scroll);
    updateWeather(this.weather, dt, scroll, this.fx, this.time);

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
    const P = PLAYER_PHYSICS;
    const minX = this.road.left + 1;
    const maxX = this.road.right - p.w - 1;

    if (this.phase === 'crash' || this.phase === 'over') {
      p.vx *= Math.exp(-dt * 3);
      p.x = clamp(p.x + p.vx * dt, minX, maxX);
      return;
    }

    const dir = this.mode === 'demo' ? this.autopilot() : this.input;
    const slip = this.slip > 0;
    const accel = slip ? P.slipAccel : P.accel;
    const fric = slip ? P.slipFriction : P.friction;
    if (dir) {
      // розворот у протилежний бік — швидший (чутливе керування)
      const a = Math.sign(p.vx) === -dir ? accel + fric : accel;
      p.vx += dir * a * dt;
    } else {
      const dv = fric * dt;
      p.vx = Math.abs(p.vx) <= dv ? 0 : p.vx - Math.sign(p.vx) * dv;
    }
    p.vx = clamp(p.vx, -P.maxSpeed, P.maxSpeed);
    p.x += p.vx * dt;
    if (p.x < minX) {
      p.x = minX;
      p.vx = slip ? -p.vx * 0.4 : 0;
    } else if (p.x > maxX) {
      p.x = maxX;
      p.vx = slip ? -p.vx * 0.4 : 0;
    }
    p.lean = p.vx / P.maxSpeed;
    p.pedal += this.speed * dt * 0.06;

    // пил з-під коліс на ґрунті/піску/снігу
    const dust = this.location.dust;
    if (dust && Math.abs(p.vx) > 45 && this.speed > 20 && this.fx.chance(dt * 40)) {
      this.addParticle(p.x + p.w / 2 + this.fx.range(-2, 2), p.y + p.h - 2, -p.vx * 0.2, this.fx.range(10, 30), {
        color: this.fx.pick(dust),
        life: 0.4,
        world: true,
      });
    }
  }

  // Автопілот демо-режиму: їде до найближчого проходу попереду.
  autopilot() {
    const p = this.player;
    let target = null;
    for (const m of this.markers) {
      if (m.y < p.y + p.h && (!target || m.y > target.y)) target = m;
    }
    const tx = target ? target.x : (this.road.left + this.road.right) / 2;
    const diff = tx - (p.x + p.w / 2);
    return Math.abs(diff) < 4 ? 0 : Math.sign(diff);
  }

  playerBox() {
    const p = this.player;
    const hb = PLAYER_HITBOX;
    return { x: p.x + hb.l, y: p.y + hb.t, w: p.w - hb.l - hb.r, h: p.h - hb.t - hb.b };
  }

  // ---------- Об'єкти ----------
  updateEntities(dt, scroll) {
    const { left, right } = this.road;
    let n = 0;
    for (const e of this.entities) {
      e.y += scroll;
      if (e.vx) {
        e.x += e.vx * dt;
        const beh = e.T?.behavior;
        if (beh === 'sideways') {
          if (e.x < left) {
            e.x = left;
            e.vx = Math.abs(e.vx);
          } else if (e.x + e.w > right) {
            e.x = right - e.w;
            e.vx = -Math.abs(e.vx);
          }
        } else if (beh === 'cross') {
          if ((e.vx > 0 && e.x > right + 30) || (e.vx < 0 && e.x + e.w < left - 30)) e.dead = true;
        }
        if (e.T?.facesRight) e.flip = e.vx < 0;
      }
      if (e.frames > 1) e.anim += dt;
      if (e.y > VIEW_H + 16) e.dead = true;
      if (!e.dead) this.entities[n++] = e;
    }
    this.entities.length = n;

    let m = 0;
    for (const mk of this.markers) {
      mk.y += scroll;
      if (mk.y < VIEW_H) this.markers[m++] = mk;
    }
    this.markers.length = m;
  }

  collide() {
    if (this.phase !== 'ride' && this.phase !== 'finish') return;
    const pb = this.playerBox();
    for (const e of this.entities) {
      if (e.dead || e.kind === 'decor' || e.kind === 'line') continue;
      if (!overlaps(pb, hitboxOf(e))) {
        if (e.kind === 'hazard') e.inside = false;
        continue;
      }
      if (e.kind === 'obstacle') this.hitObstacle(e);
      else if (e.kind === 'hazard') this.enterHazard(e);
      else if (e.kind === 'pickup') this.collect(e);
    }
  }

  hitObstacle(e) {
    if (e.hit || this.mode === 'demo') return;
    const p = this.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + 4;
    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = 0.5;
      e.dead = true;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, [...(e.T.debris ?? ['#ffffff']), '#4cd6ff'], 22, 70);
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
    this.speed *= 0.45;
    this.burst(cx, cy, e.T.debris ?? ['#ffffff'], 16, 60);
    this.emit('hit', { hearts: this.hearts });
    if (this.hearts <= 0) {
      this.setPhase('crash');
      p.vx = p.vx * 0.5 + (this.fx.chance(0.5) ? 25 : -25);
      this.shake = 8;
      this.result = this.makeResult(false);
      this.emit('crash');
    }
  }

  enterHazard(e) {
    const eff = e.T.effect;
    if (eff === 'slow') this.slow = SLOW_TIME;
    if (eff === 'slip') this.slip = SLIP_TIME;
    if (!e.inside) {
      e.inside = true;
      const p = this.player;
      this.burst(p.x + p.w / 2, p.y + p.h - 4, e.T.splash ?? ['#ffffff'], 10, 40, true);
      if (eff === 'slip') p.vx += this.fx.sign() * 35;
      if (this.mode !== 'demo') this.emit(eff === 'slip' ? 'slip' : 'splash');
    }
  }

  collect(e) {
    e.dead = true;
    const x = e.x + e.w / 2;
    const y = e.y + e.h / 2;
    const eff = e.T.effect;
    if (eff === 'coin') {
      this.burst(x, y, ['#ffd23f', '#fff3a0', '#ffffff'], 6, 30, true);
      if (this.mode === 'demo') return;
      this.coins += 1;
      this.addText(x, y - 6, '+1', '#ffd23f');
      this.emit('coin');
    } else if (eff === 'heart') {
      this.burst(x, y, ['#ff3b5c', '#ffd0d8'], 10, 40, true);
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
      this.burst(x, y, ['#4cd6ff', '#e6fbff'], 12, 45, true);
      if (this.mode === 'demo') return;
      this.shield = SHIELD_TIME;
      this.emit('shield');
    }
  }

  finishRun() {
    this.setPhase('finish');
    this.result = this.makeResult(true);
    const { left, right } = this.road;
    for (let i = 0; i < 60; i++) {
      this.addParticle(this.fx.range(left, right), this.player.y - this.fx.range(0, 30), this.fx.range(-40, 40), this.fx.range(-90, -30), {
        color: this.fx.pick(['#ff4d5e', '#ffd23f', '#4cd6ff', '#7ed957', '#ff4fd8', '#ffffff']),
        life: this.fx.range(0.8, 1.6),
        g: 90,
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
      distanceM: Math.floor((completed ? this.lengthPx : this.distance) / PX_PER_METER),
      lengthM: this.location.lengthM,
      coins: this.coins,
      hearts: Math.max(0, this.hearts),
      stars: completed ? Math.max(1, this.hearts) : 0,
      time: Math.round(this.rideTime * 10) / 10,
      hits: this.hits,
    };
  }

  // ---------- Частинки та тексти ----------
  addParticle(x, y, vx, vy, { color = '#ffffff', life = 0.5, g = 0, size = 1, world = false } = {}) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, color, life, max: life, g, size, world });
  }

  burst(x, y, colors, count, power, world = false) {
    for (let i = 0; i < count; i++) {
      const a = this.fx.range(0, Math.PI * 2);
      const s = this.fx.range(power * 0.3, power);
      this.addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - 10, {
        color: this.fx.pick(colors),
        life: this.fx.range(0.3, 0.7),
        g: 120,
        size: this.fx.chance(0.3) ? 2 : 1,
        world,
      });
    }
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 0.8 });
  }

  updateParticles(dt, scroll) {
    let n = 0;
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt + (p.world ? scroll : 0);
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
      speedKmh: Math.round((this.speed / PX_PER_METER) * 3.6),
      shield: this.shield / SHIELD_TIME,
      slow: this.slow > 0,
      slip: this.slip > 0,
    };
  }
}

