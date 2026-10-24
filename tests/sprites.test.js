import { describe, it, expect } from 'vitest';
import { MATRIX_SPRITES } from '../src/game/spriteData.js';
import { PROCEDURAL_SPRITES } from '../src/game/proceduralSprites.js';
import { parseMatrix, spriteSize, hasSprite, bikeRows } from '../src/game/sprites.js';
import { ENTITY_TYPES } from '../src/game/entities.js';
import { LOCATIONS } from '../src/game/locations.js';
import { PLAYER_W, PLAYER_H } from '../src/game/constants.js';

describe('спрайти', () => {
  it('усі матричні спрайти мають рівні рядки і кольори для кожного символу', () => {
    for (const name of Object.keys(MATRIX_SPRITES)) {
      expect(() => parseMatrix(name), name).not.toThrow();
    }
  });

  it('палітри-варіанти посилаються лише на існуючі ключі', () => {
    for (const [name, def] of Object.entries(MATRIX_SPRITES)) {
      for (const [variant, pal] of Object.entries(def.palettes ?? {})) {
        for (const key of Object.keys(pal)) expect(def.palette[key], `${name}:${variant}.${key}`).toBeDefined();
      }
    }
  });

  it('процедурні спрайти мають додатні розміри', () => {
    for (const [name, p] of Object.entries(PROCEDURAL_SPRITES)) {
      expect(p.w, name).toBeGreaterThan(0);
      expect(p.h, name).toBeGreaterThan(0);
      expect(typeof p.draw).toBe('function');
    }
  });

  it('кожен тип об\'єкта і кожен декор локацій має спрайт', () => {
    for (const [id, T] of Object.entries(ENTITY_TYPES)) {
      for (const s of T.sprites) expect(hasSprite(s), `${id} → ${s}`).toBe(true);
      // варіанти одного типу повинні мати однаковий розмір (генератор рахує місце за першим)
      const sizes = T.sprites.map((s) => `${spriteSize(s).w}x${spriteSize(s).h}`);
      expect(new Set(sizes).size, id).toBe(1);
    }
    for (const loc of LOCATIONS) {
      for (const tr of loc.decor) for (const it of tr.items) expect(hasSprite(it.sprite), `${loc.id} → ${it.sprite}`).toBe(true);
      for (const o of [...loc.obstacles, ...loc.hazards]) expect(ENTITY_TYPES[o.type], `${loc.id} → ${o.type}`).toBeDefined();
    }
  });

  it('велосипедист має розмір гравця і зберігає ширину при нахилі', () => {
    expect(spriteSize('bike')).toMatchObject({ w: PLAYER_W, h: PLAYER_H });
    for (const lean of [-1, 0, 1]) {
      for (const frame of [0, 1]) {
        const rows = bikeRows(frame, lean);
        expect(rows).toHaveLength(PLAYER_H);
        for (const r of rows) expect(r).toHaveLength(PLAYER_W);
      }
    }
    expect(bikeRows(0, -1)[0]).toBe('....t......');
    expect(bikeRows(0, 1)[0]).toBe('......t....');
  });

  it('кадри обертання квадратних спрайтів', () => {
    expect(spriteSize('tumbleweed').frames).toBe(4);
    expect(spriteSize('snowball').frames).toBe(4);
  });
});
