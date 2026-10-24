// Опис локацій. Кожна локація — це дані (швидкість, довжина, перешкоди, декор)
// плюс функція paintGround, яка малює безшовну плитку дороги.
//
// Як додати нову локацію: скопіюйте об'єкт, змініть id/name/кольори, підберіть
// obstacles/hazards із ENTITY_TYPES та декор-доріжки (decor). Більше нічого не треба.
import { VIEW_W } from './constants.js';
import { noise, dashed, raggedEdge, sidewalk, px } from './ground.js';

const items = (...list) => list.map(([sprite, weight = 1, extra = {}]) => ({ sprite, weight, ...extra }));

const LAMP_LIGHT = { r: 38, color: '255, 214, 140' };

export const LOCATIONS = [
  {
    id: 'city',
    name: 'Місто',
    subtitle: 'Ранкові вулиці',
    description: 'Конуси, відкриті люки, припарковані авто й неуважні пішоходи. Калюжі сповільнюють.',
    lengthM: 700,
    speed: [95, 150],
    road: { left: 34, right: 146 },
    spawn: { spacing: [128, 86], gap: [54, 26], fill: [0.45, 0.85], mover: [0.06, 0.18], hazard: 0.2, coinTrail: 0.65 },
    obstacles: [
      { type: 'cone', weight: 5 },
      { type: 'manhole', weight: 3 },
      { type: 'car', weight: 2 },
      { type: 'barrier', weight: 2 },
      { type: 'pedestrian', weight: 1 },
    ],
    hazards: [{ type: 'puddle', weight: 1 }],
    decor: [
      { zone: [-4, 22], align: 'start', gap: [1, 3], solid: true, items: items(['building0'], ['building1'], ['building2'], ['building3']) },
      { zone: [158, 184], align: 'end', gap: [1, 3], solid: true, items: items(['building0'], ['building1'], ['building2'], ['building3']) },
      { zone: [23, 33], gap: [26, 64], items: items(['lamp', 3], ['hydrant', 2], ['bench', 1]) },
      { zone: [147, 157], gap: [26, 64], items: items(['lamp', 3], ['hydrant', 2], ['bench', 1]) },
    ],
    weather: null,
    dust: null,
    music: 'city',
    theme: { accent: '#ffcc33', tint: '#4b4b57' },
    paintGround(ctx, rng, H) {
      noise(ctx, rng, 0, 0, VIEW_W, H, '#3b3f52', ['#363a4c', '#41455a'], 0.2);
      const walk = { base: '#a9a3a0', joint: '#8f8a88', noiseColors: ['#b5afac', '#9d9794'] };
      sidewalk(ctx, rng, 22, 12, H, walk);
      sidewalk(ctx, rng, 146, 12, H, walk);
      noise(ctx, rng, 34, 0, 112, H, '#4b4b57', ['#55555f', '#44444f', '#5d5d68'], 0.25);
      px(ctx, 33, 0, '#d8d4cc', 1, H);
      px(ctx, 146, 0, '#d8d4cc', 1, H);
      px(ctx, 34, 0, '#2e2e38', 1, H);
      px(ctx, 37, 0, '#e8e2c0', 1, H);
      px(ctx, 142, 0, '#e8e2c0', 1, H);
      dashed(ctx, 71, 2, 12, 20, '#e8e8e8', H);
      dashed(ctx, 108, 2, 12, 20, '#e8e8e8', H, 16);
      // тріщини в асфальті
      for (let i = 0; i < 6; i++) {
        let x = rng.int(40, 138);
        let y = rng.int(0, H - 20);
        for (let k = 0; k < 10; k++) {
          px(ctx, x, y, '#3a3a44');
          x += rng.int(-1, 1);
          y += 1;
        }
      }
    },
  },

  {
    id: 'forest',
    name: 'Ліс',
    subtitle: 'Стежка серед дубів',
    description: 'Колоди, каміння та пеньки. Обережно — олені перебігають стежку! Багнюка гальмує.',
    lengthM: 900,
    speed: [105, 165],
    road: { left: 44, right: 136 },
    spawn: { spacing: [124, 84], gap: [50, 25], fill: [0.45, 0.85], mover: [0.07, 0.2], hazard: 0.22, coinTrail: 0.65 },
    obstacles: [
      { type: 'rock', weight: 4 },
      { type: 'stump', weight: 3 },
      { type: 'log', weight: 2 },
      { type: 'deer', weight: 1 },
    ],
    hazards: [{ type: 'mud', weight: 1 }],
    decor: [
      {
        zone: [-8, 42],
        gap: [-9, 4],
        items: items(['tree0', 4], ['tree1', 3], ['tree2', 2], ['treeAutumn', 1], ['bush0', 2], ['bush1', 2], ['rockSmall', 1]),
      },
      {
        zone: [138, 188],
        gap: [-9, 4],
        items: items(['tree0', 4], ['tree1', 3], ['tree2', 2], ['treeAutumn', 1], ['bush0', 2], ['bush1', 2], ['rockSmall', 1]),
      },
      { zone: [30, 43], gap: [14, 40], items: items(['flowers', 2], ['flowers:blue', 1], ['grass', 3]) },
      { zone: [137, 150], gap: [14, 40], items: items(['flowers', 2], ['flowers:blue', 1], ['grass', 3]) },
    ],
    weather: 'leaves',
    dust: ['#8a5c33', '#a97a4a'],
    music: 'forest',
    theme: { accent: '#7ed957', tint: '#2f6b2a' },
    paintGround(ctx, rng, H) {
      noise(ctx, rng, 0, 0, VIEW_W, H, '#3f8a3a', ['#357a34', '#4a9a42', '#5fae4a', '#2f6b2a'], 0.35);
      for (let i = 0; i < 260; i++) px(ctx, rng.int(0, VIEW_W - 1), rng.int(0, H - 2), '#2f6b2a', 1, 2);
      noise(ctx, rng, 44, 0, 92, H, '#9b6b3e', ['#8a5c33', '#a97a4a', '#7a4f2b', '#b88a58'], 0.35);
      for (let i = 0; i < 70; i++) px(ctx, rng.int(46, 133), rng.int(0, H - 1), rng.pick(['#c9a57a', '#6b4628']), 2, 1);
      // колії
      for (let y = 0; y < H; y++) {
        if (rng.chance(0.75)) px(ctx, 78, y, '#86592f', 2, 1);
        if (rng.chance(0.75)) px(ctx, 101, y, '#86592f', 2, 1);
      }
      raggedEdge(ctx, rng, 44, H, 1, ['#3f8a3a', '#357a34', '#4a9a42'], 4);
      raggedEdge(ctx, rng, 136, H, -1, ['#3f8a3a', '#357a34', '#4a9a42'], 4);
    },
  },

  {
    id: 'desert',
    name: 'Пустеля',
    subtitle: 'Спекотний каньйон',
    description: 'Кактуси, черепи й каміння. Перекотиполе котиться впоперек дороги. Пісок гальмує.',
    lengthM: 1100,
    speed: [115, 180],
    road: { left: 32, right: 148 },
    spawn: { spacing: [122, 82], gap: [50, 25], fill: [0.45, 0.86], mover: [0.1, 0.24], hazard: 0.22, coinTrail: 0.65 },
    obstacles: [
      { type: 'cactus', weight: 4 },
      { type: 'rockSand', weight: 3 },
      { type: 'bones', weight: 2 },
      { type: 'tumbleweed', weight: 1 },
    ],
    hazards: [{ type: 'sandpit', weight: 1 }],
    decor: [
      { zone: [-6, 30], gap: [6, 26], items: items(['cactusSmall', 3], ['dune0', 2], ['dune1', 2], ['rockSmall:sand', 2], ['grass:sand', 2]) },
      { zone: [150, 186], gap: [6, 26], items: items(['cactusSmall', 3], ['dune0', 2], ['dune1', 2], ['rockSmall:sand', 2], ['grass:sand', 2]) },
    ],
    weather: 'sand',
    dust: ['#e3b866', '#c9975a'],
    music: 'desert',
    theme: { accent: '#ffb347', tint: '#c9975a' },
    paintGround(ctx, rng, H) {
      noise(ctx, rng, 0, 0, VIEW_W, H, '#e3b866', ['#d9ad5a', '#ecc679', '#c9975a'], 0.3);
      noise(ctx, rng, 32, 0, 116, H, '#c9975a', ['#b8854b', '#d4a466', '#a87a44'], 0.3);
      for (let y = 0; y < H; y++) {
        if (rng.chance(0.6)) px(ctx, 70, y, '#b07a42', 2, 1);
        if (rng.chance(0.6)) px(ctx, 108, y, '#b07a42', 2, 1);
      }
      for (let i = 0; i < 40; i++) px(ctx, rng.int(34, 145), rng.int(0, H - 1), '#8a5c33', 1, 1);
      raggedEdge(ctx, rng, 32, H, 1, ['#e3b866', '#d9ad5a'], 4);
      raggedEdge(ctx, rng, 148, H, -1, ['#e3b866', '#d9ad5a'], 4);
    },
  },

  {
    id: 'snow',
    name: 'Гори',
    subtitle: 'Засніжений перевал',
    description: 'Сніговики, брили льоду й каміння. Сніжки котяться схилом, а на льоду велосипед заносить!',
    lengthM: 1300,
    speed: [120, 188],
    road: { left: 38, right: 142 },
    spawn: { spacing: [124, 84], gap: [50, 26], fill: [0.45, 0.85], mover: [0.1, 0.22], hazard: 0.24, coinTrail: 0.65 },
    obstacles: [
      { type: 'snowman', weight: 3 },
      { type: 'iceblock', weight: 3 },
      { type: 'rockSnow', weight: 3 },
      { type: 'logSnow', weight: 1 },
      { type: 'snowball', weight: 1 },
    ],
    hazards: [{ type: 'ice', weight: 1 }],
    decor: [
      { zone: [-8, 37], gap: [-7, 6], items: items(['snowpine0', 3], ['snowpine1', 3], ['snowpine2', 3], ['bushSnow', 2], ['rockSmall:snow', 1]) },
      { zone: [143, 188], gap: [-7, 6], items: items(['snowpine0', 3], ['snowpine1', 3], ['snowpine2', 3], ['bushSnow', 2], ['rockSmall:snow', 1]) },
    ],
    weather: 'snow',
    dust: ['#ffffff', '#dbe6f4'],
    music: 'snow',
    theme: { accent: '#9fe6ff', tint: '#c3d1e4' },
    paintGround(ctx, rng, H) {
      noise(ctx, rng, 0, 0, VIEW_W, H, '#e9f1fb', ['#dbe6f4', '#ffffff', '#cfdcee'], 0.3);
      noise(ctx, rng, 38, 0, 104, H, '#c3d1e4', ['#b3c3da', '#d3dfee', '#a9b9d2'], 0.3);
      for (const x of [74, 77, 102, 105]) {
        for (let y = 0; y < H; y++) if (rng.chance(0.85)) px(ctx, x, y, '#9fb0cc');
      }
      raggedEdge(ctx, rng, 38, H, 1, ['#ffffff', '#e9f1fb'], 4);
      raggedEdge(ctx, rng, 142, H, -1, ['#ffffff', '#e9f1fb'], 4);
      px(ctx, 38, 0, '#a9b9d2', 1, H);
      px(ctx, 141, 0, '#a9b9d2', 1, H);
    },
  },

  {
    id: 'beach',
    name: 'Пляж',
    subtitle: 'Дощатий променад',
    description: 'Піщані замки, парасолі, відерця. Краби бігають боком, а м\'ячі стрибають через дорогу.',
    lengthM: 1500,
    speed: [125, 196],
    road: { left: 56, right: 150 },
    spawn: { spacing: [124, 84], gap: [48, 25], fill: [0.45, 0.85], mover: [0.12, 0.26], hazard: 0.18, coinTrail: 0.7 },
    obstacles: [
      { type: 'sandcastle', weight: 3 },
      { type: 'umbrella', weight: 2 },
      { type: 'bucket', weight: 2 },
      { type: 'crab', weight: 1 },
      { type: 'ball', weight: 1 },
    ],
    hazards: [{ type: 'puddle', weight: 1 }],
    decor: [
      { zone: [28, 54], gap: [8, 28], items: items(['towel0', 2], ['towel1', 2], ['towel2', 2], ['umbrella_red', 1], ['umbrella_blue', 1], ['shell', 2], ['starfish', 2]) },
      { zone: [152, 188], gap: [-2, 10], items: items(['palm0', 3], ['palm1', 3], ['palm2', 3], ['bushBeach', 2], ['grass:sand', 2]) },
    ],
    weather: null,
    dust: null,
    music: 'beach',
    theme: { accent: '#4cd6ff', tint: '#2f8fd8' },
    water: { x0: 0, x1: 24 },
    paintGround(ctx, rng, H) {
      noise(ctx, rng, 0, 0, 24, H, '#2f8fd8', ['#3fa0e8', '#2a7fc8'], 0.3);
      noise(ctx, rng, 24, 0, 4, H, '#d9b878', ['#cfae6e', '#e3c588'], 0.3);
      noise(ctx, rng, 28, 0, 28, H, '#f2d8a0', ['#f8e2b0', '#e3c588'], 0.3);
      noise(ctx, rng, 150, 0, 30, H, '#f2d8a0', ['#f8e2b0', '#e3c588'], 0.3);
      // дошки променаду
      for (let y = 0; y < H; y += 8) {
        px(ctx, 56, y, rng.pick(['#b9814f', '#ad7646', '#c28a58']), 94, 8);
        px(ctx, 56, y, '#6d4a2b', 94, 1);
        for (let i = 0; i < 20; i++) px(ctx, rng.int(57, 148), y + rng.int(2, 7), '#9a6a3e', rng.int(2, 6), 1);
        let x = 56 + rng.int(10, 30);
        while (x < 146) {
          px(ctx, x, y + 1, '#6d4a2b', 1, 7);
          px(ctx, x - 2, y + 3, '#4a3420');
          px(ctx, x + 2, y + 3, '#4a3420');
          x += rng.int(28, 40);
        }
      }
      px(ctx, 56, 0, '#7a5232', 2, H);
      px(ctx, 148, 0, '#7a5232', 2, H);
    },
    // Анімоване море і піна прибою (малюється кожен кадр поверх плитки).
    animate(ctx, t, scroll) {
      for (let k = 0; k < 9; k++) {
        const y = Math.floor((k * 40 + scroll * 0.6 + t * 8) % 360) - 20;
        const x = Math.round(3 + 4 * Math.sin(t * 1.3 + k));
        px(ctx, x, y, '#7cc4f4', 8, 1);
        px(ctx, x + 2, y + 1, '#5fb0ec', 6, 1);
      }
      for (let y = 0; y < 320; y += 2) {
        const x = 22 + Math.round(2 * Math.sin((y + scroll) * 0.05 + t * 2));
        px(ctx, x, y, '#ffffff', 2, 2);
        if ((y + Math.floor(scroll)) % 6 === 0) px(ctx, x - 2, y, '#dff2ff', 1, 1);
      }
    },
  },

  {
    id: 'night',
    name: 'Нічне місто',
    subtitle: 'Неон і дощ',
    description: 'Темно — світить лише фара. Ями, бар\'єри, машини і чорні коти. Олія на асфальті — занос!',
    lengthM: 1800,
    speed: [132, 210],
    road: { left: 30, right: 150 },
    spawn: { spacing: [122, 82], gap: [50, 26], fill: [0.45, 0.86], mover: [0.08, 0.2], hazard: 0.26, coinTrail: 0.7 },
    obstacles: [
      { type: 'barrier', weight: 3 },
      { type: 'pothole', weight: 3 },
      { type: 'carNight', weight: 2 },
      { type: 'cone', weight: 2 },
      { type: 'cat', weight: 1 },
    ],
    hazards: [
      { type: 'oil', weight: 2 },
      { type: 'puddle', weight: 1 },
    ],
    decor: [
      { zone: [-4, 22], align: 'start', gap: [1, 3], solid: true, items: items(['buildingNight0'], ['buildingNight1'], ['buildingNight2']) },
      { zone: [158, 184], align: 'end', gap: [1, 3], solid: true, items: items(['buildingNight0'], ['buildingNight1'], ['buildingNight2']) },
      {
        zone: [22, 30],
        gap: [24, 56],
        items: items(
          ['lamp', 3, { light: LAMP_LIGHT }],
          ['neonPink', 1, { light: { r: 24, color: '255, 79, 216' } }],
          ['neonCyan', 1, { light: { r: 24, color: '76, 240, 255' } }],
          ['neonLime', 1, { light: { r: 24, color: '182, 255, 79' } }],
        ),
      },
      {
        zone: [150, 158],
        gap: [24, 56],
        items: items(
          ['lamp', 3, { light: LAMP_LIGHT }],
          ['neonPink', 1, { light: { r: 24, color: '255, 79, 216' } }],
          ['neonCyan', 1, { light: { r: 24, color: '76, 240, 255' } }],
        ),
      },
    ],
    weather: 'rain',
    darkness: 0.74,
    dust: null,
    music: 'night',
    theme: { accent: '#ff4fd8', tint: '#1d1c2a' },
    paintGround(ctx, rng, H) {
      noise(ctx, rng, 0, 0, VIEW_W, H, '#16141f', ['#1a1826', '#121019'], 0.2);
      const walk = { base: '#2e2b3d', joint: '#25222f', noiseColors: ['#34314a', '#2a2738'] };
      sidewalk(ctx, rng, 22, 8, H, walk);
      sidewalk(ctx, rng, 150, 8, H, walk);
      noise(ctx, rng, 30, 0, 120, H, '#1d1c2a', ['#22213a', '#18172a', '#2a2840'], 0.25);
      px(ctx, 29, 0, '#4a4660', 1, H);
      px(ctx, 150, 0, '#4a4660', 1, H);
      px(ctx, 33, 0, '#5a5640', 1, H);
      px(ctx, 146, 0, '#5a5640', 1, H);
      dashed(ctx, 69, 2, 12, 20, '#8a8650', H);
      dashed(ctx, 109, 2, 12, 20, '#8a8650', H, 16);
      // мокрі відблиски
      for (let i = 0; i < 50; i++) px(ctx, rng.int(32, 146), rng.int(0, H - 8), '#2f2c48', 1, rng.int(3, 7));
    },
  },
];

export const getLocation = (id) => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
export const locationIndex = (id) => LOCATIONS.findIndex((l) => l.id === id);
