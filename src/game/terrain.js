// Рельєф траси: висотне поле з кроком DX px + матеріал поверхні в кожній точці.
//
// y зростає вниз (як на екрані), траса загалом спускається — тож y росте разом з x.
// Окрім «їздової» поверхні кожна точка може мати візуальну «підлогу» floor: справжню землю під
// дерев'яним містком/кікером або дно провалля (воду) під гепом. Фізика бачить лише поверхню:
// у гепі вона опускається глибоко вниз, тож стінки провалля — це справжні стіни, об які можна вдаритись.
import { DX } from './constants.js';

// Матеріали: зчеплення шини (μ), опір коченню (Crr), чи летить пил, і як малювати.
export const MAT = {
  dirt: 0,
  grass: 1,
  rock: 2,
  wood: 3,
  sand: 4,
  snow: 5,
  ice: 6,
  mud: 7,
  concrete: 8,
  gap: 9,
  water: 10,
  roots: 11,
  log: 12,
  gravel: 13,
};

export const MATERIALS = [
  { id: 'dirt', name: 'ґрунт', grip: 0.88, roll: 0.014, dust: true },
  { id: 'grass', name: 'трава', grip: 0.72, roll: 0.02, dust: false },
  { id: 'rock', name: 'камінь', grip: 0.95, roll: 0.012, dust: false },
  { id: 'wood', name: 'дерево', grip: 0.78, roll: 0.01, dust: false, wetGrip: 0.55 },
  { id: 'sand', name: 'пісок', grip: 0.55, roll: 0.07, dust: true },
  { id: 'snow', name: 'сніг', grip: 0.42, roll: 0.035, dust: true },
  { id: 'ice', name: 'лід', grip: 0.1, roll: 0.008, dust: false },
  { id: 'mud', name: 'багно', grip: 0.45, roll: 0.06, dust: false, splash: true },
  { id: 'concrete', name: 'бетон', grip: 1.0, roll: 0.008, dust: false },
  { id: 'gap', name: 'провалля', grip: 0.6, roll: 0.02, dust: false },
  { id: 'water', name: 'брід', grip: 0.5, roll: 0.09, dust: false, splash: true },
  { id: 'roots', name: 'корені', grip: 0.62, roll: 0.018, dust: true },
  { id: 'log', name: 'колода', grip: 0.7, roll: 0.012, dust: false, wetGrip: 0.5 },
  { id: 'gravel', name: 'гравій', grip: 0.62, roll: 0.022, dust: true },
];

// Наскільки глибоко «провалюється» поверхня в гепі (px). Нижче цього — падіння.
export const GAP_DEPTH = 640;

export class Track {
  constructor() {
    this.x0 = 0; // світова x першого семпла
    this.ys = [];
    this.mats = [];
    this.floors = []; // NaN — підлога збігається з поверхнею
    this.floorMats = []; // матеріал «підлоги»: ґрунт під містком, вода чи каміння на дні гепу
  }

  get length() {
    return this.ys.length;
  }

  get x1() {
    return this.x0 + (this.ys.length - 1) * DX;
  }

  push(y, mat, floor = NaN, floorMat = MAT.dirt) {
    this.ys.push(y);
    this.mats.push(mat);
    this.floors.push(floor);
    this.floorMats.push(floorMat);
  }

  index(x) {
    return (x - this.x0) / DX;
  }

  // Висота поверхні в точці x (лінійна інтерполяція між семплами).
  heightAt(x) {
    const f = this.index(x);
    const n = this.ys.length;
    if (n === 0) return 0;
    if (f <= 0) return this.ys[0];
    if (f >= n - 1) return this.ys[n - 1];
    const i = Math.floor(f);
    const t = f - i;
    return this.ys[i] + (this.ys[i + 1] - this.ys[i]) * t;
  }

  // Кут нахилу поверхні (рад, «+» — спуск праворуч) з усередненням по базі `span` px.
  slopeAt(x, span = 8) {
    return Math.atan2(this.heightAt(x + span / 2) - this.heightAt(x - span / 2), span);
  }

  matAt(x) {
    const i = Math.round(this.index(x));
    return this.mats[Math.max(0, Math.min(this.mats.length - 1, i))] ?? MAT.dirt;
  }

  floorAt(x) {
    const i = Math.round(this.index(x));
    const f = this.floors[Math.max(0, Math.min(this.floors.length - 1, i))];
    return Number.isNaN(f) || f === undefined ? this.heightAt(x) : f;
  }

  isGap(x) {
    return this.matAt(x) === MAT.gap;
  }

  /**
   * Контакт кола (колесо, голова райдера…) з поверхнею.
   * @returns {{depth, nx, ny, x, y, mat}|null} depth > 0 — коло заглибилось; n — нормаль від землі до центру.
   */
  query(px, py, r) {
    const n = this.ys.length;
    if (n < 2) return null;
    const i0 = Math.max(0, Math.floor(this.index(px - r)) - 1);
    const i1 = Math.min(n - 2, Math.ceil(this.index(px + r)) + 1);
    if (i0 > i1) return null;
    let best = Infinity;
    let bx = 0;
    let by = 0;
    let bi = i0;
    for (let i = i0; i <= i1; i++) {
      const ax = this.x0 + i * DX;
      const ay = this.ys[i];
      const dx = DX;
      const dy = this.ys[i + 1] - ay;
      let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + dx * t;
      const qy = ay + dy * t;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        bx = qx;
        by = qy;
        bi = i;
      }
    }
    const d = Math.sqrt(best);
    const inside = py > this.heightAt(px);
    let nx;
    let ny;
    let depth;
    if (inside || d < 1e-6) {
      // центр під поверхнею — виштовхуємо по нормалі найближчого відрізка
      const dy = this.ys[bi + 1] - this.ys[bi];
      const len = Math.hypot(DX, dy);
      nx = dy / len;
      ny = -DX / len;
      depth = r + d;
    } else {
      depth = r - d;
      if (depth <= 0) return null;
      nx = (px - bx) / d;
      ny = (py - by) / d;
    }
    return { depth, nx, ny, x: bx, y: by, mat: this.mats[bi + (bx - (this.x0 + bi * DX) > DX / 2 ? 1 : 0)] };
  }

  // Прибирає семпли лівіше xMin (для нескінченного режиму), шматками — щоб не зсувати масив щокадру.
  prune(xMin) {
    const k = Math.floor(this.index(xMin));
    if (k < 4096) return;
    this.ys.splice(0, k);
    this.mats.splice(0, k);
    this.floors.splice(0, k);
    this.floorMats.splice(0, k);
    this.x0 += k * DX;
  }
}
