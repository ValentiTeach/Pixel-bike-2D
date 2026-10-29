// Збереження прогресу в localStorage. Усі функції, що змінюють сейв, — чисті
// (повертають новий об'єкт), тож їх зручно тестувати і використовувати в React-стані.
//
// Версія 2 (MTB): велосипеди гаража, найкращий час і зірки за час на кожній трасі,
// рекорди фрірайду (дистанція й очки за трюки). Старі сейви v1 мігрують автоматично:
// монети, скіни й відкриті локації зберігаються.
import { LOCATIONS } from './locations.js';
import { SKINS } from './skins.js';
import { BIKES } from './bikes.js';

export const SAVE_KEY = 'pixel-bike-2d/save/v1';
export const SAVE_VERSION = 2;

export const DEFAULT_SETTINGS = {
  music: true,
  sfx: true,
  volume: 0.6,
  shake: true,
  touchHints: true,
};

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    totalCoins: 0,
    runs: 0,
    progress: {}, // [locationId]: { completed, stars, bestTime, bestDistance, bestEndless, bestScore }
    ownedSkins: ['classic'],
    skin: 'classic',
    ownedBikes: ['trail'],
    bike: 'trail',
    lastLocation: LOCATIONS[0].id,
    settings: { ...DEFAULT_SETTINGS },
  };
}

// Об'єднує збережені дані з дефолтними — щоб старі сейви не ламались при оновленнях гри.
export function normalizeSave(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const known = (list, ids, first) => [...new Set([first, ...(Array.isArray(list) ? list : [])])].filter((id) => ids.includes(id));
  const save = {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    settings: { ...base.settings, ...(raw.settings || {}) },
    progress: {},
    ownedSkins: known(raw.ownedSkins, SKINS.map((s) => s.id), 'classic'),
    ownedBikes: known(raw.ownedBikes, BIKES.map((b) => b.id), 'trail'),
  };
  for (const [id, p] of Object.entries(raw.progress || {})) {
    if (!LOCATIONS.some((l) => l.id === id) || !p || typeof p !== 'object') continue;
    save.progress[id] = {
      completed: Boolean(p.completed),
      // зірки v1 давались за серця — у v2 вони за час, тож старі не переносимо
      stars: (raw.version ?? 1) >= 2 ? Math.max(0, Math.min(3, Math.floor(Number(p.stars) || 0))) : 0,
      bestTime: Number(p.bestTime) > 0 ? Number(p.bestTime) : null,
      bestDistance: Math.max(0, Math.floor(Number(p.bestDistance) || 0)),
      bestEndless: Math.max(0, Math.floor(Number(p.bestEndless) || 0)),
      bestScore: Math.max(0, Math.floor(Number(p.bestScore) || 0)),
    };
  }
  if (!save.ownedSkins.includes(save.skin)) save.skin = 'classic';
  if (!save.ownedBikes.includes(save.bike)) save.bike = 'trail';
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

export const getProgress = (save, id) =>
  save.progress[id] ?? { completed: false, stars: 0, bestTime: null, bestDistance: 0, bestEndless: 0, bestScore: 0 };

export function isUnlocked(save, index) {
  if (index <= 0) return true;
  return Boolean(getProgress(save, LOCATIONS[index - 1].id).completed);
}

/**
 * Застосовує результат заїзду до сейву.
 * @returns {{ save, newBest: boolean, unlocked: string|null, starsGained: number, earned: number }}
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
    if ((result.score ?? 0) > (prev.bestScore ?? 0)) next.bestScore = result.score;
  } else {
    if (result.distanceM > prev.bestDistance) next.bestDistance = result.distanceM;
    if (result.completed) {
      if (!prev.completed) {
        const idx = LOCATIONS.findIndex((l) => l.id === result.locationId);
        unlocked = LOCATIONS[idx + 1]?.id ?? null;
      }
      next.completed = true;
      if (!prev.bestTime || result.time < prev.bestTime) {
        next.bestTime = result.time;
        newBest = true;
      }
      if (result.stars > prev.stars) {
        starsGained = result.stars - prev.stars;
        next.stars = result.stars;
      }
    }
    if ((result.score ?? 0) > (prev.bestScore ?? 0)) next.bestScore = result.score;
  }
  const earned = (result.coins ?? 0) + (result.trickCoins ?? 0);

  return {
    save: {
      ...save,
      coins: save.coins + earned,
      totalCoins: (save.totalCoins || 0) + earned,
      runs: (save.runs || 0) + 1,
      lastLocation: result.locationId,
      progress: { ...save.progress, [result.locationId]: next },
    },
    newBest,
    unlocked,
    starsGained,
    earned,
  };
}

export function buySkin(save, skinId) {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin || save.ownedSkins.includes(skinId) || save.coins < skin.price) return null;
  return { ...save, coins: save.coins - skin.price, ownedSkins: [...save.ownedSkins, skinId], skin: skinId };
}

export function buyBike(save, bikeId) {
  const bike = BIKES.find((b) => b.id === bikeId);
  if (!bike || save.ownedBikes.includes(bikeId) || save.coins < bike.price) return null;
  return { ...save, coins: save.coins - bike.price, ownedBikes: [...save.ownedBikes, bikeId], bike: bikeId };
}

export function totalStars(save) {
  return LOCATIONS.reduce((sum, l) => sum + getProgress(save, l.id).stars, 0);
}

// Час у форматі «1:23.4».
export function formatTime(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
