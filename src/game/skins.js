// Екіпірування райдера для «Гаража» (джерсі, шолом, шорти, взуття, рукавички, наколінники).
// Ключі палітри: j — джерсі, J — смуга, H — шолом, h — акцент шолома, p — шорти/штани,
// L — взуття, g — рукавички, k — наколінники, s — шкіра. Колір рами задає велосипед (bikes.js).

export const SKINS = [
  { id: 'classic', name: 'Класика', price: 0, palette: {} },
  {
    id: 'forest',
    name: 'Лісник',
    price: 40,
    palette: { j: '#3f7a3a', J: '#d9f27a', H: '#e8d9a8', h: '#5a4a2a', p: '#4a3a24', L: '#5a4632', g: '#3a2a1a', k: '#2a2a20' },
  },
  {
    id: 'ocean',
    name: 'Океан',
    price: 80,
    palette: { j: '#2fb8d8', J: '#ffffff', H: '#1f4fa0', h: '#9fe6ff', p: '#1a2a4a', L: '#e8e8ee', g: '#1a2a4a' },
  },
  {
    id: 'sunset',
    name: 'Захід сонця',
    price: 140,
    palette: { j: '#a040c0', J: '#ffcc33', H: '#ff4d5e', h: '#ffd27a', p: '#2a1a3a', L: '#ff7a1a', g: '#ff7a1a' },
  },
  {
    id: 'ninja',
    name: 'Ніндзя',
    price: 200,
    palette: { j: '#2a2838', J: '#e8383d', H: '#1d1b26', h: '#e8383d', p: '#141220', L: '#2a2838', g: '#e8383d', k: '#e8383d' },
  },
  {
    id: 'neon',
    name: 'Неон',
    price: 280,
    palette: { j: '#4cf0ff', J: '#ff4fd8', H: '#b6ff4f', h: '#1d1b26', p: '#3a1a5a', L: '#b6ff4f', g: '#ff4fd8', k: '#3a1a5a' },
  },
  {
    id: 'gold',
    name: 'Чемпіон',
    price: 450,
    palette: { j: '#ffd23f', J: '#ffffff', H: '#fff3a0', h: '#b8860b', p: '#1d1b26', L: '#ffffff', g: '#ffd23f', k: '#b8860b' },
  },
];

export const getSkin = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];
