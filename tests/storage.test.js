import { describe, it, expect } from 'vitest';
import { defaultSave, normalizeSave, applyRunResult, isUnlocked, buySkin, loadSave, writeSave, totalStars } from '../src/game/storage.js';
import { LOCATIONS } from '../src/game/locations.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

describe('збереження', () => {
  it('нормалізує зламані/старі дані', () => {
    expect(normalizeSave(null)).toEqual(defaultSave());
    const s = normalizeSave({ coins: -5, skin: 'gold', ownedSkins: ['ocean'], settings: { music: false } });
    expect(s.coins).toBe(0);
    expect(s.skin).toBe('classic');
    expect(s.ownedSkins).toContain('classic');
    expect(s.settings.music).toBe(false);
    expect(s.settings.sfx).toBe(true);
  });

  it('load/write через сховище і стійкість до сміття', () => {
    const st = memoryStorage();
    const s = { ...defaultSave(), coins: 12 };
    writeSave(s, st);
    expect(loadSave(st).coins).toBe(12);
    st.setItem('pixel-bike-2d/save/v1', '{не json');
    expect(loadSave(st)).toEqual(defaultSave());
  });

  it('проходження відкриває наступну локацію і зберігає зірки', () => {
    let save = defaultSave();
    expect(isUnlocked(save, 0)).toBe(true);
    expect(isUnlocked(save, 1)).toBe(false);
    const res = applyRunResult(save, { locationId: 'city', mode: 'level', completed: true, distanceM: 700, coins: 30, stars: 2 });
    save = res.save;
    expect(res.unlocked).toBe(LOCATIONS[1].id);
    expect(isUnlocked(save, 1)).toBe(true);
    expect(save.coins).toBe(30);
    expect(totalStars(save)).toBe(2);
    // гірший результат не зменшує зірки
    const res2 = applyRunResult(save, { locationId: 'city', mode: 'level', completed: true, distanceM: 700, coins: 1, stars: 1 });
    expect(res2.save.progress.city.stars).toBe(2);
    expect(res2.unlocked).toBe(null);
  });

  it('рекорд нескінченного режиму', () => {
    const r = applyRunResult(defaultSave(), { locationId: 'forest', mode: 'endless', completed: false, distanceM: 1234, coins: 0, stars: 0 });
    expect(r.newBest).toBe(true);
    expect(r.save.progress.forest.bestEndless).toBe(1234);
  });

  it('купівля скіна', () => {
    const poor = defaultSave();
    expect(buySkin(poor, 'forest')).toBe(null);
    const rich = { ...defaultSave(), coins: 100 };
    const after = buySkin(rich, 'forest');
    expect(after.coins).toBe(60);
    expect(after.ownedSkins).toContain('forest');
    expect(after.skin).toBe('forest');
    expect(buySkin(after, 'forest')).toBe(null);
  });
});
