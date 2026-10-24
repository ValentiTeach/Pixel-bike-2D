// Типи ігрових об'єктів: перешкоди, небезпечні зони та бонуси.
// hitbox — відступи [зліва, згори, справа, знизу] від країв спрайта.
// behavior:
//   static   — стоїть на дорозі
//   cross    — переходить дорогу з узбіччя на інше узбіччя (пішохід, олень, кіт)
//   sideways — котиться/бігає вліво-вправо між краями дороги (перекотиполе, краб, м'яч)

export const ENTITY_TYPES = {
  // ---------- Статичні перешкоди ----------
  cone: { kind: 'obstacle', sprites: ['cone'], hitbox: [1, 3, 1, 0], debris: ['#ff7a1a', '#ffffff'] },
  manhole: { kind: 'obstacle', sprites: ['manhole'], hitbox: [2, 2, 2, 2], flat: true, debris: ['#7a7a88', '#1a1820'] },
  pothole: { kind: 'obstacle', sprites: ['pothole'], hitbox: [2, 2, 2, 2], flat: true, debris: ['#3a3848', '#121018'] },
  car: {
    kind: 'obstacle',
    sprites: ['car_red', 'car_blue', 'car_white', 'car_taxi', 'car_green'],
    hitbox: [1, 1, 1, 2],
    debris: ['#9fd4ff', '#e0483f', '#15141c'],
  },
  carNight: {
    kind: 'obstacle',
    sprites: ['car_night_purple', 'car_night_teal', 'car_night_dark'],
    hitbox: [1, 1, 1, 2],
    light: { r: 22, color: '255, 240, 190', dy: 0 },
    debris: ['#b89aff', '#4cf0ff', '#15141c'],
  },
  barrier: { kind: 'obstacle', sprites: ['barrier'], hitbox: [0, 1, 0, 1], debris: ['#e8383d', '#ffffff'] },
  rock: { kind: 'obstacle', sprites: ['rock'], hitbox: [1, 2, 1, 1], debris: ['#8b879c', '#625e74'] },
  rockSand: { kind: 'obstacle', sprites: ['rock:sand'], hitbox: [1, 2, 1, 1], debris: ['#b8834d', '#8a5c33'] },
  rockSnow: { kind: 'obstacle', sprites: ['rock:snow'], hitbox: [1, 2, 1, 1], debris: ['#a9b8cf', '#ffffff'] },
  stump: { kind: 'obstacle', sprites: ['stump'], hitbox: [1, 1, 1, 1], debris: ['#d9a066', '#6b4226'] },
  log: { kind: 'obstacle', sprites: ['log'], hitbox: [1, 1, 1, 1], debris: ['#7a4a26', '#d9a066'] },
  logSnow: { kind: 'obstacle', sprites: ['logSnow'], hitbox: [1, 1, 1, 1], debris: ['#7a4a26', '#ffffff'] },
  cactus: { kind: 'obstacle', sprites: ['cactus'], hitbox: [2, 2, 2, 3], debris: ['#3e9b3a', '#7ed957'] },
  bones: { kind: 'obstacle', sprites: ['bones'], hitbox: [1, 1, 1, 1], debris: ['#f6efdc'] },
  snowman: { kind: 'obstacle', sprites: ['snowman'], hitbox: [2, 3, 2, 1], debris: ['#f4f8ff', '#ff8a1c'] },
  iceblock: { kind: 'obstacle', sprites: ['iceblock'], hitbox: [1, 1, 1, 1], debris: ['#bfe9ff', '#ffffff'] },
  sandcastle: { kind: 'obstacle', sprites: ['sandcastle'], hitbox: [1, 2, 1, 1], debris: ['#f0d28c', '#c9a55e'] },
  umbrella: {
    kind: 'obstacle',
    sprites: ['umbrella_red', 'umbrella_blue', 'umbrella_green'],
    hitbox: [3, 3, 3, 3],
    debris: ['#ffffff', '#e8383d'],
  },
  bucket: { kind: 'obstacle', sprites: ['bucket'], hitbox: [1, 2, 1, 0], debris: ['#3fa9f5'] },

  // ---------- Рухомі перешкоди ----------
  pedestrian: {
    kind: 'obstacle',
    sprites: ['pedestrian', 'pedestrian:red', 'pedestrian:green'],
    hitbox: [1, 2, 1, 1],
    behavior: 'cross',
    speed: [26, 40],
    fps: 6,
    debris: ['#3f7fe0', '#e8b48a'],
  },
  deer: {
    kind: 'obstacle',
    sprites: ['deer'],
    hitbox: [2, 4, 2, 0],
    behavior: 'cross',
    speed: [48, 70],
    fps: 8,
    facesRight: true,
    debris: ['#a8683a', '#f1dcc0'],
  },
  cat: {
    kind: 'obstacle',
    sprites: ['cat'],
    hitbox: [1, 1, 0, 0],
    behavior: 'cross',
    speed: [45, 65],
    fps: 10,
    facesRight: true,
    debris: ['#77728f', '#ffe14d'],
  },
  tumbleweed: {
    kind: 'obstacle',
    sprites: ['tumbleweed'],
    hitbox: [2, 2, 2, 2],
    behavior: 'sideways',
    speed: [38, 60],
    fps: 10,
    hop: 3,
    debris: ['#8a6a3a'],
  },
  snowball: {
    kind: 'obstacle',
    sprites: ['snowball'],
    hitbox: [1, 1, 1, 1],
    behavior: 'sideways',
    speed: [32, 52],
    fps: 9,
    debris: ['#f4f8ff', '#a9bcd8'],
  },
  crab: {
    kind: 'obstacle',
    sprites: ['crab'],
    hitbox: [1, 1, 1, 0],
    behavior: 'sideways',
    speed: [26, 42],
    fps: 6,
    debris: ['#e8483c', '#ff7a5c'],
  },
  ball: {
    kind: 'obstacle',
    sprites: ['ball'],
    hitbox: [1, 1, 1, 1],
    behavior: 'sideways',
    speed: [40, 62],
    hop: 7,
    debris: ['#ff4d5e', '#3f7fe0', '#ffd23f'],
  },

  // ---------- Небезпечні зони (не забирають життя) ----------
  puddle: { kind: 'hazard', sprites: ['puddle'], hitbox: [3, 2, 3, 2], effect: 'slow', splash: ['#8ab8ff', '#3f78c8', '#ffffff'] },
  mud: { kind: 'hazard', sprites: ['mud'], hitbox: [3, 2, 3, 2], effect: 'slow', splash: ['#5a3a1e', '#7a5230'] },
  sandpit: { kind: 'hazard', sprites: ['sandpit'], hitbox: [3, 2, 3, 2], effect: 'slow', splash: ['#f2d8a0', '#d9b878'] },
  ice: { kind: 'hazard', sprites: ['ice'], hitbox: [3, 2, 3, 2], effect: 'slip', splash: ['#ffffff', '#bfe9ff'] },
  oil: { kind: 'hazard', sprites: ['oil'], hitbox: [3, 2, 3, 2], effect: 'slip', splash: ['#7a4fe0', '#2fb8a8', '#0e0c14'] },

  // ---------- Бонуси ----------
  coin: { kind: 'pickup', sprites: ['coin'], hitbox: [-1, -1, -1, -1], effect: 'coin' },
  heart: { kind: 'pickup', sprites: ['heart'], hitbox: [-1, -1, -1, -1], effect: 'heart' },
  shield: { kind: 'pickup', sprites: ['shield'], hitbox: [-1, -1, -1, -1], effect: 'shield' },
};

export const isMover = (typeId) => Boolean(ENTITY_TYPES[typeId]?.behavior && ENTITY_TYPES[typeId].behavior !== 'static');
