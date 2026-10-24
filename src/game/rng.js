// Детермінований генератор випадкових чисел (mulberry32).
// Однаковий seed → однаковий заїзд; це зручно для тестів і відтворення багів.
export function createRng(seed = 1) {
  let s = seed >>> 0 || 1;

  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // items: [{ weight, ... }] → один елемент з урахуванням ваги
    weighted: (items) => {
      let total = 0;
      for (const it of items) total += it.weight ?? 1;
      let r = next() * total;
      for (const it of items) {
        r -= it.weight ?? 1;
        if (r < 0) return it;
      }
      return items[items.length - 1];
    },
  };
  return rng;
}

// Простий хеш рядка → seed (для стабільних процедурних спрайтів).
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const smoothstep = (t) => t * t * (3 - 2 * t);
