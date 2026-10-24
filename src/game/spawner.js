// Генератор рівня: рядки перешкод, монети, бонуси, небезпечні зони та декор узбіч.
//
// Головна ідея — ЧЕСНІСТЬ. Кожен «рядок-стіна» має прохід (gap) достатньої ширини, і
// центр проходу зсувається відносно попереднього не більше, ніж гравець фізично встигне
// доїхати за час між рядками: maxShift = maxSpeed × (відстань / швидкість прокрутки) × запас.
// Рухомі перешкоди (олені, краби…) з'являються окремими рядками, після яких дається
// достатньо місця, щоб перетнути всю дорогу.
import { ENTITY_TYPES, isMover } from './entities.js';
import { spriteSize } from './sprites.js';
import { PLAYER_PHYSICS, SPAWN_Y, VIEW_H, MAX_HEARTS } from './constants.js';
import { lerp, clamp } from './rng.js';

const typeSize = (typeId) => spriteSize(ENTITY_TYPES[typeId].sprites[0]);
const COIN = 8;
const REACH_MARGIN = 0.6; // використовуємо лише 60% теоретичної досяжності — запас на реакцію

export class Spawner {
  constructor(location, rng) {
    this.loc = location;
    this.rng = rng;
    this.L = location.road.left;
    this.R = location.road.right;
    this.untilNext = 170; // перший рядок трохи згодом після старту
    this.lastGap = (this.L + this.R) / 2;
    this.spacingToPrev = 170;
    this.prevKind = 'start';
    this.prevRowH = 0;
    this.slipBefore = false;
    this.rows = 0;
    this.statics = location.obstacles.filter((o) => !isMover(o.type));
    this.movers = location.obstacles.filter((o) => isMover(o.type));
    this.tracks = location.decor.map((t) => ({ ...t, cursor: VIEW_H + 12 }));
    /** журнал рядків-стін (для тестів чесності): { y, gapL, gapR, center, obstacles: [] } */
    this.log = null;
  }

  // ---------- Декор ----------
  // Кожна «доріжка» декору має курсор — верхню межу вже заповненого простору.
  // Коли курсор опускається нижче за верх екрана, додаємо новий об'єкт над ним.
  updateDecor(world, scroll) {
    for (const tr of this.tracks) {
      tr.cursor += scroll;
      while (tr.cursor > -8) this.placeDecor(world, tr);
    }
  }

  placeDecor(world, tr) {
    const rng = this.rng;
    const item = rng.weighted(tr.items);
    const { w, h } = spriteSize(item.sprite);
    const gap = rng.int(tr.gap[0], tr.gap[1]);
    const [z0, z1] = tr.zone;
    let x;
    if (tr.align === 'start') x = z0;
    else if (tr.align === 'end') x = z1 - w;
    else x = z1 - w <= z0 ? z0 : rng.range(z0, z1 - w);
    const y = tr.cursor - gap - h;
    world.spawnDecor(item, Math.round(x), y);
    tr.cursor -= Math.max(3, gap + (tr.solid ? h : Math.ceil(h * 0.6)));
  }

  // ---------- Рядки перешкод ----------
  updateRows(world, scroll, difficulty) {
    this.untilNext -= scroll;
    while (this.untilNext <= 0) {
      const y = SPAWN_Y - this.untilNext; // компенсуємо «перебіг», щоб відстані були точними
      const spacing = this.spawnRow(world, difficulty, y);
      this.untilNext += spacing;
    }
  }

  spawnRow(world, d, y) {
    const rng = this.rng;
    const sp = this.loc.spawn;
    const speed = Math.max(world.speed, this.loc.speed[0]);
    let spacing = lerp(sp.spacing[0], sp.spacing[1], d) * rng.range(0.88, 1.18);

    const moverChance = lerp(sp.mover[0], sp.mover[1], d);
    if (this.rows >= 2 && this.movers.length && this.prevKind !== 'mover' && rng.chance(moverChance)) {
      const h = this.spawnMover(world, d, y);
      // після рухомої перешкоди гравець може опинитися будь-де — даємо час перетнути дорогу
      const traverse = (this.R - this.L) / PLAYER_PHYSICS.maxSpeed;
      spacing = Math.max(spacing, speed * traverse * 0.9 + h + 20);
      this.prevKind = 'mover';
      this.prevRowH = h;
    } else {
      this.spawnWall(world, d, y, speed);
      this.prevKind = 'wall';
    }

    // небезпечна зона між цим і наступним рядком
    if (this.loc.hazards.length && rng.chance(sp.hazard)) {
      const hz = rng.weighted(this.loc.hazards);
      const { w, h } = typeSize(hz.type);
      const hx = rng.range(this.L + 2, this.R - w - 2);
      world.spawn(hz.type, hx, y - spacing * 0.5 - h / 2);
      if (ENTITY_TYPES[hz.type].effect === 'slip') {
        spacing += 36;
        this.slipBefore = true;
      }
    }

    this.rows += 1;
    this.spacingToPrev = spacing;
    return spacing;
  }

  spawnWall(world, d, y, speed) {
    const rng = this.rng;
    const sp = this.loc.spawn;
    const { L, R } = this;
    const gapW = lerp(sp.gap[0], sp.gap[1], d) * rng.range(0.95, 1.1);
    let center;
    if (this.prevKind !== 'wall') {
      center = rng.range(L + gapW / 2, R - gapW / 2);
    } else {
      const t = Math.max(0.05, (this.spacingToPrev - this.prevRowH) / speed);
      let maxShift = PLAYER_PHYSICS.maxSpeed * t * REACH_MARGIN;
      if (this.slipBefore) maxShift *= 0.5;
      center = this.lastGap + rng.range(-maxShift, maxShift);
    }
    center = clamp(center, L + gapW / 2, R - gapW / 2);
    const gapL = center - gapW / 2;
    const gapR = center + gapW / 2;
    const fill = lerp(sp.fill[0], sp.fill[1], d);
    const placed = [];
    const rowH = Math.max(this.fillSegment(world, L, gapL, y, fill, placed), this.fillSegment(world, gapR, R, y, fill, placed));

    // монети-підказки: від цього проходу до попереднього
    if (this.prevKind === 'wall' && rng.chance(sp.coinTrail)) {
      const S = this.spacingToPrev;
      const y0 = y + rowH + 4;
      const y1 = y + S - COIN - 4;
      const n = Math.floor((y1 - y0) / 15);
      for (let i = 0; i < n; i++) {
        const cy = lerp(y0, y1, (i + 0.5) / n);
        const cx = lerp(center, this.lastGap, (cy - y) / S);
        world.spawn('coin', cx - COIN / 2, cy);
      }
    }
    // бонус у самому проході
    if (rng.chance(0.75)) {
      let type = 'coin';
      const r = rng.next();
      if (r < 0.035 && world.hearts < MAX_HEARTS) type = 'heart';
      else if (r < 0.065) type = 'shield';
      world.spawn(type, center - COIN / 2, y + Math.max(0, rowH / 2 - COIN / 2));
    }

    world.addMarker(center, y);
    if (this.log) this.log.push({ y, gapL, gapR, center, gapW, speed, spacingToPrev: this.spacingToPrev, prevKind: this.prevKind, obstacles: placed });
    this.lastGap = center;
    this.prevRowH = rowH;
    this.slipBefore = false;
  }

  // Заповнює відрізок дороги [a, b] статичними перешкодами. Повертає висоту рядка.
  fillSegment(world, a, b, y, fill, placed) {
    const rng = this.rng;
    let x = a + rng.int(0, 5);
    let rowH = 0;
    for (let guard = 0; guard < 40; guard++) {
      const room = b - x;
      if (room < 5) break;
      const fits = this.statics.filter((o) => typeSize(o.type).w <= room);
      if (!fits.length) break;
      if (rng.chance(fill)) {
        const o = rng.weighted(fits);
        const { w, h } = typeSize(o.type);
        const ex = rng.range(x, Math.min(b - w, x + 6));
        const ey = y + rng.int(0, 4);
        const e = world.spawn(o.type, ex, ey);
        placed.push({ x: ex, w, type: o.type, entity: e });
        rowH = Math.max(rowH, ey - y + h);
        x = ex + w + rng.int(1, 8);
      } else {
        x += rng.int(10, 22);
      }
    }
    return rowH;
  }

  spawnMover(world, d, y) {
    const rng = this.rng;
    const o = rng.weighted(this.movers);
    const T = ENTITY_TYPES[o.type];
    const { w, h } = typeSize(o.type);
    const speed = rng.range(T.speed[0], T.speed[1]) * lerp(0.9, 1.2, d);
    let x;
    let vx;
    if (T.behavior === 'cross') {
      const fromLeft = rng.chance(0.5);
      x = fromLeft ? this.L - w - rng.int(2, 10) : this.R + rng.int(2, 10);
      vx = fromLeft ? speed : -speed;
    } else {
      x = rng.range(this.L, this.R - w);
      vx = rng.sign() * speed;
    }
    world.spawn(o.type, x, y, { vx });
    return h;
  }
}
