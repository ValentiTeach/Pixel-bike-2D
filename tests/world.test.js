import { describe, it, expect } from 'vitest';
import { World } from '../src/game/world.js';
import { botInput } from '../src/game/bot.js';
import { LOCATIONS } from '../src/game/locations.js';
import { Track, MAT, GAP_DEPTH } from '../src/game/terrain.js';
import { trajY } from '../src/game/levelGen.js';
import { spriteSize } from '../src/game/sprites.js';
import { PX_PER_M as M, DX, CRASH_TIME } from '../src/game/constants.js';

const DT = 1 / 240;

function level(loc, bikeId = 'trail') {
  const w = new World({ location: loc, mode: 'level', seed: loc.seed, bikeId });
  w.countdown = 0;
  return w;
}

// Прокатати трасу ботом. Повертає світ і всі події.
function botRun(w, maxTime = 600) {
  const events = [];
  let t = 0;
  while (w.phase !== 'over' && t < maxTime) {
    if (w.phase === 'ride') w.setInput(botInput(w));
    w.update(DT);
    events.push(...w.events);
    w.events.length = 0;
    t += DT;
  }
  return events;
}

describe('генератор трас', () => {
  for (const loc of LOCATIONS) {
    it(`${loc.id}: рельєф цілий, є старт, чекпоінти й фініш`, () => {
      const w = level(loc);
      const t = w.track;
      expect(t.ys.every(Number.isFinite)).toBe(true);
      expect(t.x0).toBeLessThan(w.startX);
      expect(t.x1).toBeGreaterThan(w.finishX + 100 * M);
      // траса загалом спускається
      expect(t.heightAt(w.finishX) - t.heightAt(w.startX)).toBeGreaterThan(loc.lengthM * 0.03 * M);
      expect(w.checkpoints.length).toBeGreaterThanOrEqual(3);
      expect(w.entities.some((e) => e.kind === 'gate' && e.style === 'finish' && e.x === w.finishX)).toBe(true);
      // чекпоінти — на пологих ділянках (тут відроджуєшся з місця)
      for (const c of w.checkpoints) expect(Math.abs(t.slopeAt(c.x, 3 * M))).toBeLessThan(0.15);
      // стартовий поміст — дерев'яний
      expect(t.matAt(w.startX)).toBe(MAT.wood);
    });

    it(`${loc.id}: фічі чесні — геп перелітається з розгону від чекпоінта, приземлення довгі`, () => {
      const w = level(loc);
      const t = w.track;
      for (const f of w.gen.journal) {
        if (f.kind === 'gap') {
          // потрібна швидкість менша за досяжну педалями; на ній перелітаємо «колінце»
          expect(f.vReq, `${loc.id} gap@${Math.round(f.lipX / M)}`).toBeLessThanOrEqual(f.vReachLip * 0.92 + 1e-6);
          expect(trajY(f.gapW + 0.8, f.vReq, f.ang)).toBeLessThan(f.knuckle);
          // за гепом справді провалля
          expect(t.heightAt(f.lipX + (f.gapW / 2) * M)).toBeGreaterThan(t.heightAt(f.lipX) + GAP_DEPTH * 0.9);
        }
        if (f.kind === 'drop') expect(f.H).toBeLessThan(1.9);
        if (f.kind === 'table') expect(f.deck).toBeGreaterThan(1);
      }
    });

    it(`${loc.id}: декор стоїть на землі, монети — над землею`, () => {
      const w = level(loc);
      const t = w.track;
      for (const e of w.entities) {
        if (e.kind !== 'decor') continue;
        const { w: sw, h } = spriteSize(e.sprite);
        let lowest = -Infinity;
        for (let x = e.x; x <= e.x + sw; x += DX) lowest = Math.max(lowest, t.floorAt(x));
        expect(e.y + h - lowest, `${loc.id}: ${e.sprite}@${Math.round(e.x)}`).toBeGreaterThanOrEqual(0);
        expect(e.y + h - lowest, `${loc.id}: ${e.sprite}@${Math.round(e.x)}`).toBeLessThanOrEqual(4);
      }
      for (const c of w.coins) {
        if (t.isGap(c.x)) continue;
        expect(c.y, `${loc.id}: монета @${Math.round(c.x / M)} м`).toBeLessThan(t.heightAt(c.x) - 0.5 * M);
      }
    });
  }

  it('траса рівня однакова щоразу (фіксований сід), фрірайд — різний', () => {
    const loc = LOCATIONS[2];
    const a = level(loc).track;
    const b = level(loc).track;
    expect(a.ys.length).toBe(b.ys.length);
    expect(a.ys.slice(0, 3000)).toEqual(b.ys.slice(0, 3000));
    const e1 = new World({ location: loc, mode: 'endless', seed: 1 }).track;
    const e2 = new World({ location: loc, mode: 'endless', seed: 2 }).track;
    expect(e1.ys.slice(600, 1500)).not.toEqual(e2.ys.slice(600, 1500));
  });
});

describe('заїзд', () => {
  it('бот проходить кожну трасу без падінь, а його час — між «золотом» і «сріблом»', () => {
    for (const loc of LOCATIONS) {
      const w = level(loc);
      const events = botRun(w);
      const r = w.result;
      expect(r?.completed, loc.id).toBe(true);
      expect(r.crashes, loc.id).toBe(0);
      expect(r.time, `${loc.id}: ${r.time} с`).toBeGreaterThan(loc.times.gold);
      expect(r.time, `${loc.id}: ${r.time} с`).toBeLessThan(loc.times.silver);
      expect(r.stars).toBe(2);
      expect(r.distanceM).toBe(loc.lengthM);
      const types = events.map((e) => e.type);
      expect(types).toContain('checkpoint');
      expect(types).toContain('finish');
      expect(types.at(-1)).toBe('end');
      expect(r.coins).toBeGreaterThan(20);
    }
  }, 120000);

  it('на важкій трасі проходять і інші велосипеди', () => {
    for (const bikeId of ['hardtail', 'downhill', 'ebike']) {
      const w = level(LOCATIONS[4], bikeId);
      botRun(w);
      expect(w.result?.completed, bikeId).toBe(true);
      expect(w.result.crashes, bikeId).toBeLessThanOrEqual(1);
    }
  }, 120000);

  it('падіння: райдер злітає, через CRASH_TIME — відродження на чекпоінті, час іде', () => {
    const w = level(LOCATIONS[0]);
    for (let i = 0; i < 240; i++) w.update(DT);
    const cp = w.checkpoints[0];
    w.lastCheckpoint = cp.x;
    // перевертаємо байк догори колесами — голова в землю
    w.bike.a = Math.PI;
    w.bike.y -= 2 * M;
    const time0 = w.rideTime;
    let crashed = false;
    for (let i = 0; i < 240 && !crashed; i++) {
      w.update(DT);
      crashed = w.events.some((e) => e.type === 'crash');
    }
    expect(crashed).toBe(true);
    expect(w.phase).toBe('crash');
    expect(w.rider).not.toBeNull();
    expect(w.crashes).toBe(1);
    for (let i = 0; i < (CRASH_TIME + 0.1) * 240; i++) w.update(DT);
    expect(w.phase).toBe('ride');
    expect(w.rider).toBeNull();
    expect(Math.abs(w.bike.x - cp.x)).toBeLessThan(2);
    expect(w.bike.grounded).toBe(true);
    expect(w.rideTime).toBeGreaterThan(time0 + CRASH_TIME);
  });

  it('R — повернення на чекпоінт рахується як падіння', () => {
    const w = level(LOCATIONS[0]);
    for (let i = 0; i < 480; i++) w.update(DT);
    w.requestRespawn();
    expect(w.crashes).toBe(1);
    expect(w.bike.x).toBeCloseTo(w.startX, 0);
  });

  it('фрірайд: без фінішу, траса дебудовується, падіння завершує заїзд', () => {
    const loc = LOCATIONS[1];
    const w = new World({ location: loc, mode: 'endless', seed: 7 });
    w.countdown = 0;
    w.update(DT);
    expect(w.entities.some((e) => e.kind === 'gate' && e.style === 'finish')).toBe(false);
    for (let i = 0; i < 240 * 40 && w.phase === 'ride'; i++) {
      w.setInput(botInput(w));
      w.update(DT);
      w.events.length = 0;
    }
    expect(w.track.x1).toBeGreaterThan(w.bike.x + 200);
    w.bike.a = Math.PI;
    w.bike.y -= 2 * M;
    for (let i = 0; i < (CRASH_TIME + 1) * 240 && w.phase !== 'over'; i++) w.update(DT);
    expect(w.phase).toBe('over');
    expect(w.result.completed).toBe(false);
    expect(w.result.distanceM).toBeGreaterThan(50);
  });

  it('трюки: вілі на рівному дає очки', () => {
    const w = level(LOCATIONS[0]);
    w.update(DT);
    const t = new Track();
    t.x0 = -400;
    for (let x = -400; x < 400 * M; x += DX) t.push(0, MAT.dirt);
    w.track = t;
    w.checkpoints = [];
    w.bike.place(t, 0);
    for (let i = 0; i < 240 * 8; i++) {
      const b = w.bike;
      const v = b.speed / M;
      // тримаємо баланс на задньому колесі під кутом ~30°
      const hold = i > 240 * 2 && i < 240 * 6;
      const lean = hold ? Math.max(-1, Math.min(1, -((b.a + 0.45) * 4 + b.w * 0.8))) : 0;
      w.setInput({ pedal: v < 3.5 ? 1 : 0, brake: 0, lean });
      w.update(DT);
    }
    expect(w.crashes).toBe(0);
    const trick = w.tricks.find((tr) => tr.name.startsWith('Вілі'));
    expect(trick, JSON.stringify(w.tricks)).toBeTruthy();
    expect(w.score).toBeGreaterThan(0);
  });

  it('трюки: сальто рахуються за кутом обертання в повітрі', () => {
    const w = level(LOCATIONS[0]);
    w.awardAir({ t: 1.1, rot: -Math.PI * 2 + 0.5 }, false);
    expect(w.tricks.at(-1).name).toContain('Бекфліп');
    w.awardAir({ t: 1.6, rot: Math.PI * 4 - 0.3 }, true);
    expect(w.tricks.at(-1).name).toContain('Фронтфліп ×2');
    expect(w.tricks.at(-1).name).toContain('чисто');
    expect(w.tricks.at(-1).points).toBeGreaterThan(1200 * 4);
    w.awardAir({ t: 0.5, rot: 0.3 }, false); // маленький стрибок — без трюку
    expect(w.tricks.length).toBe(2);
    expect(w.score).toBe(w.tricks.reduce((a, tr) => a + tr.points, 0));
  });
});
