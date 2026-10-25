// Типи ігрових об'єктів для виду збоку: перешкоди, небезпечні смуги та бонуси.
// hitbox — відступи [зліва, згори, справа, знизу] від країв спрайта.
// behavior:
//   static — стоїть на землі, треба перестрибнути
//   walk   — іде/біжить назустріч по землі (пішохід, олень, кіт, краб)
//   roll   — котиться назустріч, підстрибуючи (перекотиполе, сніжка, м'яч)
//   fly    — летить назустріч на висоті стрибка: під птахом треба проїхати, не стрибаючи

export const ENTITY_TYPES = {
  // ---------- Статичні перешкоди ----------
  cone: { kind: 'obstacle', sprites: ['cone'], hitbox: [1, 2, 1, 0], debris: ['#ff7a1a', '#ffffff'] },
  car: {
    kind: 'obstacle',
    sprites: ['car_red', 'car_blue', 'car_white', 'car_taxi', 'car_green'],
    hitbox: [1, 2, 1, 1],
    debris: ['#9fd4ff', '#e0483f', '#15141c'],
  },
  carNight: {
    kind: 'obstacle',
    sprites: ['car_night_purple', 'car_night_teal', 'car_night_dark'],
    hitbox: [1, 2, 1, 1],
    light: { r: 26, color: '255, 240, 190', dx: 0, dy: 8 },
    debris: ['#b89aff', '#4cf0ff', '#15141c'],
  },
  barrier: { kind: 'obstacle', sprites: ['barrier'], hitbox: [0, 1, 0, 0], debris: ['#e8383d', '#ffffff'] },
  hydrant: { kind: 'obstacle', sprites: ['hydrant'], hitbox: [0, 0, 0, 0], debris: ['#e8383d', '#7a1c1c'] },
  rock: { kind: 'obstacle', sprites: ['rock'], hitbox: [1, 2, 1, 0], debris: ['#8b879c', '#625e74'] },
  rockSand: { kind: 'obstacle', sprites: ['rock:sand'], hitbox: [1, 2, 1, 0], debris: ['#b8834d', '#8a5c33'] },
  rockSnow: { kind: 'obstacle', sprites: ['rock:snow'], hitbox: [1, 2, 1, 0], debris: ['#a9b8cf', '#ffffff'] },
  stump: { kind: 'obstacle', sprites: ['stump'], hitbox: [1, 1, 1, 0], debris: ['#d9a066', '#6b4226'] },
  log: { kind: 'obstacle', sprites: ['log'], hitbox: [1, 1, 1, 0], debris: ['#7a4a26', '#d9a066'] },
  logSnow: { kind: 'obstacle', sprites: ['logSnow'], hitbox: [1, 1, 1, 0], debris: ['#7a4a26', '#ffffff'] },
  cactus: { kind: 'obstacle', sprites: ['cactus'], hitbox: [2, 1, 2, 2], debris: ['#3e9b3a', '#7ed957'] },
  bones: { kind: 'obstacle', sprites: ['bones'], hitbox: [1, 1, 1, 0], debris: ['#f6efdc'] },
  snowman: { kind: 'obstacle', sprites: ['snowman'], hitbox: [2, 2, 2, 1], debris: ['#f4f8ff', '#ff8a1c'] },
  iceblock: { kind: 'obstacle', sprites: ['iceblock'], hitbox: [1, 1, 1, 0], debris: ['#bfe9ff', '#ffffff'] },
  sandcastle: { kind: 'obstacle', sprites: ['sandcastle'], hitbox: [1, 2, 1, 0], debris: ['#f0d28c', '#c9a55e'] },
  umbrella: {
    kind: 'obstacle',
    sprites: ['umbrella_red', 'umbrella_blue', 'umbrella_green'],
    hitbox: [2, 0, 2, 0],
    debris: ['#ffffff', '#e8383d'],
  },
  bucket: { kind: 'obstacle', sprites: ['bucket'], hitbox: [1, 1, 1, 0], debris: ['#3fa9f5'] },

  // ---------- Рухомі перешкоди ----------
  pedestrian: {
    kind: 'obstacle',
    sprites: ['pedestrian', 'pedestrian:red', 'pedestrian:green'],
    hitbox: [1, 1, 1, 0],
    behavior: 'walk',
    speed: [18, 30],
    fps: 6,
    debris: ['#3f7fe0', '#e8b48a'],
  },
  deer: {
    kind: 'obstacle',
    sprites: ['deer'],
    hitbox: [2, 4, 2, 0],
    behavior: 'walk',
    speed: [40, 60],
    fps: 8,
    facesRight: true,
    debris: ['#a8683a', '#f1dcc0'],
  },
  cat: {
    kind: 'obstacle',
    sprites: ['cat'],
    hitbox: [1, 1, 0, 0],
    behavior: 'walk',
    speed: [35, 55],
    fps: 10,
    facesRight: true,
    debris: ['#77728f', '#ffe14d'],
  },
  crab: {
    kind: 'obstacle',
    sprites: ['crab'],
    hitbox: [1, 1, 1, 0],
    behavior: 'walk',
    speed: [20, 34],
    fps: 6,
    debris: ['#e8483c', '#ff7a5c'],
  },
  tumbleweed: {
    kind: 'obstacle',
    sprites: ['tumbleweed'],
    hitbox: [2, 2, 2, 1],
    behavior: 'roll',
    speed: [40, 60],
    fps: 10,
    hop: 6,
    debris: ['#8a6a3a'],
  },
  snowball: {
    kind: 'obstacle',
    sprites: ['snowball'],
    hitbox: [1, 1, 1, 0],
    behavior: 'roll',
    speed: [30, 48],
    fps: 9,
    hop: 2,
    debris: ['#f4f8ff', '#a9bcd8'],
  },
  ball: {
    kind: 'obstacle',
    sprites: ['ball'],
    hitbox: [1, 1, 1, 1],
    behavior: 'roll',
    speed: [30, 45],
    hop: 12,
    debris: ['#ff4d5e', '#3f7fe0', '#ffd23f'],
  },
  bird: {
    kind: 'obstacle',
    sprites: ['bird'],
    hitbox: [1, 1, 1, 1],
    behavior: 'fly',
    speed: [30, 50],
    fps: 8,
    debris: ['#f4f4f8', '#ffb347'],
  },
  crow: { kind: 'obstacle', sprites: ['bird:crow'], hitbox: [1, 1, 1, 1], behavior: 'fly', speed: [32, 52], fps: 8, debris: ['#2a2838'] },
  eagle: { kind: 'obstacle', sprites: ['bird:eagle'], hitbox: [1, 1, 1, 1], behavior: 'fly', speed: [40, 60], fps: 7, debris: ['#8a5a30'] },
  bat: { kind: 'obstacle', sprites: ['bird:bat'], hitbox: [1, 1, 1, 1], behavior: 'fly', speed: [36, 56], fps: 12, debris: ['#6a4a8a'] },
  owl: { kind: 'obstacle', sprites: ['bird:owl'], hitbox: [1, 1, 1, 1], behavior: 'fly', speed: [28, 44], fps: 6, debris: ['#a8845a'] },

  // ---------- Небезпечні смуги (не забирають життя) ----------
  puddle: { kind: 'hazard', sprites: ['puddle'], hitbox: [2, 0, 2, 0], effect: 'slow', splash: ['#8ab8ff', '#3f78c8', '#ffffff'] },
  mud: { kind: 'hazard', sprites: ['mud'], hitbox: [2, 0, 2, 0], effect: 'slow', splash: ['#5a3a1e', '#7a5230'] },
  sandpit: { kind: 'hazard', sprites: ['sandpit'], hitbox: [2, 0, 2, 0], effect: 'slow', splash: ['#f2d8a0', '#d9b878'] },
  ice: { kind: 'hazard', sprites: ['ice'], hitbox: [2, 0, 2, 0], effect: 'slip', splash: ['#ffffff', '#bfe9ff'] },
  oil: { kind: 'hazard', sprites: ['oil'], hitbox: [2, 0, 2, 0], effect: 'slip', splash: ['#7a4fe0', '#2fb8a8', '#0e0c14'] },

  // ---------- Бонуси ----------
  coin: { kind: 'pickup', sprites: ['coin'], hitbox: [-1, -1, -1, -1], effect: 'coin' },
  heart: { kind: 'pickup', sprites: ['heart'], hitbox: [-1, -1, -1, -1], effect: 'heart' },
  shield: { kind: 'pickup', sprites: ['shield'], hitbox: [-1, -1, -1, -1], effect: 'shield' },
};

export const isMover = (typeId) => Boolean(ENTITY_TYPES[typeId]?.behavior);
export const isFlyer = (typeId) => ENTITY_TYPES[typeId]?.behavior === 'fly';
