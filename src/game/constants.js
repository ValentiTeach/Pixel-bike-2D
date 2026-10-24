// Внутрішня («піксельна») роздільна здатність гри. Canvas завжди малюється
// у 180×320, а CSS масштабує його до розміру екрана з image-rendering: pixelated.
export const VIEW_W = 180;
export const VIEW_H = 320;

// Скільки ігрових пікселів прокрутки = 1 метр дистанції.
export const PX_PER_METER = 10;

// Висота плитки фону. Має ділитися на період розмітки (32 px), щоб плитка була безшовною.
export const TILE_H = 320;

// Гравець: розмір спрайта та позиція по вертикалі (вона не змінюється — рух лише по горизонталі).
export const PLAYER_W = 11;
export const PLAYER_H = 24;
export const PLAYER_Y = VIEW_H - 70;

// Фізика керування по горизонталі (px/с, px/с²).
export const PLAYER_PHYSICS = {
  maxSpeed: 120,
  accel: 950,
  friction: 1200,
  // на льоду/олії — інерція і «занос»
  slipAccel: 240,
  slipFriction: 70,
};

// Хітбокс гравця (відступи від країв спрайта) — трохи менший за малюнок, щоб гра була чесною.
export const PLAYER_HITBOX = { l: 2, t: 4, r: 2, b: 3 };

export const MAX_HEARTS = 3;
export const INVULN_TIME = 1.6; // с невразливості після удару
export const SHIELD_TIME = 7; // с дії щита
export const SLOW_FACTOR = 0.55; // множник швидкості в калюжі/багні
export const SLOW_TIME = 0.45;
export const SLIP_TIME = 1.3;
export const COUNTDOWN_TIME = 3;
export const FINISH_TIME = 2.2; // с «переможного» проїзду після фінішу
export const CRASH_TIME = 1.8; // с анімації падіння

// Рядки перешкод з'являються трохи вище за екран.
export const SPAWN_Y = -36;

// Максимальний крок симуляції — довгі кадри розбиваються на під-кроки (без «тунелювання»).
export const MAX_STEP = 1 / 120;
export const MAX_FRAME_DT = 0.1;
