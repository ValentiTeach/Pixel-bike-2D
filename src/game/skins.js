// Скіни велосипедиста для «Гаража». palette перевизначає кольори спрайта 'bike'
// (f — рама, j — джерсі, J — смуга, H — шолом, h — отвори шолома, p — шорти, L — взуття).

export const SKINS = [
  { id: 'classic', name: 'Класика', price: 0, palette: {} },
  {
    id: 'forest',
    name: 'Лісник',
    price: 40,
    palette: { f: '#3fb86a', j: '#2f8a4a', J: '#d9f27a', H: '#e8d9a8', p: '#3a2a1a' },
  },
  {
    id: 'ocean',
    name: 'Океан',
    price: 80,
    palette: { f: '#3f7fe0', j: '#2fb8d8', J: '#ffffff', H: '#1f4fa0', h: '#9fe6ff', p: '#1a2a4a' },
  },
  {
    id: 'sunset',
    name: 'Захід сонця',
    price: 140,
    palette: { f: '#ff7a1a', j: '#a040c0', J: '#ffcc33', H: '#ff4d5e', h: '#ffd27a', p: '#2a1a3a' },
  },
  {
    id: 'ninja',
    name: 'Ніндзя',
    price: 200,
    palette: { f: '#2a2838', j: '#1d1b26', J: '#e8383d', H: '#1d1b26', h: '#e8383d', p: '#141220', L: '#2a2838' },
  },
  {
    id: 'neon',
    name: 'Неон',
    price: 280,
    palette: { f: '#ff4fd8', j: '#4cf0ff', J: '#ff4fd8', H: '#b6ff4f', h: '#1d1b26', p: '#3a1a5a', L: '#b6ff4f' },
  },
  {
    id: 'gold',
    name: 'Чемпіон',
    price: 450,
    palette: { f: '#ffcc33', j: '#ffd23f', J: '#ffffff', H: '#fff3a0', h: '#b8860b', p: '#b8860b', L: '#ffffff' },
  },
];

export const getSkin = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];
