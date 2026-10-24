// Збереження прогресу в localStorage. Усі функції, що змінюють сейв, — чисті
// (повертають новий об'єкт), тож їх зручно тестувати і використовувати в React-стані.
import { LOCATIONS } from './locations.js';
import { SKINS } from './skins.js';

export const SAVE_KEY = 'pixel-bike-2d/save/v1';

export const DEFAULT_SETTINGS = {
  music: true,
  sfx: true,
  volume: 0.6,
  shake: true,
  touchHints: true,
};

export function defaultSave() {
  return {
    version: 1,
    coins: 0,
    totalCoins: 0,
    runs: 0,
    progress: {}, // [locationId]: { completed, stars, bestDistance, bestEndless }
    ownedSkins: ['classic'],
    skin: 'classic',
    lastLocation: LOCATIONS[0].id,
    settings: { ...DEFAULT_SETTINGS },
  };
}

// Об'єднує збережені дані з дефолтними — щоб старі сейви не ламались при оновленнях гри.
export function normalizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const save = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings || {}) },
    progress: { ...(raw.progress || {}) },
    ownedSkins: Array.isArray(raw.ownedSkins) ? [...new Set(['classic', ...raw.ownedSkins])] : base.ownedSkins,
  };
  if (!save.ownedSkins.includes(save.skin)) save.skin = 'classic';
  if (!LOCATIONS.some((l) => l.id === save.lastLocation)) save.lastLocation = LOCATIONS[0].id;
  save.coins = Math.max(0, Math.floor(Number(save.coins) || 0));
  return save;
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const text = storage?.getItem(SAVE_KEY);
    return normalizeSave(text ? JSON.parse(text) : null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(save, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* приватний режим / заблоковане сховище — граємо без збереження */
  }
}

export const getProgress = (save, id) => save.progress[id] ?? { completed: false, stars: 0, bestDistance: 0, bestEndless: 0 };

export function isUnlocked(save, index) {
  if (index <= 0) return true;
  return Boolean(getProgress(save, LOCATIONS[index - 1].id).completed);
}

/**
 * Застосовує результат заїзду до сейву.
 * @returns {{ save, newBest: boolean, unlocked: string|null, starsGained: number }}
 */
export function applyRunResult(save, result) {
  const prev = getProgress(save, result.locationId);
  const next = { ...prev };
  let newBest = false;
  let unlocked = null;
  let starsGained = 0;

  if (result.mode === 'endless') {
    if (result.distanceM > prev.bestEndless) {
      next.bestEndless = result.distanceM;
      newBest = true;
    }
  } else {
    if (result.distanceM > prev.bestDistance) {
      next.bestDistance = result.distanceM;
      newBest = !prev.completed;
    }
    if (result.completed) {
      if (!prev.completed) {
        const idx = LOCATIONS.findIndex((l) => l.id === result.locationId);
        unlocked = LOCATIONS[idx + 1]?.id ?? null;
      }
      next.completed = true;
      if (result.stars > prev.stars) {
        starsGained = result.stars - prev.stars;
        next.stars = result.stars;
        newBest = true;
      }
    }
  }

  return {
    save: {
      ...save,
      coins: save.coins + result.coins,
      totalCoins: (save.totalCoins || 0) + result.coins,
      runs: (save.runs || 0) + 1,
      lastLocation: result.locationId,
      progress: { ...save.progress, [result.locationId]: next },
    },
    newBest,
    unlocked,
    starsGained,
  };
}

export function buySkin(save, skinId) {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin || save.ownedSkins.includes(skinId) || save.coins < skin.price) return null;
  return { ...save, coins: save.coins - skin.price, ownedSkins: [...save.ownedSkins, skinId], skin: skinId };
}

export function totalStars(save) {
  return LOCATIONS.reduce((sum, l) => sum + getProgress(save, l.id).stars, 0);
}
