// Піксельні спрайти у вигляді «матриць» рядків.
// Кожен символ — ключ палітри, '.' — прозорий піксель.
// frames — масив кадрів анімації (усі однакового розміру).
// palettes — альтернативні палітри (перефарбування), назва спрайта тоді 'coin:silver'.
// Решта графіки (декор, знаки, велосипедист) малюється кодом — див. decorSprites.js і bikeSprite.js.

export const MATRIX_SPRITES = {
  coin: {
    palette: { k: '#8a4b08', W: '#fffbe0', Y: '#ffd23f', y: '#e0a21a' },
    frames: [[
      '..kkkk..',
      '.kWYYYk.',
      'kWYYYYyk',
      'kYYyyYyk',
      'kYYyyYyk',
      'kYYYYyyk',
      '.kyyyyk.',
      '..kkkk..',
    ]],
  },
};
