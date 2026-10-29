// Велосипеди гаража. Усі числа — справжні характеристики (метри, кілограми, ньютони, вати),
// тож відмінності між моделями відчуваються так само, як у житті:
//  • хардтейл легкий і швидкий на педалях, але жорсткий на камінні й приземленнях;
//  • даунхіл важкий і повільний на рівному, зате ковтає дропи й стабільний на швидкості;
//  • дьорт-джампер короткий і верткий — найкращий для фліпів, але має одну передачу;
//  • фетбайк тримає сніг і пісок, а е-байк допомагає мотором до 25 км/год (як за законом ЄС).
//
// Геометрія задається відносно каретки (BB): x — вперед, y — вниз (як на екрані).

export const RIDER_MASS = 75; // кг з екіпіруванням

const base = {
  wheelR: 0.37, // зовнішній радіус колеса з покришкою, м (29″)
  tire: 2.4, // ширина покришки, дюйми (впливає на малюнок і зчеплення)
  wheelbase: 1.22,
  chainstay: 0.44, // від каретки до осі заднього колеса
  hubRise: 0.03, // осі коліс вище каретки на стільки, м
  headAngle: 65.5, // кут рульової колони, °
  travelF: 0.14, // хід вилки, м
  travelR: 0.13, // хід заднього амортизатора (0 — хардтейл)
  mass: 14.5, // кг
  power: 650, // Вт — потужність райдера при повному «газі»
  force: 290, // Н — максимальне зусилля на колесі з місця
  topSpeed: 13.5, // м/с — далі «закінчуються передачі» (спін-аут)
  assist: 0, // Н — допомога мотора (е-байк)
  brake: 1, // множник гальм
  grip: 1, // множник зчеплення
  gripMat: null, // множники зчеплення на окремих матеріалах
  rollMat: null, // множники опору кочення
  air: 1, // наскільки легко крутити байк у повітрі
  stability: 1, // демпфування розгойдування на землі
  cda: 0.45, // аеродинамічний опір, м²
  damping: 0.42, // відносне демпфування підвіски
  fullFace: false, // інтегральний шолом
  colors: { frame: '#e8383d', frame2: '#a8262a', decal: '#ffffff', fork: '#2b2b38', stanchion: '#d8dce6', shock: '#ffb000', rim: '#2a2a34' },
};

export const BIKES = [
  {
    ...base,
    id: 'trail',
    name: 'Трейл 130',
    kind: 'Трейл',
    price: 0,
    description: 'Універсал: 130 мм ходу, колеса 29″. Однаково добре їде вгору, вниз і стрибає.',
  },
  {
    ...base,
    id: 'hardtail',
    name: 'Хардтейл XC',
    kind: 'Крос-кантрі',
    price: 180,
    description: 'Легкий і швидкий на педалях, але без задньої підвіски: камінь і жорсткі приземлення відчуваються.',
    mass: 10.5,
    wheelbase: 1.15,
    chainstay: 0.43,
    headAngle: 68.5,
    travelF: 0.1,
    travelR: 0,
    power: 700,
    force: 300,
    topSpeed: 14.5,
    tire: 2.2,
    cda: 0.4,
    air: 0.95,
    colors: { frame: '#3f7fe0', frame2: '#24509a', decal: '#ffffff', fork: '#1d1b26', stanchion: '#c9a24a', shock: '#3f7fe0', rim: '#1d1b26' },
  },
  {
    ...base,
    id: 'dirt',
    name: 'Дьорт-джампер',
    kind: 'Дьорт / стріт',
    price: 260,
    description: 'Коротка жорстка рама і колеса 26″ — крутиться в повітрі найлегше. Одна передача: на швидкості не розженешся.',
    wheelR: 0.335,
    tire: 2.3,
    mass: 12,
    wheelbase: 1.06,
    chainstay: 0.39,
    hubRise: 0.0,
    headAngle: 69,
    travelF: 0.1,
    travelR: 0,
    power: 620,
    force: 320,
    topSpeed: 10.5,
    air: 1.45,
    stability: 0.85,
    colors: { frame: '#b6ff4f', frame2: '#6a9a2a', decal: '#1d1b26', fork: '#1d1b26', stanchion: '#d8dce6', shock: '#1d1b26', rim: '#e8383d' },
  },
  {
    ...base,
    id: 'fat',
    name: 'Фетбайк',
    kind: 'Сніг і пісок',
    price: 320,
    description: 'Покришки 4.8″ тримають сніг, пісок і багно, але на твердому котяться важко.',
    wheelR: 0.38,
    tire: 4.8,
    mass: 15.5,
    wheelbase: 1.18,
    headAngle: 67,
    travelF: 0.12,
    travelR: 0,
    power: 640,
    topSpeed: 12.5,
    gripMat: { snow: 1.55, sand: 1.5, mud: 1.35, ice: 1.4, grass: 1.15, wood: 1.1 },
    rollMat: { dirt: 1.5, concrete: 1.8, rock: 1.4, wood: 1.4, sand: 0.55, snow: 0.6, mud: 0.7 },
    air: 0.85,
    colors: { frame: '#ff7a1a', frame2: '#b8540e', decal: '#1d1b26', fork: '#2b2b38', stanchion: '#d8dce6', shock: '#ff7a1a', rim: '#d8dce6' },
  },
  {
    ...base,
    id: 'enduro',
    name: 'Ендуро 170',
    kind: 'Ендуро',
    price: 450,
    description: '170/160 мм ходу і похила геометрія: швидкий на технічних спусках і великих дропах.',
    mass: 16,
    wheelbase: 1.26,
    chainstay: 0.44,
    headAngle: 64,
    travelF: 0.17,
    travelR: 0.16,
    power: 640,
    topSpeed: 14,
    brake: 1.15,
    air: 0.9,
    stability: 1.15,
    fullFace: true,
    colors: { frame: '#2fb8a8', frame2: '#1a7a70', decal: '#ffcc33', fork: '#e8e8ee', stanchion: '#c9a24a', shock: '#ffcc33', rim: '#1d1b26' },
  },
  {
    ...base,
    id: 'downhill',
    name: 'Даунхіл 200',
    kind: 'Даунхіл',
    price: 700,
    description: '200 мм ходу, подвійна корона вилки й потужні гальма. Ковтає все, але на рівному — важкий.',
    wheelR: 0.355,
    tire: 2.5,
    mass: 17.5,
    wheelbase: 1.3,
    chainstay: 0.445,
    hubRise: 0.0,
    headAngle: 63,
    travelF: 0.2,
    travelR: 0.2,
    power: 600,
    force: 270,
    topSpeed: 15.5,
    brake: 1.3,
    air: 0.78,
    stability: 1.3,
    cda: 0.48,
    fullFace: true,
    dualCrown: true,
    colors: { frame: '#1d1b26', frame2: '#0e0c14', decal: '#e8383d', fork: '#e8383d', stanchion: '#c9a24a', shock: '#e8383d', rim: '#1d1b26' },
  },
  {
    ...base,
    id: 'ebike',
    name: 'Е-ендуро',
    kind: 'Електро',
    price: 950,
    description: 'Мотор допомагає педалювати до 25 км/год — підйоми стають легкими. Але 24 кг відчутні в повітрі.',
    mass: 24,
    wheelbase: 1.27,
    headAngle: 64.5,
    travelF: 0.16,
    travelR: 0.15,
    assist: 260,
    topSpeed: 14,
    brake: 1.2,
    air: 0.7,
    stability: 1.2,
    fullFace: true,
    battery: true,
    colors: { frame: '#9aa3b5', frame2: '#5a6274', decal: '#4cf0ff', fork: '#1d1b26', stanchion: '#c9a24a', shock: '#4cf0ff', rim: '#1d1b26' },
  },
];

export const getBike = (id) => BIKES.find((b) => b.id === id) ?? BIKES[0];

// Рейтинги 1–5 для гаража (рахуються з характеристик — щоб не розходились із фізикою).
export function bikeStats(b) {
  const r = (v, lo, hi) => Math.max(1, Math.min(5, Math.round(1 + ((v - lo) / (hi - lo)) * 4)));
  const total = b.mass + RIDER_MASS;
  return [
    { id: 'speed', label: 'Швидкість', value: r(b.topSpeed, 10, 15.5) },
    { id: 'accel', label: 'Розгін', value: r((b.force + b.assist * 0.6) / total, 2.9, 4.6) },
    { id: 'travel', label: 'Підвіска', value: r(b.travelF + b.travelR, 0.1, 0.4) },
    { id: 'air', label: 'Трюки', value: r(b.air, 0.7, 1.45) },
    { id: 'grip', label: 'Зчеплення', value: r(b.grip * (b.tire / 2.4) ** 0.25 * (b.stability ** 0.3), 0.95, 1.25) },
  ];
}
