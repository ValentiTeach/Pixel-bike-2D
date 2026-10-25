// Опис локацій (вид збоку). Кожна локація — це дані (швидкість, довжина, перешкоди,
// ваги «викликів» генератора) плюс функції малювання неба, паралакс-шарів і землі.
//
// Як додати нову локацію: скопіюйте об'єкт, змініть id/name/кольори, підберіть
// obstacles/movers/flyers/hazards із ENTITY_TYPES і функції фону з background.js.
import { paintSky, ridge, peaks, skyline, clouds, spriteRow, sea, groundTexture, px } from './background.js';

const items = (...list) => list.map(([sprite, weight = 1, extra = {}]) => ({ sprite, weight, ...extra }));
const LAMP_LIGHT = { r: 40, color: '255, 214, 140', dx: 1, dy: 5 };

// Ваги «викликів» генератора: число або [на старті, на фініші].
const GEN = {
  runway: [1.15, 0.6], // секунд їзди по рівному між викликами
  obstacle: 5,
  double: [0, 1.4],
  pit: [0.8, 2.4],
  step: [0.7, 1.6],
  mover: [0.4, 1.6],
  bird: [0, 1.2],
  hazard: 1,
  coins: 0.8,
};

export const LOCATIONS = [
  {
    id: 'city',
    name: 'Місто',
    subtitle: 'Ранкові вулиці',
    description: 'Конуси, бар\'єри, гідранти й припарковані авто. Пішоходи йдуть назустріч, голуби літають низько.',
    lengthM: 700,
    speed: [85, 130],
    gen: { ...GEN, runway: [1.25, 0.7], pit: [0.5, 1.6] },
    obstacles: [
      { type: 'cone', weight: 5 },
      { type: 'barrier', weight: 2 },
      { type: 'hydrant', weight: 2 },
      { type: 'car', weight: 1.5 },
    ],
    movers: [{ type: 'pedestrian', weight: 1 }],
    flyers: [{ type: 'bird', weight: 1 }],
    hazards: [{ type: 'puddle', weight: 1 }],
    props: items(['lampPost', 3], ['bush0', 2], ['tree1', 1]),
    propGap: [30, 90],
    weather: null,
    dust: ['#a9a3a0', '#d8d4cc'],
    music: 'city',
    theme: { accent: '#ffcc33' },
    edge: '#4a3028',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#3f8ee0', '#5aa6ec', '#82c0f4', '#b8dcf8'], { rng, sun: { x: 250, y: 30, r: 8, color: '#fff6c8', glow: '#cfe8fc' } });
    },
    layers: [
      { factor: 0.05, paint: (ctx, rng, W) => clouds(ctx, rng, { W, yMin: 15, yMax: 60, count: 9, color: '#ffffff', shade: '#cfe2f6' }) },
      {
        factor: 0.18,
        paint: (ctx, rng, W, H) =>
          skyline(ctx, rng, { W, H, base: 140, color: '#9ab4d8', windows: ['#b8cfe8'], litChance: 0.25, minH: 40, maxH: 90 }),
      },
      {
        factor: 0.4,
        paint: (ctx, rng, W, H) =>
          skyline(ctx, rng, { W, H, base: 150, color: '#6a7aa6', roof: '#8a9ac0', windows: ['#a8c8e8', '#d8e8f8'], litChance: 0.5, minW: 18, maxW: 36, minH: 30, maxH: 70 }),
      },
    ],
    paintGround(ctx, rng, W, H) {
      groundTexture(ctx, rng, {
        W,
        H,
        surface: ['#e8e4dc', '#c8c2ba', '#a9a3a0', '#a9a3a0', '#5a5670'],
        fringe: { depth: 1, color: '#3a3448', dark: '#2a2438', noise: ['#b5afac', '#9d9794'] },
        body: '#8a5a4a',
        bodyNoise: ['#7a4a3a', '#9a6a5a'],
      });
      // цегляна кладка
      for (let y = 7; y < H; y += 6) {
        px(ctx, 0, y, '#4a3028', W, 1);
        const off = (y / 6) % 2 ? 0 : 6;
        for (let x = off; x < W; x += 12) px(ctx, x, y, '#4a3028', 1, 6);
      }
    },
  },

  {
    id: 'forest',
    name: 'Ліс',
    subtitle: 'Стежка серед пагорбів',
    description: 'Каміння, пеньки й колоди, ями та уступи. Олені біжать назустріч, ворони кружляють над стежкою.',
    lengthM: 900,
    speed: [92, 140],
    gen: { ...GEN },
    obstacles: [
      { type: 'rock', weight: 4 },
      { type: 'stump', weight: 3 },
      { type: 'log', weight: 1.5 },
    ],
    movers: [{ type: 'deer', weight: 1 }],
    flyers: [{ type: 'crow', weight: 1 }],
    hazards: [{ type: 'mud', weight: 1 }],
    props: items(['bush0', 3], ['bush1', 3], ['flowers', 2], ['flowers:blue', 1], ['grass', 3], ['tree1', 1], ['fence', 1]),
    propGap: [10, 50],
    weather: 'leaves',
    dust: ['#a8683a', '#c98a50'],
    music: 'forest',
    theme: { accent: '#7ed957' },
    edge: '#6a3a1a',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#2f7ed0', '#4a96e0', '#68aeea', '#8cc6f2'], { rng });
    },
    layers: [
      { factor: 0.04, paint: (ctx, rng, W) => clouds(ctx, rng, { W, yMin: 12, yMax: 50, count: 8, color: '#ffffff', shade: '#c8dcf2' }) },
      { factor: 0.12, paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 128, count: 7, minH: 40, maxH: 70, color: '#8fb0dc', shade: '#7f9fcc' }) },
      { factor: 0.28, paint: (ctx, rng, W, H) => ridge(ctx, rng, { W, H, base: 140, amp: 34, color: '#4f9a52', top: '#6ab868', k: [3, 7] }) },
      {
        factor: 0.5,
        paint: (ctx, rng, W) => spriteRow(ctx, rng, { W, base: 152, items: items(['tree0', 3], ['tree2', 2], ['pine0', 2], ['treeAutumn', 1]), gap: [-6, 14] }),
      },
    ],
    paintGround(ctx, rng, W, H) {
      groundTexture(ctx, rng, {
        W,
        H,
        surface: ['#c8f070', '#9ad848', '#7ac83a', '#5aa82a'],
        fringe: { depth: 3, color: '#4a8a22', dark: '#2f5a14', noise: ['#8ad040', '#6ab832'] },
        body: '#a8683a',
        bodyNoise: ['#9a5a30', '#b87848'],
        rocks: { mid: '#c98a50', light: '#e8b070', dark: '#6a3a1a', density: 160 },
      });
    },
  },

  {
    id: 'desert',
    name: 'Пустеля',
    subtitle: 'Спекотний каньйон',
    description: 'Кактуси, черепи та каміння між пісковиками. Перекотиполе котиться назустріч, орли пікірують.',
    lengthM: 1100,
    speed: [98, 150],
    gen: { ...GEN, pit: [1, 2.6] },
    obstacles: [
      { type: 'cactus', weight: 4 },
      { type: 'rockSand', weight: 3 },
      { type: 'bones', weight: 2 },
    ],
    movers: [{ type: 'tumbleweed', weight: 1 }],
    flyers: [{ type: 'eagle', weight: 1 }],
    hazards: [{ type: 'sandpit', weight: 1 }],
    props: items(['cactusSmall', 3], ['grass:sand', 2], ['rockSmall:sand', 2]),
    propGap: [24, 90],
    weather: 'sand',
    dust: ['#f2c878', '#e0a860'],
    music: 'desert',
    theme: { accent: '#ffb347' },
    edge: '#8a4a28',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#e8704a', '#f4904e', '#f9b062', '#fcd28a', '#fde6b0'], {
        rng,
        sun: { x: 230, y: 62, r: 14, color: '#fff2b0', glow: '#ffd27a' },
      });
    },
    layers: [
      {
        factor: 0.1,
        paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 132, count: 5, minH: 30, maxH: 55, color: '#c8705a', shade: '#a85a48', flat: 0.6 }),
      },
      { factor: 0.25, paint: (ctx, rng, W, H) => ridge(ctx, rng, { W, H, base: 146, amp: 22, color: '#e8a860', top: '#f6c47e', k: [2, 6] }) },
      {
        factor: 0.5,
        paint: (ctx, rng, W) => spriteRow(ctx, rng, { W, base: 154, items: items(['cactus', 2], ['cactusSmall', 3], ['dune0', 1]), gap: [30, 90] }),
      },
    ],
    paintGround(ctx, rng, W, H) {
      groundTexture(ctx, rng, {
        W,
        H,
        surface: ['#fff0c0', '#fbe0a0', '#f2c878', '#e8b868'],
        fringe: { depth: 2, color: '#d9a058', dark: '#b8783a', noise: ['#f6d690', '#eabc70'] },
        body: '#d9945a',
        bodyNoise: ['#c98048', '#e0a468'],
        layers: ['#d9945a', '#c98048', '#e0a468', '#c47a42'],
        rocks: { mid: '#b8703a', light: '#e0a468', dark: '#7a4220', density: 420 },
      });
    },
  },

  {
    id: 'snow',
    name: 'Гори',
    subtitle: 'Засніжений перевал',
    description: 'Сніговики, брили льоду й колоди. Сніжки котяться схилом, на льоду гальма не працюють!',
    lengthM: 1300,
    speed: [100, 155],
    gen: { ...GEN, step: [1, 2], pit: [0.9, 2.4] },
    obstacles: [
      { type: 'snowman', weight: 3 },
      { type: 'iceblock', weight: 3 },
      { type: 'rockSnow', weight: 3 },
      { type: 'logSnow', weight: 1 },
    ],
    movers: [{ type: 'snowball', weight: 1 }],
    flyers: [{ type: 'owl', weight: 1 }],
    hazards: [{ type: 'ice', weight: 1 }],
    props: items(['snowpine0', 2], ['snowpine1', 2], ['bushSnow', 3], ['rockSmall:snow', 2]),
    propGap: [14, 60],
    weather: 'snow',
    dust: ['#ffffff', '#dbe6f4'],
    music: 'snow',
    theme: { accent: '#9fe6ff' },
    edge: '#3d4258',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#6a98cc', '#86b0dc', '#a8c8e8', '#cadef2', '#e8f0fa'], { rng });
    },
    layers: [
      {
        factor: 0.08,
        paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 125, count: 6, minH: 55, maxH: 85, color: '#a8bcd8', shade: '#8ea4c4', snow: '#ffffff' }),
      },
      {
        factor: 0.22,
        paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 140, count: 9, minH: 30, maxH: 50, color: '#7f94b8', shade: '#6a7ea4', snow: '#eef4fc' }),
      },
      {
        factor: 0.5,
        paint: (ctx, rng, W) => spriteRow(ctx, rng, { W, base: 154, items: items(['snowpine0', 1], ['snowpine1', 1], ['snowpine2', 1]), gap: [-4, 10] }),
      },
    ],
    paintGround(ctx, rng, W, H) {
      groundTexture(ctx, rng, {
        W,
        H,
        surface: ['#ffffff', '#f4f8ff', '#e9f1fb', '#dbe6f4', '#c8d6ea'],
        fringe: { depth: 3, color: '#b8c8e0', dark: '#8a9ab8', noise: ['#ffffff', '#e0eaf6'] },
        body: '#5a6078',
        bodyNoise: ['#4f5470', '#666c88'],
        rocks: { mid: '#7a82a0', light: '#a8b0c8', dark: '#3d4258', density: 170 },
      });
    },
  },

  {
    id: 'beach',
    name: 'Пляж',
    subtitle: 'Узбережжя',
    description: 'Піщані замки, парасолі й відерця. Краби біжать назустріч, м\'ячі стрибають, чайки ширяють низько.',
    lengthM: 1500,
    speed: [104, 160],
    gen: { ...GEN, mover: [0.6, 2], bird: [0.2, 1.4] },
    obstacles: [
      { type: 'sandcastle', weight: 3 },
      { type: 'umbrella', weight: 2 },
      { type: 'bucket', weight: 2 },
    ],
    movers: [
      { type: 'crab', weight: 1 },
      { type: 'ball', weight: 1 },
    ],
    flyers: [{ type: 'bird', weight: 1 }],
    hazards: [{ type: 'puddle', weight: 1 }],
    props: items(['palm0', 1], ['palm1', 1], ['bushBeach', 2], ['shell', 2], ['starfish', 2], ['grass:sand', 2]),
    propGap: [20, 80],
    weather: null,
    dust: ['#fbe8b8', '#f2d8a0'],
    music: 'beach',
    theme: { accent: '#4cd6ff' },
    edge: '#a8804a',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#2f9ce4', '#4ab2ee', '#74caf6', '#a8e0fa'], { rng, sun: { x: 60, y: 28, r: 9, color: '#fffbe0', glow: '#c8ecfc' } });
    },
    layers: [
      { factor: 0.04, paint: (ctx, rng, W) => clouds(ctx, rng, { W, yMin: 15, yMax: 55, count: 7, color: '#ffffff', shade: '#d0ecfa' }) },
      {
        factor: 0.1,
        paint: (ctx, rng, W, H) => {
          ridge(ctx, rng, { W, H, base: 112, amp: 10, color: '#6a9ac0', k: [1, 3] });
          sea(ctx, rng, { W, H, y: 112, colors: ['#2f8fd8', '#1f6fb8'], sparkle: '#9fdcff' });
        },
      },
      {
        factor: 0.45,
        paint: (ctx, rng, W) => spriteRow(ctx, rng, { W, base: 154, items: items(['palm0', 1], ['palm1', 1], ['palm2', 1]), gap: [30, 110] }),
      },
    ],
    // відблиски на морі «мерехтять»
    animate(ctx, t) {
      for (let i = 0; i < 14; i++) {
        const x = Math.floor((i * 97 + t * 6) % 320);
        const y = 116 + ((i * 37) % 30);
        if ((Math.floor(t * 3) + i) % 3 === 0) px(ctx, x, y, '#e6f8ff', 3, 1);
      }
    },
    paintGround(ctx, rng, W, H) {
      groundTexture(ctx, rng, {
        W,
        H,
        surface: ['#fff4d0', '#fbe8b8', '#f2d8a0', '#e8c888'],
        fringe: { depth: 2, color: '#d9b070', dark: '#b8904a', noise: ['#f8e2b0'] },
        body: '#d9b070',
        bodyNoise: ['#c9a060', '#e3c080', '#f0d8a8'],
        rocks: { mid: '#c09858', light: '#e8d0a0', dark: '#8a6a3a', density: 520 },
      });
    },
  },

  {
    id: 'night',
    name: 'Нічне місто',
    subtitle: 'Неон і дощ',
    description: 'Темно — світять лише фара й ліхтарі. Бар\'єри, авто, коти й кажани. Олія на асфальті — занос!',
    lengthM: 1800,
    speed: [108, 168],
    gen: { ...GEN, runway: [1.05, 0.55], bird: [0.2, 1.4] },
    obstacles: [
      { type: 'barrier', weight: 3 },
      { type: 'cone', weight: 3 },
      { type: 'carNight', weight: 1.5 },
    ],
    movers: [{ type: 'cat', weight: 1 }],
    flyers: [{ type: 'bat', weight: 1 }],
    hazards: [
      { type: 'oil', weight: 2 },
      { type: 'puddle', weight: 1 },
    ],
    props: items(
      ['lampPost', 3, { light: LAMP_LIGHT }],
      ['neonPink', 1, { light: { r: 26, color: '255, 79, 216' } }],
      ['neonCyan', 1, { light: { r: 26, color: '76, 240, 255' } }],
      ['neonLime', 1, { light: { r: 26, color: '182, 255, 79' } }],
    ),
    propGap: [40, 90],
    weather: 'rain',
    darkness: 0.72,
    dust: null,
    music: 'night',
    theme: { accent: '#ff4fd8' },
    edge: '#141220',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#07061a', '#110e2e', '#1e1644', '#36205a'], { rng, stars: 70, moon: { x: 262, y: 28, r: 9 } });
    },
    layers: [
      {
        factor: 0.12,
        paint: (ctx, rng, W, H) => skyline(ctx, rng, { W, H, base: 135, color: '#1a1632', windows: ['#ffd76a', '#ffe9a0'], litChance: 0.25, minH: 50, maxH: 100 }),
      },
      {
        factor: 0.35,
        paint: (ctx, rng, W, H) =>
          skyline(ctx, rng, { W, H, base: 152, color: '#241e42', roof: '#3a3060', windows: ['#ff4fd8', '#4cf0ff', '#ffd76a'], litChance: 0.3, minW: 18, maxW: 36, minH: 30, maxH: 75 }),
      },
    ],
    paintGround(ctx, rng, W, H) {
      groundTexture(ctx, rng, {
        W,
        H,
        surface: ['#6a6488', '#4a4660', '#2e2b3d', '#2e2b3d', '#3a3650'],
        fringe: { depth: 1, color: '#1a1726', dark: '#120f1c', noise: ['#3a3650', '#26233a'] },
        body: '#2a2438',
        bodyNoise: ['#221e30', '#322b44'],
      });
      for (let y = 7; y < H; y += 6) {
        px(ctx, 0, y, '#141220', W, 1);
        const off = (y / 6) % 2 ? 0 : 6;
        for (let x = off; x < W; x += 12) px(ctx, x, y, '#141220', 1, 6);
      }
    },
  },
];

export const getLocation = (id) => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
export const locationIndex = (id) => LOCATIONS.findIndex((l) => l.id === id);
