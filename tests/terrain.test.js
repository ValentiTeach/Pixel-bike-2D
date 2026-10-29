import { describe, it, expect } from 'vitest';
import { Track, MAT } from '../src/game/terrain.js';
import { DX } from '../src/game/constants.js';

function build(fn, from = 0, to = 2000) {
  const t = new Track();
  t.x0 = from;
  for (let x = from; x <= to; x += DX) t.push(fn(x), MAT.dirt);
  return t;
}

describe('рельєф', () => {
  it('висота й ухил з інтерполяцією між семплами', () => {
    const t = build((x) => 100 + x * 0.5);
    expect(t.heightAt(11)).toBeCloseTo(105.5, 6);
    expect(t.slopeAt(500)).toBeCloseTo(Math.atan(0.5), 6);
    expect(t.heightAt(-50)).toBe(100); // за межами — край траси
  });

  it('контакт кола: глибина і нормаль від землі', () => {
    const t = build(() => 100);
    expect(t.query(500, 90, 6)).toBeNull();
    const q = t.query(500, 96, 6);
    expect(q.depth).toBeCloseTo(2, 6);
    expect(q.nx).toBeCloseTo(0, 6);
    expect(q.ny).toBeCloseTo(-1, 6);
    // центр під землею — все одно виштовхує вгору
    const deep = t.query(500, 104, 6);
    expect(deep.depth).toBeGreaterThan(6);
    expect(deep.ny).toBeLessThan(-0.9);
  });

  it('стінка уступу дає горизонтальну нормаль (удар збоку)', () => {
    const t = build((x) => (x < 1000 ? 100 : 80));
    const q = t.query(996, 92, 6);
    expect(q).not.toBeNull();
    expect(q.nx).toBeLessThan(-0.9);
  });

  it('prune прибирає старі семпли, не ламаючи координат', () => {
    const t = build((x) => x * 0.1, 0, 40000);
    const h = t.heightAt(30000);
    t.prune(20000);
    expect(t.x0).toBeGreaterThan(0);
    expect(t.heightAt(30000)).toBeCloseTo(h, 6);
  });
});
