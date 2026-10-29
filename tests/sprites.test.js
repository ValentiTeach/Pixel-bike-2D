import { describe, it, expect } from 'vitest';
import { MATRIX_SPRITES } from '../src/game/spriteData.js';
import { DECOR_SPRITES } from '../src/game/decorSprites.js';
import { parseMatrix, hasSprite, PREVIEW } from '../src/game/sprites.js';
import { drawBikeRider, previewState, BIKE_FRAMES } from '../src/game/bikeSprite.js';
import { SKINS } from '../src/game/skins.js';
import { BIKES } from '../src/game/bikes.js';
import { LOCATIONS } from '../src/game/locations.js';
import { RIDER_CANVAS } from '../src/game/constants.js';

// «Фейковий» контекст, що збирає пікселі.
function recorder(bounds) {
  const pixels = [];
  const ctx = {
    fillStyle: '',
    fillRect: (x, y, w, h) => {
      pixels.push({ x, y, w, h, c: ctx.fillStyle });
      expect(x >= 0 && y >= 0 && x + w <= bounds.w && y + h <= bounds.h).toBe(true);
    },
  };
  return { ctx, pixels };
}

describe('спрайти', () => {
  it('усі матричні спрайти мають рівні рядки і кольори для кожного символу', () => {
    for (const name of Object.keys(MATRIX_SPRITES)) {
      expect(() => parseMatrix(name), name).not.toThrow();
    }
  });

  it('процедурні спрайти мають додатні розміри', () => {
    for (const [name, p] of Object.entries(DECOR_SPRITES)) {
      expect(p.w, name).toBeGreaterThan(0);
      expect(p.h, name).toBeGreaterThan(0);
      expect(typeof p.draw).toBe('function');
    }
  });

  it('кожен декор локацій і знаки байк-парку мають спрайт', () => {
    for (const loc of LOCATIONS) {
      for (const it of loc.props) expect(hasSprite(it.sprite), `${loc.id} → ${it.sprite}`).toBe(true);
    }
    for (const s of ['signJump', 'signDrop', 'signGap', 'coin']) expect(hasSprite(s), s).toBe(true);
  });

  it('велосипедист малюється в межах полотна при будь-якому куті, позі й велосипеді', () => {
    for (const spec of BIKES) {
      for (let a = -Math.PI; a <= Math.PI; a += Math.PI / 6) {
        for (const lean of [-1, 0, 1]) {
          for (const part of ['all', 'bike', 'rider']) {
            const { ctx, pixels } = recorder(RIDER_CANVAS);
            drawBikeRider(ctx, spec, SKINS[3].palette, { a, lean, seat: lean === 0 ? 1 : 0, crouch: 0.15, crank: a, spinR: a, spinF: -a, blur: 0.7, part });
            expect(pixels.length, `${spec.id} ${a.toFixed(1)} ${lean} ${part}`).toBeGreaterThan(part === 'all' ? 250 : 60);
            for (const p of pixels) expect(p.c).toMatch(/^(#|rgb)/);
          }
        }
      }
    }
  });

  it('падіння: «регдол» райдера теж у межах полотна', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.5) {
      const { ctx, pixels } = recorder(RIDER_CANVAS);
      drawBikeRider(ctx, BIKES[0], {}, { a, part: 'rider', pose: 'crash' });
      expect(pixels.length).toBeGreaterThan(60);
    }
  });

  it('прев\'ю для гаража вміщається в усіх кадрах і скінах', () => {
    for (const spec of BIKES) {
      for (const skin of SKINS) {
        for (let f = 0; f < BIKE_FRAMES; f++) {
          const { ctx, pixels } = recorder(PREVIEW);
          drawBikeRider(ctx, spec, skin.palette, previewState(spec, f), PREVIEW.ox, PREVIEW.oy, PREVIEW);
          expect(pixels.length).toBeGreaterThan(250);
        }
      }
    }
  });
});
