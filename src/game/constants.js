// Внутрішня («піксельна») роздільна здатність гри — горизонтальна, вид збоку.
// Canvas завжди малюється у 320×180, а CSS масштабує його з image-rendering: pixelated.
export const VIEW_W = 320;
export const VIEW_H = 180;

// Масштаб світу: 16 ігрових пікселів = 1 метр. Уся фізика рахується в справжніх одиницях
// (кг, Н, Вт, м/с²) і лише переводиться в пікселі — тож велосипед поводиться «як у житті»:
// колесо 29″ ≈ 12 px, база ≈ 20 px, райдер ≈ 28 px заввишки.
export const PX_PER_M = 16;
export const PX_PER_METER = PX_PER_M;
export const GRAVITY = 9.81 * PX_PER_M; // px/с²

// Рельєф — висотне поле з кроком DX px (2 px = 12,5 см: видно корені й каміння).
export const DX = 2;

// Ширина плитки текстури землі та паралакс-шарів (мають бути безшовними по горизонталі).
export const GROUND_TILE_W = 128;
export const GROUND_TILE_H = 96;
export const LAYER_W = 640;
// Паралакс-шари малюються вищими за екран — щоб зсуватися вгору-вниз, коли траса йде схилом.
export const LAYER_PAD = 48;

// Камера: де на екрані тримати велосипед (ліворуч — щоб було видно трасу попереду).
export const CAM_X = 104;
export const CAM_Y = 92;

// Полотно для малювання велосипедиста: квадрат з центром мас посередині — влазить при будь-якому куті.
export const RIDER_CANVAS = { w: 64, h: 64, ox: 32, oy: 34 };

// Таймінги заїзду.
export const COUNTDOWN_TIME = 3;
export const FINISH_TIME = 2.6; // с «переможного» накату після фінішу
export const CRASH_TIME = 1.7; // с від падіння до відродження на чекпоінті
export const RESPAWN_FREEZE = 0.45; // с «завмирання» після відродження — щоб роздивитися трасу

// Максимальний крок симуляції — довгі кадри розбиваються на під-кроки (стабільна підвіска й контакти).
export const MAX_STEP = 1 / 240;
export const MAX_FRAME_DT = 0.1;

// Перевід км/год ↔ px/с.
export const kmh = (pxPerSec) => (pxPerSec / PX_PER_M) * 3.6;
export const fromKmh = (v) => (v / 3.6) * PX_PER_M;
