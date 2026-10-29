import { describe, it, expect } from 'vitest';
import {
  defaultSave, normalizeSave, applyRunResult, isUnlocked, buySkin, buyBike, loadSave, writeSave, totalStars, formatTime, SAVE_KEY,
} from '../src/game/storage.js';
import { LOCATIONS } from '../src/game/locations.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

const levelResult = (patch = {}) => ({
  locationId: 'forest', mode: 'level', completed: true, distanceM: 900, coins: 30, trickCoins: 4, stars: 2, time: 120.5, score: 1000, ...patch,
});

describe('збереження', () => {
  it('нормалізує зламані дані', () => {
    expect(normalizeSave(null)).toEqual(defaultSave());
    const s = normalizeSave({ coins: -5, skin: 'gold', ownedSkins: ['ocean'], bike: 'downhill', ownedBikes: ['nope'], settings: { music: false } });
    expect(s.coins).toBe(0);
    expect(s.skin).toBe('classic');
    expect(s.ownedSkins).toEqual(['classic', 'ocean']);
    expect(s.bike).toBe('trail');
    expect(s.ownedBikes).toEqual(['trail']);
    expect(s.settings.music).toBe(false);
    expect(s.settings.sfx).toBe(true);
  });

  it('мігрує сейв v1: монети, скіни й відкриті траси лишаються, старі «зірки за серця» — ні', () => {
    const v1 = { version: 1, coins: 77, ownedSkins: ['classic', 'ninja'], skin: 'ninja', progress: { forest: { completed: true, stars: 3, bestDistance: 900 }, city: { completed: false, stars: 0 } } };
    const s = normalizeSave(v1);
    expect(s.version).toBe(2);
    expect(s.coins).toBe(77);
    expect(s.skin).toBe('ninja');
    expect(s.bike).toBe('trail');
    expect(s.progress.forest.completed).toBe(true);
    expect(s.progress.forest.stars).toBe(0);
    expect(s.progress.forest.bestTime).toBe(null);
    expect(isUnlocked(s, 1)).toBe(true);
  });

  it('load/write через сховище і стійкість до сміття', () => {
    const st = memoryStorage();
    writeSave({ ...defaultSave(), coins: 12 }, st);
    expect(loadSave(st).coins).toBe(12);
    st.setItem(SAVE_KEY, '{не json');
    expect(loadSave(st)).toEqual(defaultSave());
  });

  it('проходження відкриває наступну трасу, зберігає зірки й найкращий час, нараховує монети за трюки', () => {
    let save = defaultSave();
    expect(isUnlocked(save, 1)).toBe(false);
    const res = applyRunResult(save, levelResult());
    save = res.save;
    expect(res.unlocked).toBe(LOCATIONS[1].id);
    expect(res.newBest).toBe(true);
    expect(res.earned).toBe(34);
    expect(save.coins).toBe(34);
    expect(save.progress.forest.bestTime).toBe(120.5);
    expect(totalStars(save)).toBe(2);
    // повільніший заїзд не псує рекорд і зірки
    const res2 = applyRunResult(save, levelResult({ time: 150, stars: 1 }));
    expect(res2.save.progress.forest.stars).toBe(2);
    expect(res2.save.progress.forest.bestTime).toBe(120.5);
    expect(res2.newBest).toBe(false);
    expect(res2.unlocked).toBe(null);
    // швидший — новий рекорд
    const res3 = applyRunResult(res2.save, levelResult({ time: 101, stars: 3 }));
    expect(res3.newBest).toBe(true);
    expect(res3.save.progress.forest.stars).toBe(3);
  });

  it('незавершений заїзд не відкриває трасу', () => {
    const r = applyRunResult(defaultSave(), levelResult({ completed: false, stars: 0, distanceM: 400 }));
    expect(r.unlocked).toBe(null);
    expect(r.save.progress.forest.completed).toBe(false);
    expect(r.save.progress.forest.bestDistance).toBe(400);
  });

  it('рекорд фрірайду', () => {
    const r = applyRunResult(defaultSave(), { locationId: 'city', mode: 'endless', completed: false, distanceM: 1234, coins: 3, trickCoins: 0, score: 500 });
    expect(r.newBest).toBe(true);
    expect(r.save.progress.city.bestEndless).toBe(1234);
    expect(r.save.progress.city.bestScore).toBe(500);
  });

  it('купівля скіна і велосипеда', () => {
    expect(buySkin(defaultSave(), 'forest')).toBe(null);
    const rich = { ...defaultSave(), coins: 500 };
    const a = buySkin(rich, 'forest');
    expect(a.coins).toBe(460);
    expect(a.skin).toBe('forest');
    expect(buySkin(a, 'forest')).toBe(null);
    const b = buyBike(rich, 'enduro');
    expect(b.coins).toBe(50);
    expect(b.bike).toBe('enduro');
    expect(b.ownedBikes).toContain('enduro');
    expect(buyBike(b, 'enduro')).toBe(null);
    expect(buyBike(rich, 'downhill')).toBe(null);
  });

  it('формат часу', () => {
    expect(formatTime(65.34)).toBe('1:05.3');
    expect(formatTime(9)).toBe('0:09.0');
    expect(formatTime(null)).toBe('—');
  });
});
