import { describe, it, expect } from 'vitest';
import { createRng, hashString, clamp, lerp } from '../src/game/rng.js';

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
