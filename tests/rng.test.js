import { describe, it, expect } from 'vitest';
import { createRng, hashString, clamp, lerp } from '../src/game/rng.js';
import { overlaps, hitboxOf } from '../src/game/collision.js';

describe('rng', () => {
  it('детермінований для однакового seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('значення в межах', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 5);
      expect([3, 4, 5]).toContain(n);
    }
  });

  it('weighted враховує вагу', () => {
    const r = createRng(1);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 5000; i++) counts[r.weighted([{ id: 'a', weight: 9 }, { id: 'b', weight: 1 }]).id]++;
    expect(counts.a / counts.b).toBeGreaterThan(6);
  });

  it('хелпери', () => {
    expect(hashString('city')).toBe(hashString('city'));
    expect(clamp(5, 0, 3)).toBe(3);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe('зіткнення', () => {
  it('AABB', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
  });

  it('хітбокс з відступами і віддзеркаленням', () => {
    const e = { x: 10, y: 20, w: 14, h: 10, hitbox: [1, 2, 3, 4], flip: false };
    expect(hitboxOf(e)).toEqual({ x: 11, y: 22, w: 10, h: 4 });
    expect(hitboxOf({ ...e, flip: true })).toEqual({ x: 13, y: 22, w: 10, h: 4 });
  });
});
