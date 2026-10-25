// Піксельні спрайти у вигляді «матриць» рядків.
// Кожен символ — ключ палітри, '.' — прозорий піксель.
// frames — масив кадрів анімації (усі однакового розміру).
// palettes — альтернативні палітри (перефарбування), назва спрайта тоді 'rock:snow'.

export const MATRIX_SPRITES = {
  // Птахи летять назустріч на висоті стрибка — під ними треба проїхати, а не стрибати.
  bird: {
    palette: { w: '#f4f4f8', K: '#1d1b26', o: '#ffb347' },
    palettes: {
      crow: { w: '#2a2838', K: '#ffe14d', o: '#e0b020' },
      eagle: { w: '#8a5a30', K: '#1d1b26', o: '#ffd23f' },
      bat: { w: '#6a4a8a', K: '#ff4d5e', o: '#6a4a8a' },
      owl: { w: '#a8845a', K: '#ffe14d', o: '#e0b020' },
    },
    frames: [
      [
        'w.......w',
        'ww.....ww',
        '.wwwwwww.',
        'oKwwwwww.',
        '...www...',
        '.........',
      ],
      [
        '.........',
        '..wwwww..',
        'oKwwwwwww',
        '.wwwwwww.',
        'ww.....ww',
        'w.......w',
      ],
    ],
  },

  cone: {
    palette: { o: '#ff7a1a', w: '#ffffff', d: '#b34700', k: '#3a2a20' },
    frames: [[
      '...o...',
      '...o...',
      '..ooo..',
      '..www..',
      '..ooo..',
      '.ooooo.',
      '.wwwww.',
      'ooooooo',
      'ddddddd',
    ]],
  },

  rock: {
    palette: { k: '#2e2c38', G: '#b9b6c9', g: '#8b879c', d: '#625e74' },
    palettes: {
      sand: { k: '#5a3d22', G: '#e0b47a', g: '#b8834d', d: '#8a5c33' },
      snow: { k: '#3d4a63', G: '#ffffff', g: '#a9b8cf', d: '#73829e' },
    },
    frames: [[
      '...kkkk...',
      '..kGGggk..',
      '.kGGgggdk.',
      'kGgggggddk',
      'kggggggddk',
      'kgggggdddk',
      '.kgddddddk',
      '..kkkkkkk.',
    ]],
  },

  rockSmall: {
    palette: { k: '#2e2c38', G: '#b9b6c9', g: '#8b879c', d: '#625e74' },
    palettes: {
      sand: { k: '#7a5532', G: '#f0c890', g: '#c99a60', d: '#a87a44' },
      snow: { k: '#7d8db0', G: '#ffffff', g: '#c9d6ea', d: '#9fb0cc' },
    },
    frames: [[
      '.kkkk.',
      'kGggdk',
      'kggddk',
      'kgdddk',
      '.kkkk.',
    ]],
  },

  stump: {
    palette: { k: '#2a1a10', L: '#d9a066', l: '#a86b32', b: '#6b4226', B: '#4a2c17' },
    frames: [[
      '..kkkkkk..',
      '.kLLLLLLk.',
      'kLlLLLLlLk',
      'kLLlllLLLk',
      'kLlLLLLlLk',
      '.kLLLLLLk.',
      'kbkkkkkkbk',
      'kbbbBbbbbk',
      '.kbbBbbbk.',
      '..kkkkkk..',
    ]],
  },

  deer: {
    palette: { b: '#5a3a1e', B: '#a8683a', w: '#f1dcc0', k: '#2a1a10' },
    frames: [
      [
        '..........b.b.',
        '...........bb.',
        '..........BBB.',
        '..........BBBk',
        '..BBBBBBBBBB..',
        '.BBBBBBBBBBB..',
        '.BwBBBBBBBB...',
        '..BBBBBBBBB...',
        '..B.B....B.B..',
        '..B.B....B.B..',
        '..k.k....k.k..',
      ],
      [
        '..........b.b.',
        '...........bb.',
        '..........BBB.',
        '..........BBBk',
        '..BBBBBBBBBB..',
        '.BBBBBBBBBBB..',
        '.BwBBBBBBBB...',
        '..BBBBBBBBB...',
        '..B..B..B..B..',
        '..B..B..B..B..',
        '..k..k..k..k..',
      ],
    ],
  },

  pedestrian: {
    palette: { h: '#3a2418', s: '#e8b48a', c: '#3f7fe0', p: '#2b2a40', k: '#151420' },
    palettes: {
      red: { h: '#f2d16b', c: '#e0483f' },
      green: { h: '#1a1a1a', c: '#3fb86a' },
    },
    frames: [
      [
        '..hhh..',
        '..sss..',
        '...s...',
        '.ccccc.',
        's.ccc.s',
        's.ccc.s',
        '..ccc..',
        '..ppp..',
        '.p...p.',
        'kk...kk',
      ],
      [
        '..hhh..',
        '..sss..',
        '...s...',
        '.ccccc.',
        's.ccc.s',
        's.ccc.s',
        '..ccc..',
        '..ppp..',
        '..p.p..',
        '..kk...',
      ],
    ],
  },

  cat: {
    palette: { k: '#77728f', Y: '#ffe14d' },
    frames: [
      [
        'k......k.k',
        'k......kkk',
        '.k.....kYk',
        '.kkkkkkkkk',
        '..kkkkkkk.',
        '..k.k..k.k',
      ],
      [
        'k......k.k',
        'k......kkk',
        '.k.....kYk',
        '.kkkkkkkkk',
        '..kkkkkkk.',
        '...kk..kk.',
      ],
    ],
  },

  cactus: {
    palette: { G: '#7ed957', g: '#3e9b3a', d: '#256b25', s: '#c9975a' },
    frames: [[
      '...dgd...',
      '...gGg...',
      'd..gGg...',
      'g..gGg..d',
      'gd.gGg..g',
      'ggggGg.dg',
      '.gggGgggg',
      '...gGggg.',
      '...gGg...',
      '...gGg...',
      '...gGg...',
      '..sgGgs..',
      '.sssssss.',
      '..sssss..',
    ]],
  },

  cactusSmall: {
    palette: { G: '#7ed957', g: '#3e9b3a', s: '#c9975a' },
    frames: [[
      '...g...',
      '..gGg..',
      'g.gGg..',
      'g.gGg.g',
      'gggGg.g',
      '..gGggg',
      '..gGg..',
      '..gGg..',
      '.sssss.',
    ]],
  },

  bones: {
    palette: { w: '#f6efdc', k: '#5a4a3a' },
    frames: [[
      'w........w',
      'ww.wwww.ww',
      '.wwwwwwww.',
      '..wkwwkw..',
      '..wwwwww..',
      '...wwww...',
      '...wkkw...',
      '....ww....',
    ]],
  },

  tumbleweed: {
    palette: { b: '#8a6a3a' },
    rotateFrames: true, // кадри = повороти на 0/90/180/270°
    frames: [[
      '...bbbb...',
      '.bb.b..bb.',
      '.b.bbbb.b.',
      'b.b.b..b.b',
      'bb.b.bb.bb',
      'b.bb.b.b.b',
      'b.b..bb.bb',
      '.b.bb.b.b.',
      '.bb..b.bb.',
      '...bbbb...',
    ]],
  },

  snowman: {
    palette: { w: '#f4f8ff', S: '#b8c8e0', k: '#22202a', o: '#ff8a1c', r: '#d8323c' },
    frames: [[
      '...kkkkk...',
      '...kkkkk...',
      '..kkkkkkk..',
      '...wwwww...',
      '..wwkwkww..',
      '..wwwooww..',
      '...wwwww...',
      '..rrrrrrr..',
      '.wwwwwrwww.',
      'wwwwkwwrwww',
      'wwwwkwwwwSS',
      'wwwwwwwwwSS',
      '.wwwwwwwSS.',
      '..SSSSSSS..',
    ]],
  },

  snowball: {
    palette: { w: '#f4f8ff', W: '#ffffff', S: '#a9bcd8', d: '#7d8db0' },
    rotateFrames: true,
    frames: [[
      '..wwwww..',
      '.wWWwwwS.',
      'wWWwwwdwS',
      'wWwwwwwSS',
      'wwwdwwwSS',
      'wwwwwwSSS',
      'SwwwwSSSS',
      '.SSSSSSS.',
      '..SSSSS..',
    ]],
  },

  sandcastle: {
    palette: { s: '#f0d28c', d: '#8c6a3a', S: '#c9a55e', r: '#e8483c' },
    frames: [[
      '..r......r..',
      '..rr.....rr.',
      '..s......s..',
      '.sss....sss.',
      '.sss.ss.sss.',
      '.ssssssssss.',
      '.ssdssssdss.',
      '.ssssddssss.',
      '.ssssddssss.',
      'SSSSSSSSSSSS',
    ]],
  },

  bucket: {
    palette: { b: '#3fa9f5', B: '#1f6fb5', W: '#bfe6ff', k: '#5c5c6a' },
    frames: [[
      '..kkkk..',
      '.k....k.',
      'BBBBBBBB',
      'BbbbbbbB',
      '.bbbbbb.',
      '.bbWbbb.',
      '.bbbbbb.',
      '..bbbb..',
    ]],
  },

  crab: {
    palette: { r: '#e8483c', R: '#ff7a5c', k: '#1a1824' },
    frames: [
      [
        'rr.......rr',
        'r.r.k.k.r.r',
        '.rrRRRRRrr.',
        '..RRRRRRR..',
        '.rRRRRRRRr.',
        'r.r.r.r.r.r',
      ],
      [
        '.rr.....rr.',
        'rr..k.k..rr',
        '.rrRRRRRrr.',
        '..RRRRRRR..',
        '.rRRRRRRRr.',
        '.r.r.r.r.r.',
      ],
    ],
  },

  ball: {
    palette: { r: '#ff4d5e', b: '#3f7fe0', w: '#ffffff', W: '#fffbe0', y: '#ffd23f', g: '#3fb86a' },
    frames: [[
      '..rrwbb..',
      '.rrrwbbb.',
      'rrrrwbbbb',
      'rrrwwwbbb',
      'wwwwWwwww',
      'yyywwwggg',
      'yyyywgggg',
      '.yyywggg.',
      '..yywgg..',
    ]],
  },

  hydrant: {
    palette: { r: '#e8383d', R: '#ff8a8a', d: '#7a1c1c' },
    frames: [[
      '.rrr.',
      'rRrrr',
      '.rrr.',
      'rrrrr',
      '.rrr.',
      '.rrr.',
      'ddddd',
    ]],
  },

  grass: {
    palette: { g: '#2f6b2a' },
    palettes: { sand: { g: '#7c9a3a' }, snow: { g: '#5f7f78' } },
    frames: [[
      '.g.g.',
      'g.gg.',
      'gggg.',
      '.ggg.',
    ]],
  },

  flowers: {
    palette: { r: '#ff5b7a', Y: '#ffe14d', y: '#fff3a0', W: '#ffffff', g: '#2f6b2a' },
    palettes: { blue: { r: '#6fa8ff', y: '#d9b3ff' } },
    frames: [[
      '.r...y.',
      'rYr.yWy',
      '.r...y.',
      '..g.g..',
      '...g...',
    ]],
  },

  shell: {
    palette: { p: '#f7a8b8', P: '#ffd9e0' },
    frames: [[
      '.ppp.',
      'pPpPp',
      'ppppp',
      '.p.p.',
    ]],
  },

  starfish: {
    palette: { o: '#ff8a3d', O: '#ffd27a' },
    frames: [[
      '...o...',
      '...o...',
      'ooooooo',
      '.ooOoo.',
      '..ooo..',
      '.oo.oo.',
      'o.....o',
    ]],
  },

  // ---- Бонуси ----
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

  heart: {
    palette: { k: '#5a0a1a', W: '#ffd0d8', r: '#ff3b5c' },
    palettes: { empty: { k: '#2a2440', W: '#5a5478', r: '#3d3658' } },
    frames: [[
      '.kk.kk.',
      'kWrkrrk',
      'krrrrrk',
      'krrrrrk',
      '.krrrk.',
      '..krk..',
      '...k...',
    ]],
  },

  shield: {
    palette: { k: '#0b2a4a', B: '#4cd6ff', b: '#1f8fd8', W: '#e6fbff' },
    frames: [[
      '.kkkkkkk.',
      'kBBBBBBBk',
      'kBWbbbbBk',
      'kBWbbbbBk',
      'kBbbbbbBk',
      '.kBbbbBk.',
      '.kBbbbBk.',
      '..kBbBk..',
      '...kBk...',
      '....k....',
    ]],
  },

  // ---- Іконки інтерфейсу ----
  star: {
    palette: { y: '#ffcc33', Y: '#fff3a0' },
    palettes: { empty: { y: '#3d3658', Y: '#4d4668' } },
    frames: [[
      '....y....',
      '...yyy...',
      '...yYy...',
      'yyyyYyyyy',
      '.yyYYYyy.',
      '..yyyyy..',
      '..yyyyy..',
      '.yyy.yyy.',
      '.yy...yy.',
    ]],
  },

  lock: {
    palette: { k: '#9aa3b5', y: '#ffcc33', Y: '#fff3a0', d: '#7a5a10' },
    frames: [[
      '..kkk..',
      '.k...k.',
      '.k...k.',
      'yyyyyyy',
      'yYyyyyy',
      'yyydyyy',
      'yyydyyy',
      'yyyyyyy',
    ]],
  },

  flag: {
    palette: { p: '#c9c9d9', w: '#ffffff', k: '#1d1b26' },
    frames: [[
      'pwkwkw.',
      'pkwkwk.',
      'pwkwkw.',
      'pkwkwk.',
      'p......',
      'p......',
      'p......',
      'p......',
    ]],
  },

  iconSlow: {
    palette: { b: '#5fa8ff', W: '#e6f3ff' },
    frames: [[
      '...b...',
      '..bbb..',
      '.bbbbb.',
      'bbWbbbb',
      'bWbbbbb',
      '.bbbbb.',
      '..bbb..',
    ]],
  },

  iconSlip: {
    palette: { w: '#bff0ff' },
    frames: [[
      '...w...',
      '.w.w.w.',
      '..www..',
      'wwwwwww',
      '..www..',
      '.w.w.w.',
      '...w...',
    ]],
  },
};
