// Траси (вид збоку). Кожна траса — це дані для генератора (ухил, фічі та їхні ваги, покриття,
// розміри стрибків) плюс функції малювання неба, паралакс-шарів і текстур покриттів.
//
// Траси фіксовані: у режимі рівня сід завжди однаковий — трасу можна вивчити і покращувати час,
// як на справжніх змаганнях. Нескінченний «фрірайд» щоразу генерується заново.
//
// Складність — за шкалою байк-парків: зелена (легка), синя, червона, чорна, подвійна чорна.
// Цільовий час (times): «золото» ≈ 93% часу бота на трейловому байку без падінь, «срібло» ≈ 115%.
// Тест tests/world.test.js перевіряє, що бот укладається між ними — траса чесна, а час реальний.
import { paintSky, ridge, peaks, skyline, clouds, sea, forestRow, canyonWall } from './background.js';
import { MAT } from './terrain.js';
import { paintMaterials } from './groundTextures.js';

const items = (...list) => list.map(([sprite, weight = 1, extra = {}]) => ({ sprite, weight, ...extra }));
const LAMP_LIGHT = { r: 46, color: '255, 214, 140', dx: 3, dy: 6 };

export const DIFFICULTY = {
  green: { label: 'Зелена', hint: 'легка' },
  blue: { label: 'Синя', hint: 'середня' },
  red: { label: 'Червона', hint: 'складна' },
  black: { label: 'Чорна', hint: 'дуже складна' },
  double: { label: 'Подвійна чорна', hint: 'експертна' },
};

export const LOCATIONS = [
  {
    id: 'forest',
    name: 'Лісовий трейл',
    subtitle: 'Сосновий бір, ранковий туман',
    description: 'Флоу-стежка між соснами: ролери, тейбли, корені, колоди й дерев\'яні містки над струмками. Ідеально, щоб відчути байк.',
    difficulty: 'green',
    lengthM: 900,
    seed: 1101,
    times: { gold: 117, silver: 144 },
    gen: {
      surface: MAT.dirt,
      grade: [0.04, 0.08],
      amp: 0.55,
      rough: 0.008,
      size: [0.25, 0.75],
      vCap: 10.5,
      checkpointEvery: 190,
      dropMat: MAT.wood,
      kickerMat: MAT.dirt,
      patchMat: MAT.mud,
      features: { rollers: 2.2, table: 2, roots: 1.6, log: 1.1, bridge: 1.2, climb: 0.7, compression: 0.7, water: 0.6, patch: 0.5, drop: [0.3, 1], rockGarden: [0.2, 0.7], steep: [0.2, 0.5] },
      from: { drop: 0.25, steep: 0.3, rockGarden: 0.35 },
    },
    tip: 'Колоду перестрибни банні-хопом (Пробіл), у повітрі вирівнюй байк під схил.',
    features: ['ролери', 'тейбли', 'корені', 'колоди', 'містки', 'брід', 'багно'],
    props: items(['pineTall', 4, { sink: 3 }], ['spruce', 3, { sink: 3 }], ['birch', 2, { sink: 3 }], ['fern', 4, { sink: 2 }], ['bushBig', 2], ['stumpDecor', 1], ['boulder', 1], ['mushrooms', 1]),
    propGap: [6, 40],
    weather: 'leaves',
    fog: { color: '220, 232, 236', amount: 0.32 },
    dust: { default: ['#7a5232', '#9a6a42', '#b8875a'], mud: ['#4a3018', '#5e3e20'], roots: ['#7a5232', '#5a3a1e'] },
    music: 'forest',
    theme: { accent: '#7ed957' },
    palette: 'forest',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#5f9fd4', '#7db3dd', '#a3c9e4', '#c8dde8', '#dfe9ea'], { rng, sun: { x: 252, y: 34, r: 9, color: '#fff8dc', glow: '#e6f0ea' } });
    },
    layers: [
      { factor: 0.03, paint: (ctx, rng, W, H) => clouds(ctx, rng, { W, H, yMin: 14, yMax: 50, count: 6, color: '#f6fafc', shade: '#d4e2ea' }) },
      { factor: 0.08, paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 112, count: 6, minH: 34, maxH: 60, color: '#9fb8cc', shade: '#8ea8be' }) },
      { factor: 0.16, paint: (ctx, rng, W, H) => forestRow(ctx, rng, { W, H, base: 118, color: '#6f9a8a', dark: '#5f8a7a', minH: 22, maxH: 38, density: 1.4 }) },
      { factor: 0.32, paint: (ctx, rng, W, H) => forestRow(ctx, rng, { W, H, base: 132, color: '#3f6f52', dark: '#33604a', minH: 30, maxH: 54, density: 1.1 }) },
      { factor: 0.55, paint: (ctx, rng, W, H) => forestRow(ctx, rng, { W, H, base: 150, color: '#1f4632', dark: '#183a2a', minH: 44, maxH: 80, density: 0.8, trunks: '#2a2018' }) },
    ],
    paintGround: (ctx, rng, W, H, mat) => paintMaterials(ctx, rng, W, H, mat, 'forest'),
  },

  {
    id: 'city',
    name: 'Міський даунхіл',
    subtitle: 'Сходи, парапети й дерев\'яні кікери',
    description: 'Урбан-даунхіл крізь старе місто: сходові марші, бордюри, бетонні дропи й дерев\'яні трампліни. Бетон тримає добре — гальмуй пізно.',
    difficulty: 'blue',
    lengthM: 1000,
    seed: 2207,
    times: { gold: 133, silver: 164 },
    gen: {
      surface: MAT.concrete,
      grade: [0.04, 0.09],
      amp: 0.25,
      rough: 0,
      size: [0.35, 0.85],
      vCap: 11.5,
      checkpointEvery: 200,
      dropMat: MAT.concrete,
      kickerMat: MAT.wood,
      gapBottom: MAT.concrete,
      features: { stairs: 2.4, ledge: 1.8, table: 1.4, drop: [0.5, 1.2], rollers: 0.5, compression: 0.6, climb: 0.5, gap: [0, 0.8] },
      from: { gap: 0.4, drop: 0.2 },
    },
    tip: 'На сходах і бордюрах відкинься назад (←) — інакше перелетиш через кермо.',
    features: ['сходи', 'бордюри', 'бетонні дропи', 'дерев\'яні кікери', 'гепи через провулки'],
    props: items(['lampTall', 3, { light: LAMP_LIGHT, sink: 1 }], ['houseA', 2, { sink: 1, maxSlope: 12 }], ['houseB', 2, { sink: 1, maxSlope: 12 }], ['treeCity', 2, { sink: 2 }], ['bench', 1, { sink: 1 }], ['hydrantBig', 1, { sink: 1 }], ['barrierTape', 1, { sink: 1 }]),
    propGap: [10, 50],
    weather: null,
    dust: { default: ['#b5b0a8', '#d8d4cc'] },
    music: 'city',
    theme: { accent: '#ffcc33' },
    palette: 'city',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#4a90d9', '#6aa8e2', '#94c2ec', '#c4dcf2', '#e4eef6'], { rng, sun: { x: 64, y: 30, r: 8, color: '#fff6c8', glow: '#cfe8fc' } });
    },
    layers: [
      { factor: 0.03, paint: (ctx, rng, W, H) => clouds(ctx, rng, { W, H, yMin: 14, yMax: 55, count: 8, color: '#ffffff', shade: '#d2e2f2' }) },
      { factor: 0.1, paint: (ctx, rng, W, H) => skyline(ctx, rng, { W, H, base: 120, color: '#a8bed8', windows: ['#c4d6ea'], litChance: 0.25, minH: 30, maxH: 74, spires: true }) },
      { factor: 0.22, paint: (ctx, rng, W, H) => skyline(ctx, rng, { W, H, base: 138, color: '#7f93b4', roof: '#97a9c6', windows: ['#a8c8e8', '#d8e8f8'], litChance: 0.45, minW: 16, maxW: 34, minH: 26, maxH: 64, roofs: true }) },
      { factor: 0.45, paint: (ctx, rng, W, H) => skyline(ctx, rng, { W, H, base: 156, color: '#5e6a88', roof: '#a0524a', windows: ['#8fb0d0', '#cfe0f0'], litChance: 0.5, minW: 22, maxW: 44, minH: 30, maxH: 70, roofs: true }) },
    ],
    paintGround: (ctx, rng, W, H, mat) => paintMaterials(ctx, rng, W, H, mat, 'city'),
  },

  {
    id: 'desert',
    name: 'Червоний каньйон',
    subtitle: 'Слікрок і обриви',
    description: 'Голий пісковик тримає шину як наждак. Великі скельні дропи, гепи над каньйоном і пісок, що «гальмує» колеса. Не перегрійся!',
    difficulty: 'red',
    lengthM: 1100,
    seed: 3313,
    times: { gold: 136, silver: 168 },
    gen: {
      surface: MAT.rock,
      grade: [0.05, 0.11],
      amp: 0.7,
      rough: 0.012,
      size: [0.45, 0.95],
      vCap: 12.5,
      checkpointEvery: 210,
      dropMat: MAT.rock,
      kickerMat: MAT.rock,
      gapBottom: MAT.rock,
      rockMat: MAT.rock,
      patchMat: MAT.sand,
      features: { drop: 1.8, gap: [0.4, 1.2], rockGarden: 1.4, table: 1.1, steep: 1, patch: 1, rollers: 0.8, compression: 0.8, climb: 0.4 },
      from: { gap: 0.2 },
    },
    tip: 'Перед дропом скинь швидкість і відкинься назад; приземляйся паралельно схилу.',
    features: ['скельні дропи', 'гепи над каньйоном', 'кам\'яні сади', 'пісок', 'круті спуски'],
    props: items(['saguaro', 2, { sink: 2 }], ['joshua', 1, { sink: 2 }], ['desertBush', 3, { sink: 2 }], ['boulderRed', 2, { sink: 3 }], ['skull', 1, { sink: 1 }]),
    propGap: [20, 80],
    weather: 'sand',
    dust: { default: ['#d98a54', '#e8a868', '#c47040'], sand: ['#f2c878', '#e0a860'] },
    music: 'desert',
    theme: { accent: '#ff8a3d' },
    palette: 'desert',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#3f7fc8', '#6a9ed4', '#a8bcd0', '#e8c49a', '#f6d8a8'], { rng, sun: { x: 236, y: 40, r: 11, color: '#fff6d8', glow: '#ffe6b0' } });
    },
    layers: [
      { factor: 0.05, paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 110, count: 4, minH: 26, maxH: 44, color: '#c8a090', shade: '#b8907e', flat: 0.9 }) },
      { factor: 0.14, paint: (ctx, rng, W, H) => canyonWall(ctx, rng, { W, H, base: 124, color: '#c06a48', light: '#d8845a', dark: '#9a4e34', minH: 24, maxH: 52 }) },
      { factor: 0.3, paint: (ctx, rng, W, H) => canyonWall(ctx, rng, { W, H, base: 142, color: '#a04a30', light: '#c46440', dark: '#7a3422', minH: 30, maxH: 66 }) },
    ],
    paintGround: (ctx, rng, W, H, mat) => paintMaterials(ctx, rng, W, H, mat, 'desert'),
  },

  {
    id: 'beach',
    name: 'Прибережні скелі',
    subtitle: 'Стежка над океаном',
    description: 'Стежка вздовж скель: дощаті настили над затоками, піщані дюни, гепи над водою і скельні дропи. Пісок тягне, а мокрі дошки ковзкі.',
    difficulty: 'red',
    lengthM: 1250,
    seed: 4421,
    times: { gold: 158, silver: 195 },
    gen: {
      surface: MAT.dirt,
      grade: [0.05, 0.1],
      amp: 0.6,
      rough: 0.008,
      size: [0.45, 0.95],
      vCap: 12,
      checkpointEvery: 210,
      dropMat: MAT.rock,
      kickerMat: MAT.dirt,
      gapBottom: MAT.water,
      bridgeWater: MAT.water,
      patchMat: MAT.sand,
      features: { bridge: 1.6, patch: 1.3, rollers: 1.3, gap: [0.3, 1.1], drop: 1.1, table: 1.2, rockGarden: 0.8, compression: 0.6, climb: 0.6, steep: 0.5 },
      from: { gap: 0.2 },
    },
    tip: 'Пісок гальмує колеса — перед гепом розганяйся заздалегідь, дуга монет підкаже швидкість.',
    features: ['настили над водою', 'дюни', 'пісок', 'гепи над водою', 'скельні дропи'],
    props: items(['palmTall', 2, { sink: 2 }], ['dunegrass', 4, { sink: 1 }], ['boulderGrey', 2, { sink: 3 }], ['seaShrub', 3, { sink: 2 }]),
    propGap: [14, 70],
    weather: null,
    dust: { default: ['#a08060', '#c0a07a'], sand: ['#fbe8b8', '#f2d8a0'] },
    music: 'beach',
    theme: { accent: '#4cd6ff' },
    palette: 'beach',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#2f8fe0', '#4ea8ec', '#7cc4f4', '#b0dcf8', '#dff0fa'], { rng, sun: { x: 70, y: 30, r: 9, color: '#fffbe0', glow: '#c8ecfc' } });
    },
    layers: [
      { factor: 0.03, paint: (ctx, rng, W, H) => clouds(ctx, rng, { W, H, yMin: 14, yMax: 52, count: 6, color: '#ffffff', shade: '#d0ecfa' }) },
      {
        factor: 0.06,
        paint: (ctx, rng, W, H) => {
          ridge(ctx, rng, { W, H, base: 100, amp: 8, color: '#7aa6c4', k: [1, 3] });
          sea(ctx, rng, { W, H, y: 102, colors: ['#2f8fd8', '#1f6aa8'], sparkle: '#a8e0ff' });
        },
      },
      { factor: 0.2, paint: (ctx, rng, W, H) => canyonWall(ctx, rng, { W, H, base: 150, color: '#8a8478', light: '#a8a296', dark: '#6a6458', minH: 6, maxH: 30, grass: '#6a9a4a' }) },
    ],
    paintGround: (ctx, rng, W, H, mat) => paintMaterials(ctx, rng, W, H, mat, 'beach'),
  },

  {
    id: 'snow',
    name: 'Альпійський спуск',
    subtitle: 'Сніг, лід і скелі',
    description: 'Високогір\'я: сніг тримає вдвічі гірше за ґрунт, а на льоду гальма майже не працюють. Круті кулуари, скелі й великі стрибки.',
    difficulty: 'black',
    lengthM: 1400,
    seed: 5531,
    times: { gold: 173, silver: 214 },
    gen: {
      surface: MAT.snow,
      grade: [0.07, 0.13],
      amp: 0.7,
      rough: 0.006,
      size: [0.5, 1],
      vCap: 11.5,
      checkpointEvery: 220,
      dropMat: MAT.rock,
      kickerMat: MAT.snow,
      gapBottom: MAT.rock,
      rockMat: MAT.rock,
      patchMat: MAT.ice,
      bridgeWater: MAT.ice,
      features: { steep: 1.4, rockGarden: 1.2, table: 1.3, drop: 1.3, patch: 1, bridge: 0.8, gap: [0.3, 1], rollers: 0.8, compression: 0.8, climb: 0.4, log: 0.5 },
      from: { gap: 0.25 },
    },
    tip: 'Сніг тримає вдвічі гірше, а на льоду гальма майже не працюють — гальмуй раніше.',
    features: ['сніг', 'лід', 'кулуари', 'скелі', 'великі стрибки'],
    props: items(['spruceSnow', 4, { sink: 3 }], ['pineSnow', 2, { sink: 3 }], ['boulderSnow', 2, { sink: 3 }], ['snowBush', 2, { sink: 2 }], ['skiPole', 1, { sink: 2 }]),
    propGap: [10, 50],
    weather: 'snow',
    fog: { color: '236, 242, 250', amount: 0.25 },
    dust: { default: ['#ffffff', '#e4ecf6', '#cfdcec'], rock: ['#9aa0b0', '#c8ccd8'] },
    music: 'snow',
    theme: { accent: '#9fe6ff' },
    palette: 'snow',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#3a6ab0', '#5a88c4', '#86a8d6', '#b4c8e4', '#e0e8f4'], { rng });
    },
    layers: [
      { factor: 0.04, paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 112, count: 5, minH: 56, maxH: 88, color: '#b4c4dc', shade: '#94a8c8', snow: '#ffffff' }) },
      { factor: 0.12, paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 128, count: 8, minH: 34, maxH: 60, color: '#7f94b8', shade: '#6a7ea4', snow: '#eef4fc' }) },
      { factor: 0.3, paint: (ctx, rng, W, H) => forestRow(ctx, rng, { W, H, base: 144, color: '#3a5a5a', dark: '#2f4c4e', minH: 28, maxH: 50, density: 1, snow: '#e8f0f8' }) },
    ],
    paintGround: (ctx, rng, W, H, mat) => paintMaterials(ctx, rng, W, H, mat, 'snow'),
  },

  {
    id: 'night',
    name: 'Нічний фрірайд',
    subtitle: 'Дощ і лише фара попереду',
    description: 'Найважча траса: темрява, дощ і мокре коріння. Видно лише те, що освітлює фара. Усі фічі — найбільшого розміру.',
    difficulty: 'double',
    lengthM: 1600,
    seed: 6619,
    times: { gold: 194, silver: 240 },
    gen: {
      surface: MAT.dirt,
      grade: [0.06, 0.12],
      amp: 0.65,
      rough: 0.01,
      size: [0.6, 1],
      vCap: 11.5,
      checkpointEvery: 220,
      dropMat: MAT.wood,
      kickerMat: MAT.dirt,
      gapBottom: MAT.water,
      patchMat: MAT.mud,
      features: { table: 1.5, drop: 1.4, gap: 1, rockGarden: 1.2, roots: 1.2, log: 0.8, bridge: 1, steep: 1, rollers: 1, compression: 0.7, patch: 0.7, water: 0.5, climb: 0.4 },
    },
    tip: 'Фара світить недалеко: стеж за жовтими знаками — вони попереджають про стрибки.',
    features: ['усе й одразу', 'мокре коріння', 'дощ', 'темрява'],
    props: items(['pineTall', 4, { sink: 3 }], ['spruce', 3, { sink: 3 }], ['fern', 3, { sink: 2 }], ['lanternPost', 1, { light: { r: 40, color: '255, 196, 120', dx: 4, dy: 4 }, sink: 2 }], ['boulder', 1]),
    propGap: [8, 44],
    weather: 'rain',
    darkness: 0.8,
    dust: { default: ['#4a3420', '#5e4028'], mud: ['#3a2814', '#4a3018'] },
    music: 'night',
    theme: { accent: '#ff4fd8' },
    palette: 'night',
    paintSky(ctx, W, H, rng) {
      paintSky(ctx, W, H, ['#06081a', '#0c1028', '#151a3a', '#222650'], { rng, stars: 40, moon: { x: 262, y: 28, r: 9 } });
    },
    layers: [
      { factor: 0.06, paint: (ctx, rng, W, H) => peaks(ctx, rng, { W, H, base: 116, count: 6, minH: 30, maxH: 56, color: '#141a34', shade: '#10152c' }) },
      { factor: 0.18, paint: (ctx, rng, W, H) => forestRow(ctx, rng, { W, H, base: 130, color: '#0e1424', dark: '#0a0f1c', minH: 30, maxH: 52, density: 1.2 }) },
      { factor: 0.4, paint: (ctx, rng, W, H) => forestRow(ctx, rng, { W, H, base: 148, color: '#080b16', dark: '#05070f', minH: 44, maxH: 80, density: 0.9 }) },
    ],
    paintGround: (ctx, rng, W, H, mat) => paintMaterials(ctx, rng, W, H, mat, 'night'),
  },
];

export const getLocation = (id) => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
export const locationIndex = (id) => LOCATIONS.findIndex((l) => l.id === id);
