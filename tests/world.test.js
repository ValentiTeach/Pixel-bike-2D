import { describe, it, expect } from 'vitest';
import { World, botInput } from '../src/game/world.js';
import { LOCATIONS } from '../src/game/locations.js';
import { ENTITY_TYPES } from '../src/game/entities.js';
import { canClear, timeAbove } from '../src/game/levelGen.js';
import {
  AIR_TIME, JUMP_HEIGHT, STEP_H, PLAYER_H, PLAYER_HITBOX, PHYSICS, START_X, MAX_LEVEL, GROUND_Y,
} from '../src/game/constants.js';
import { spriteSize } from '../src/game/sprites.js';

const DT = 1 / 120;

function simulate(location, seed, { mode = 'level', bot = true, immortal = true, maxTime = 400, onStep } = {}) {
  const world = new World({ location, mode, seed });
  const events = [];
  const segments = new Map();
  let t = 0;
  while (world.phase !== 'over' && t < maxTime) {
    if (immortal) world.hearts = 99;
    if (bot) {
      const b = botInput(world);
      world.dir = b.dir;
      world.jumpHeld = true;
      if (b.jump) world.pressJump();
    }
    world.update(DT);
    for (const s of world.segments) segments.set(s.x0, s);
    onStep?.(world);
    events.push(...world.events);
    world.events.length = 0;
    t += DT;
  }
  return { world, events, t, segments: [...segments.values()].sort((a, b) => a.x0 - b.x0) };
}

describe('фізика стрибка', () => {
  it('стрибок вищий за уступ і найвищу перешкоду', () => {
    expect(JUMP_HEIGHT).toBeGreaterThan(STEP_H + 20);
    for (const loc of LOCATIONS) {
      for (const o of loc.obstacles) {
        const { h } = spriteSize(ENTITY_TYPES[o.type].sprites[0]);
        expect(h, `${loc.id}: ${o.type}`).toBeLessThan(JUMP_HEIGHT - 10);
      }
    }
    expect(timeAbove(JUMP_HEIGHT + 1)).toBe(0);
    expect(timeAbove(0)).toBeCloseTo(AIR_TIME, 5);
  });
});

describe('генератор рівня (чесність)', () => {
  for (const loc of LOCATIONS) {
    it(`${loc.id}: ями, перешкоди і птахи прохідні`, () => {
      for (const seed of [1, 2, 3]) {
        const { world, segments } = simulate(loc, seed);
        const log = world.gen.log;
        expect(log.length).toBeGreaterThan(20);
        for (const c of log) {
          if (c.kind === 'pit') {
            // ширина ями не більша за дальність стрибка на поточній швидкості
            expect(c.width).toBeLessThanOrEqual(c.v * AIR_TIME * 0.75 + 0.5);
          }
          if (c.kind === 'obstacle' || c.kind === 'double') {
            expect(canClear(c.w, c.h, c.v), `${loc.id}#${seed}: ${c.type} при ${c.v.toFixed(0)} px/с`).toBe(true);
          }
          if (c.kind === 'bird') {
            // птах вище голови, але нижче верхньої точки стрибка
            expect(c.lift).toBeGreaterThan(PLAYER_H - PLAYER_HITBOX.t + 2);
            expect(c.lift).toBeLessThan(JUMP_HEIGHT + PLAYER_H);
          }
        }
        // рельєф: впорядковані відрізки, висоти в межах, між відрізками лише ями
        for (let i = 0; i < segments.length; i++) {
          const s = segments[i];
          expect(s.x1).toBeGreaterThan(s.x0);
          expect(s.top).toBeGreaterThanOrEqual(GROUND_Y - MAX_LEVEL * STEP_H);
          expect(s.top).toBeLessThanOrEqual(GROUND_Y);
          if (i > 0) expect(s.x0).toBeGreaterThanOrEqual(segments[i - 1].x1);
        }
      }
    });
  }

  it('бот проходить кожну локацію без ударів і падінь', () => {
    for (const loc of LOCATIONS) {
      for (const seed of [4, 5]) {
        const { world, events } = simulate(loc, seed);
        expect(world.result.completed, `${loc.id}#${seed}`).toBe(true);
        expect(world.hits, `${loc.id}#${seed}`).toBeLessThanOrEqual(1);
        expect(events.filter((e) => e.type === 'fall').length).toBe(0);
      }
    }
  });

  it('декор стоїть на землі і не висить над ямами', () => {
    const bad = [];
    for (const loc of LOCATIONS) {
      simulate(loc, 6, {
        maxTime: 30,
        onStep: (w) => {
          for (const e of w.entities) {
            if (e.kind !== 'decor' || e.checked) continue;
            e.checked = true;
            const s = w.segmentAt(e.x + 1);
            const s2 = w.segmentAt(e.x + e.w - 1);
            if (!s || s !== s2 || e.y + e.h - 1 !== s.top) bad.push(`${loc.id}: ${e.sprite} @${Math.round(e.x)}`);
          }
        },
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('заїзд', () => {
  it('рівень проходиться до фінішу; результат коректний', () => {
    const loc = LOCATIONS[0];
    const { world, events } = simulate(loc, 11);
    const types = events.map((e) => e.type);
    expect(types).toContain('go');
    expect(types).toContain('jump');
    expect(types).toContain('finish');
    expect(types.at(-1)).toBe('end');
    expect(world.result.completed).toBe(true);
    expect(world.result.distanceM).toBe(loc.lengthM);
    expect(world.result.stars).toBeGreaterThanOrEqual(1);
  });

  it('без стрибків гравець врешті падає, і заїзд закінчується аварією', () => {
    const { world, events } = simulate(LOCATIONS[1], 4, { bot: false, immortal: false });
    expect(events.map((e) => e.type)).toContain('crash');
    expect(world.result.completed).toBe(false);
    expect(world.result.hearts).toBe(0);
  });

  it('падіння в яму забирає життя і повертає велосипед на землю', () => {
    const world = new World({ location: LOCATIONS[1], mode: 'level', seed: 3 });
    world.countdown = 0;
    world.update(DT);
    world.segments.length = 0;
    world.addSegment(0, 300, GROUND_Y);
    world.addSegment(400, 2000, GROUND_Y);
    world.player.x = 280;
    world.lastSafeX = 250;
    for (let i = 0; i < 240 && !world.events.some((e) => e.type === 'fall'); i++) world.update(DT);
    expect(world.events.some((e) => e.type === 'fall')).toBe(true);
    expect(world.hearts).toBe(2);
    expect(world.player.onGround).toBe(true);
    expect(world.player.x).toBeLessThan(300);
  });

  it('уступ зупиняє велосипед, а стрибок дозволяє на нього заїхати', () => {
    const world = new World({ location: LOCATIONS[0], mode: 'level', seed: 3 });
    world.countdown = 0;
    world.update(DT);
    world.segments.length = 0;
    world.entities.length = 0;
    world.addSegment(0, 300, GROUND_Y);
    world.addSegment(300, 5000, GROUND_Y - STEP_H);
    world.player.x = 200;
    for (let i = 0; i < 240; i++) world.update(DT);
    expect(world.player.x + world.player.w - PLAYER_HITBOX.r).toBeLessThanOrEqual(300.5);
    world.pressJump();
    world.jumpHeld = true;
    for (let i = 0; i < 240; i++) world.update(DT);
    expect(world.player.x).toBeGreaterThan(300);
    expect(world.player.y + PLAYER_H - PLAYER_HITBOX.b).toBeCloseTo(GROUND_Y - STEP_H, 0);
  });

  it('гальмо і розгін змінюють швидкість', () => {
    const run = (dir) => {
      const w = new World({ location: LOCATIONS[0], mode: 'level', seed: 1 });
      w.countdown = 0;
      w.dir = dir;
      for (let i = 0; i < 240; i++) w.update(DT);
      return w.player.vx;
    };
    expect(run(1)).toBeGreaterThan(run(0));
    expect(run(-1)).toBeLessThan(run(0));
    expect(run(-1)).toBeGreaterThan(0);
    expect(PHYSICS.brake).toBeLessThan(1);
  });

  it('нескінченний режим не має фінішу і швидшає', () => {
    const loc = LOCATIONS[0];
    const world = new World({ location: loc, mode: 'endless', seed: 9 });
    const far = START_X + loc.lengthM * 10 * 3;
    expect(world.targetSpeedAt(far)).toBeGreaterThan(loc.speed[1]);
    expect(world.targetSpeedAt(far)).toBeLessThanOrEqual(loc.speed[1] * 1.25);
    expect(world.entities.some((e) => e.kind === 'gate' && e.style === 'finish')).toBe(false);
  });
});
