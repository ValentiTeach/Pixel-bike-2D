// Внутрішня («піксельна») роздільна здатність гри — горизонтальна, вид збоку.
// Canvas завжди малюється у 320×180, а CSS масштабує його з image-rendering: pixelated.
export const VIEW_W = 320;
export const VIEW_H = 180;

// Скільки ігрових пікселів = 1 метр дистанції.
export const PX_PER_METER = 10;

// Рельєф: базова висота землі і крок «сходинки» платформи (px від верху екрана).
export const GROUND_Y = 150;
export const STEP_H = 18;
export const MAX_LEVEL = 2; // 0 — земля, 1–2 — підняті платформи

// Ширина плитки текстури землі та паралакс-шарів (мають бути безшовними по горизонталі).
export const GROUND_TILE_W = 64;
export const GROUND_TILE_H = 110;
export const LAYER_W = 640;

// Гравець: розмір спрайта (вид збоку) та позиція на екрані.
export const PLAYER_W = 26;
export const PLAYER_H = 22;
export const PLAYER_SCREEN_X = 72; // камера тримає велосипед ближче до лівого краю — видно, що попереду
export const START_X = 40;

// Хітбокс гравця (відступи від країв спрайта) — трохи менший за малюнок, щоб гра була чесною.
export const PLAYER_HITBOX = { l: 4, t: 3, r: 4, b: 1 };

// Фізика (px/с, px/с²).
export const PHYSICS = {
  gravity: 1000,
  jumpV: 320, // висота стрибка ≈ jumpV² / 2g ≈ 51 px, час у повітрі ≈ 0.64 с
  jumpCut: 230, // відпустив кнопку раніше — нижчий стрибок (мінімум ≈ 26 px навіть від короткого тапу)
  coyote: 0.09, // ще можна стрибнути трохи після зʼїзду з краю
  buffer: 0.13, // натискання стрибка трохи до приземлення запамʼятовується
  accel: 240,
  decel: 380,
  boost: 1.35, // множник швидкості при «→»
  brake: 0.4, // множник швидкості при «←»
  slipAccel: 40,
};
export const AIR_TIME = (2 * PHYSICS.jumpV) / PHYSICS.gravity;
export const JUMP_HEIGHT = (PHYSICS.jumpV * PHYSICS.jumpV) / (2 * PHYSICS.gravity);

export const MAX_HEARTS = 3;
export const INVULN_TIME = 1.6; // с невразливості після удару
export const SHIELD_TIME = 7; // с дії щита
export const SLOW_FACTOR = 0.5; // множник швидкості в калюжі/багні/піску
export const SLOW_TIME = 0.35;
export const SLIP_TIME = 1.1;
export const COUNTDOWN_TIME = 3;
export const FINISH_TIME = 2.2; // с «переможного» проїзду після фінішу
export const CRASH_TIME = 1.8; // с анімації падіння

// Максимальний крок симуляції — довгі кадри розбиваються на під-кроки (без «тунелювання»).
export const MAX_STEP = 1 / 120;
export const MAX_FRAME_DT = 0.1;
