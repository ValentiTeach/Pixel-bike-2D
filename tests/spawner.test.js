import { describe, it, expect } from 'vitest';
import { World } from '../src/game/world.js';
import { LOCATIONS } from '../src/game/locations.js';
import { PLAYER_PHYSICS, PLAYER_HITBOX, PLAYER_W, VIEW_W } from '../src/game/constants.js';

const DT = 1 / 120;

function simulate(location, seed, { mode = 'level', bot = true, immortal = true, maxTime = 400 } = {}) {
  const world = new World({ location, mode, seed });
  world.spawner.log = [];
  const events = [];
  let t = 0;
  while (world.phase !== 'over' && t < maxTime) {
    if (immortal) world.hearts = 99;
    if (bot) world.input = world.autopilot();
    world.update(DT);
    events.push(...world.events);
    world.events.length = 0;
    t += DT;
  }
  return { world, events, t };
}

describe('генератор рівня (чесність)', () => {
  for (const loc of LOCATIONS) {
    it(`${loc.id}: у кожному рядку є досяжний вільний прохід`, () => {
      for (const seed of [1, 2, 3]) {
        const { world } = simulate(loc, seed);
        const log = world.spawner.log;
        expect(log.length).toBeGreaterThan(20);
        const playerW = PLAYER_W - PLAYER_HITBOX.l - PLAYER_HITBOX.r;
        let prev = null;
        for (const row of log) {
          // прохід ширший за гравця з запасом
          expect(row.gapR - row.gapL).toBeGreaterThan(playerW + 10);
          expect(row.gapL).toBeGreaterThanOrEqual(loc.road.left - 0.001);
          expect(row.gapR).toBeLessThanOrEqual(loc.road.right + 0.001);
          // жодна перешкода не заходить у прохід
          for (const o of row.obstacles) {
            const inside = o.x < row.gapR && o.x + o.w > row.gapL;
            expect(inside, `${loc.id} seed ${seed}: ${o.type} у проході`).toBe(false);
            expect(o.x).toBeGreaterThanOrEqual(loc.road.left - 0.001);
            expect(o.x + o.w).toBeLessThanOrEqual(loc.road.right + 0.001);
          }
          // зсув проходу фізично досяжний за час між рядками
          if (prev && row.prevKind === 'wall') {
            const time = row.spacingToPrev / row.speed;
            const reach = PLAYER_PHYSICS.maxSpeed * time;
            expect(Math.abs(row.center - prev.center)).toBeLessThanOrEqual(reach);
          }
          prev = row;
        }
      }
    });
  }

  it('декор ніколи не стоїть на дорозі', () => {
    const bad = [];
    for (const loc of LOCATIONS) {
      const world = new World({ location: loc, mode: 'demo', seed: 5 });
      for (let i = 0; i < 2000; i++) {
        world.update(DT * 2);
        for (const e of world.entities) {
          if (e.kind !== 'decor') continue;
          const onRoad = e.x < loc.road.right && e.x + e.w > loc.road.left;
          const offScreen = e.x + e.w <= -12 || e.x >= VIEW_W + 12;
          if (onRoad || offScreen) bad.push(`${loc.id}: ${e.sprite} x=${e.x}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('заїзд', () => {
  it('рівень можна пройти до фінішу; результат коректний', () => {
    const loc = LOCATIONS[0];
    const { world, events } = simulate(loc, 11);
    const types = events.map((e) => e.type);
    expect(types).toContain('go');
    expect(types).toContain('finish');
    expect(types.at(-1)).toBe('end');
    expect(world.result.completed).toBe(true);
    expect(world.result.distanceM).toBe(loc.lengthM);
    expect(world.result.stars).toBeGreaterThanOrEqual(1);
  });

  it('бот, що їде проходами, майже не б\'ється об статичні перешкоди', () => {
    // у пустелі рухомих перешкод мало — перевіряємо, що алгоритм проходів реально працює
    for (const loc of LOCATIONS) {
      const { world } = simulate(loc, 3, { immortal: true });
      const walls = world.spawner.log.length;
      expect(world.hits / walls, loc.id).toBeLessThan(0.12);
    }
  });

  it('без бота гравець врешті падає, і заїзд закінчується аварією', () => {
    const { world, events } = simulate(LOCATIONS[1], 4, { bot: false, immortal: false });
    expect(events.map((e) => e.type)).toContain('crash');
    expect(world.result.completed).toBe(false);
    expect(world.result.hearts).toBe(0);
  });

  it('нескінченний режим не має фінішу і швидшає', () => {
    const loc = LOCATIONS[0];
    const world = new World({ location: loc, mode: 'endless', seed: 9 });
    world.distance = loc.lengthM * 10 * 3;
    expect(world.targetSpeed()).toBeGreaterThan(loc.speed[1]);
    expect(world.targetSpeed()).toBeLessThanOrEqual(loc.speed[1] * 1.25);
  });

  it('гравець не виїжджає за межі дороги', () => {
    const loc = LOCATIONS[2];
    const world = new World({ location: loc, mode: 'level', seed: 2 });
    world.input = -1;
    for (let i = 0; i < 600; i++) world.update(DT);
    expect(world.player.x).toBeGreaterThanOrEqual(loc.road.left);
    world.input = 1;
    for (let i = 0; i < 600; i++) world.update(DT);
    expect(world.player.x + world.player.w).toBeLessThanOrEqual(loc.road.right);
  });
});
