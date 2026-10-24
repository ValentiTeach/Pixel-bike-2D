// Процедурні піксельні спрайти: машини, дерева, будинки, калюжі тощо.
// Їх зручніше «намалювати кодом», ніж вручну матрицею. Кожен запис: { w, h, draw(ctx, rng) }.
// Малюємо лише цілими прямокутниками без згладжування — тож стиль лишається піксельним.

const px = (ctx, x, y, c, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

// Перебирає пікселі «хвилястого» еліпса. cb(x, y, edge, nx, ny)
function forEllipse(w, h, rng, wobble, cb) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const rx = w / 2;
  const ry = h / 2;
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  const inside = (x, y) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    const a = Math.atan2(dy, dx);
    const f = 1 - wobble + wobble * (0.5 + 0.35 * Math.sin(3 * a + p1) + 0.15 * Math.sin(5 * a + p2));
    return dx * dx + dy * dy <= f * f;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      cb(x, y, edge, (x - cx) / rx, (y - cy) / ry);
    }
  }
}

// Пляма-калюжа/багно/лід: край, основа, відблиски.
function blob({ w, h, edge, base, light, sparkle = [], wobble = 0.25, lines = 0 }) {
  return {
    w,
    h,
    draw(ctx, rng) {
      forEllipse(w, h, rng, wobble, (x, y, isEdge, nx, ny) => {
        let c = base;
        if (isEdge) c = edge;
        else if (nx < -0.1 && ny < -0.1 && rng.chance(0.35)) c = light;
        else if (sparkle.length && rng.chance(0.06)) c = rng.pick(sparkle);
        px(ctx, x, y, c);
      });
      for (let i = 0; i < lines; i++) {
        const ly = Math.round(h * (0.3 + 0.4 * rng.next()));
        const lx = Math.round(w * (0.25 + 0.3 * rng.next()));
        px(ctx, lx, ly, light, Math.max(2, Math.round(w * 0.25)), 1);
      }
    },
  };
}

// Крона з кількох «клубків» зі світлом зліва-згори і тінню справа-знизу.
function canopy(ctx, rng, ox, oy, w, h, colors, clumps = 5) {
  const [outline, dark, mid, light, hi] = colors;
  const circles = [];
  for (let i = 0; i < clumps; i++) {
    const r = rng.range(Math.min(w, h) * 0.24, Math.min(w, h) * 0.36);
    circles.push({
      x: rng.range(r, w - r),
      y: rng.range(r, h - r),
      r,
    });
  }
  circles.push({ x: w / 2, y: h / 2, r: Math.min(w, h) * 0.38 });
  const owner = (x, y) => {
    let best = null;
    for (const c of circles) {
      const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
      if (d <= c.r && (!best || c.y > best.c.y)) best = { c, d };
    }
    return best;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = owner(x, y);
      if (!o) continue;
      const edge = !owner(x - 1, y) || !owner(x + 1, y) || !owner(x, y - 1) || !owner(x, y + 1);
      const lx = (x + 0.5 - o.c.x) / o.c.r;
      const ly = (y + 0.5 - o.c.y) / o.c.r;
      const lit = -(lx + ly) * 0.7 + rng.range(-0.25, 0.25);
      let c = mid;
      if (edge) c = outline;
      else if (lit > 0.75) c = hi;
      else if (lit > 0.25) c = light;
      else if (lit < -0.45) c = dark;
      px(ctx, ox + x, oy + y, c);
    }
  }
}

function car(body, shade, light, roof, { taxi = false, night = false } = {}) {
  return {
    w: 16,
    h: 28,
    draw(ctx) {
      const tire = '#15141c';
      // колеса
      px(ctx, 0, 4, tire, 2, 5);
      px(ctx, 14, 4, tire, 2, 5);
      px(ctx, 0, 19, tire, 2, 5);
      px(ctx, 14, 19, tire, 2, 5);
      // корпус із заокругленими кутами
      px(ctx, 2, 0, body, 12, 1);
      px(ctx, 1, 1, body, 14, 26);
      px(ctx, 2, 27, body, 12, 1);
      px(ctx, 1, 2, light, 1, 24);
      px(ctx, 14, 2, shade, 1, 24);
      // фари і стопи
      const head = night ? '#fffbd0' : '#f6f2c8';
      px(ctx, 3, 0, head, 2, 1);
      px(ctx, 11, 0, head, 2, 1);
      px(ctx, 3, 27, '#ff3b3b', 2, 1);
      px(ctx, 11, 27, '#ff3b3b', 2, 1);
      // капот: лінії
      px(ctx, 4, 3, shade, 8, 1);
      // лобове скло
      px(ctx, 3, 8, '#2a3a5a', 10, 4);
      px(ctx, 4, 8, '#9fd4ff', 8, 3);
      px(ctx, 4, 8, '#e6f6ff', 2, 1);
      // дзеркала
      px(ctx, 0, 9, body, 1, 2);
      px(ctx, 15, 9, shade, 1, 2);
      // дах
      px(ctx, 3, 12, roof, 10, 7);
      px(ctx, 3, 12, light, 10, 1);
      if (taxi) {
        px(ctx, 5, 14, '#1d1b26', 6, 3);
        px(ctx, 5, 14, '#ffffff', 1, 1);
        px(ctx, 7, 14, '#ffffff', 1, 1);
        px(ctx, 9, 14, '#ffffff', 1, 1);
        px(ctx, 6, 15, '#ffffff', 1, 1);
        px(ctx, 8, 15, '#ffffff', 1, 1);
        px(ctx, 10, 15, '#ffffff', 1, 1);
      }
      // заднє скло
      px(ctx, 3, 19, '#2a3a5a', 10, 3);
      px(ctx, 4, 19, '#6fa0d0', 8, 2);
      // багажник
      px(ctx, 4, 24, shade, 8, 1);
    },
  };
}

function umbrella(a, b) {
  return {
    w: 18,
    h: 18,
    draw(ctx) {
      const c = 8.5;
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 18; x++) {
          const dx = x - c;
          const dy = y - c;
          const d = Math.hypot(dx, dy);
          if (d > 8.6) continue;
          const ang = Math.atan2(dy, dx) + Math.PI;
          const seg = Math.floor((ang / (Math.PI * 2)) * 8);
          let col = seg % 2 ? a : b;
          if (d > 7.6) col = '#2a2440';
          else if (dx + dy < -6 && d > 5) col = '#ffffff';
          px(ctx, x, y, col);
        }
      }
      px(ctx, 8, 8, '#2a2440', 2, 2);
    },
  };
}

function tree(colors, w = 22, h = 24) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const tw = 4;
      const tx = Math.floor(w / 2 - tw / 2);
      px(ctx, tx, h - 7, '#3a2414', tw, 7);
      px(ctx, tx + 1, h - 7, '#6b4226', 2, 6);
      canopy(ctx, rng, 0, 0, w, h - 5, colors, 5);
    },
  };
}

function bush(colors, w = 12, h = 9, snow = false) {
  return {
    w,
    h,
    draw(ctx, rng) {
      canopy(ctx, rng, 0, 0, w, h, colors, 3);
      if (snow) {
        for (let x = 1; x < w - 1; x++) {
          const top = Math.round(1 + Math.abs(x - w / 2) * 0.4 + rng.range(0, 1));
          px(ctx, x, top, rng.chance(0.7) ? '#ffffff' : '#e3eef9', 1, rng.int(1, 2));
        }
      }
    },
  };
}

function pine({ snow = false } = {}) {
  return {
    w: 16,
    h: 24,
    draw(ctx, rng) {
      const dark = '#163a2a';
      const mid = '#22573c';
      const light = '#2f7a4e';
      px(ctx, 7, 20, '#3a2414', 2, 4);
      const tiers = [
        { top: 0, bottom: 8, half: 4 },
        { top: 5, bottom: 14, half: 6 },
        { top: 10, bottom: 21, half: 8 },
      ];
      for (const t of tiers) {
        for (let y = t.top; y < t.bottom; y++) {
          const k = (y - t.top + 1) / (t.bottom - t.top);
          const half = Math.max(1, Math.round(t.half * k));
          for (let x = 8 - half; x < 8 + half; x++) {
            let c = x < 7 ? light : x > 9 ? dark : mid;
            if (x === 8 - half || x === 8 + half - 1 || y === t.bottom - 1) c = '#0f2a1e';
            if (snow && (y - t.top < 2 + (x % 3 === 0 ? 1 : 0) || (y === t.bottom - 2 && rng.chance(0.5)))) {
              c = rng.chance(0.75) ? '#ffffff' : '#d5e2f2';
            }
            px(ctx, x, y, c);
          }
        }
      }
    },
  };
}

function palm() {
  return {
    w: 24,
    h: 26,
    draw(ctx, rng) {
      // стовбур, трохи вигнутий
      const bend = rng.range(-3, 3);
      for (let y = 8; y < 26; y++) {
        const t = (y - 8) / 18;
        const x = Math.round(11 + bend * (1 - t) * (1 - t));
        px(ctx, x, y, y % 3 === 0 ? '#7a5230' : '#a8783e', 3, 1);
        px(ctx, x + 2, y, '#5a3a1e');
      }
      const top = { x: 12 + Math.round(bend), y: 8 };
      const greens = ['#1f6b2e', '#2f8a3a', '#4fae4a'];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
        for (let s = 0; s < 11; s++) {
          const fx = top.x + Math.cos(ang) * s;
          const fy = top.y + Math.sin(ang) * s * 0.7 + (s * s) / 22;
          const c = greens[Math.min(2, Math.floor((1 - s / 11) * 3))];
          px(ctx, Math.round(fx), Math.round(fy), c, s < 8 ? 2 : 1, 1);
        }
      }
      px(ctx, top.x - 1, top.y, '#5a3a1e', 2, 2);
      px(ctx, top.x + 1, top.y + 1, '#7a5230', 2, 2);
    },
  };
}

function building(h, { night = false } = {}) {
  return {
    w: 26,
    h,
    draw(ctx, rng) {
      const roofs = night
        ? ['#2a2640', '#252238', '#302a48']
        : ['#8a7f9c', '#9c8a76', '#7f8f9c', '#a89a8a', '#8f9c86'];
      const roof = rng.pick(roofs);
      const border = night ? '#141220' : '#3a3448';
      const edge = night ? '#3d3858' : '#c8c0d6';
      px(ctx, 0, 0, border, 26, h);
      px(ctx, 1, 1, roof, 24, h - 2);
      px(ctx, 1, 1, edge, 24, 1);
      px(ctx, 1, 1, edge, 1, h - 2);
      // гравій/шум на даху
      for (let i = 0; i < 40; i++) px(ctx, rng.int(2, 23), rng.int(2, h - 3), night ? '#36304e' : '#00000022');
      // деталі
      const items = rng.int(2, 4);
      let y = 4;
      for (let i = 0; i < items && y < h - 8; i++) {
        const kind = rng.int(0, 3);
        const x = rng.int(3, 14);
        if (kind === 0) {
          // кондиціонер
          px(ctx, x, y, night ? '#4a4566' : '#d9d9e3', 7, 6);
          px(ctx, x + 1, y + 1, night ? '#2a2640' : '#6a6a78', 5, 4);
          px(ctx, x + 2, y + 2, night ? '#4a4566' : '#b0b0bc', 3, 2);
          y += 9;
        } else if (kind === 1) {
          // світловий люк / вікно в даху
          const lit = night && rng.chance(0.8);
          px(ctx, x, y, border, 8, 6);
          px(ctx, x + 1, y + 1, lit ? '#ffd76a' : '#6fa8d8', 6, 4);
          px(ctx, x + 1, y + 1, lit ? '#fff3b0' : '#bfe6ff', 2, 1);
          y += 9;
        } else if (kind === 2) {
          // сонячні панелі
          px(ctx, x, y, '#1a2a5a', 10, 7);
          for (let gx = 0; gx < 10; gx += 3) px(ctx, x + gx, y, '#4a6ab0', 1, 7);
          px(ctx, x, y + 3, '#4a6ab0', 10, 1);
          y += 10;
        } else {
          // бак для води
          px(ctx, x + 1, y, '#5a4a3a', 6, 7);
          px(ctx, x, y + 1, '#5a4a3a', 8, 5);
          px(ctx, x + 2, y + 1, '#8a7a6a', 3, 4);
          y += 10;
        }
      }
      if (night) {
        // червоний вогник антени
        px(ctx, rng.int(4, 20), h - 5, '#ff3b5c', 2, 2);
      }
    },
  };
}

function neon(colorA, colorB) {
  return {
    w: 5,
    h: 22,
    draw(ctx, rng) {
      px(ctx, 0, 0, '#141220', 5, 22);
      for (let y = 1; y < 21; y++) {
        if (y % 4 === 0) continue;
        const bright = rng.chance(0.85);
        px(ctx, 1, y, bright ? colorA : colorB, 3, 1);
      }
      px(ctx, 1, 1, '#ffffff', 1, 1);
    },
  };
}

function dune() {
  return {
    w: 30,
    h: 14,
    draw(ctx, rng) {
      forEllipse(30, 14, rng, 0.15, (x, y, edge, nx, ny) => {
        let c = '#e9c47c';
        if (ny < -0.2 && nx < 0.3) c = '#f6dc9e';
        if (nx + ny > 0.45) c = '#c9975a';
        if (edge && ny > 0) c = '#b8854b';
        if (!edge && (y + Math.round(nx * 4)) % 5 === 0 && rng.chance(0.6)) c = '#d9ad6a';
        px(ctx, x, y, c);
      });
    },
  };
}

function towel(a, b) {
  return {
    w: 12,
    h: 18,
    draw(ctx) {
      for (let y = 0; y < 18; y++) px(ctx, 0, y, Math.floor(y / 3) % 2 ? a : b, 12, 1);
      px(ctx, 0, 0, '#ffffff', 12, 1);
      px(ctx, 0, 17, '#ffffff', 12, 1);
    },
  };
}

export const PROCEDURAL_SPRITES = {
  // машини
  car_red: car('#e0483f', '#9a2a24', '#ff8a7a', '#c83a32'),
  car_blue: car('#3f7fe0', '#24509a', '#8ab8ff', '#3468c0'),
  car_white: car('#e9e9f0', '#a0a0b4', '#ffffff', '#d0d0dc'),
  car_taxi: car('#f2c230', '#a8801a', '#ffe68a', '#e0b020', { taxi: true }),
  car_green: car('#3fb86a', '#257a44', '#8ae8a8', '#35a05c'),
  car_night_purple: car('#7a4fe0', '#4a2a9a', '#b89aff', '#6a40c8', { night: true }),
  car_night_teal: car('#2fb8a8', '#1a7a70', '#8af0e0', '#28a092', { night: true }),
  car_night_dark: car('#4a4660', '#2a2640', '#7a7698', '#3d3a52', { night: true }),

  log: {
    w: 34,
    h: 9,
    draw(ctx, rng) {
      px(ctx, 3, 1, '#2a1a10', 28, 8);
      px(ctx, 3, 2, '#7a4a26', 28, 5);
      px(ctx, 3, 2, '#9a6236', 28, 1);
      px(ctx, 3, 7, '#4a2c17', 28, 1);
      for (let i = 0; i < 9; i++) px(ctx, rng.int(5, 28), rng.int(3, 6), '#5a361c', rng.int(2, 4), 1);
      for (let i = 0; i < 3; i++) px(ctx, rng.int(6, 27), 2, '#4f8a3a', 2, 1);
      for (const ox of [0, 29]) {
        px(ctx, ox + 1, 0, '#2a1a10', 3, 9);
        px(ctx, ox, 1, '#2a1a10', 5, 7);
        px(ctx, ox + 1, 1, '#d9a066', 3, 7);
        px(ctx, ox, 2, '#d9a066', 5, 5);
        px(ctx, ox + 1, 3, '#a86b32', 3, 3);
        px(ctx, ox + 2, 4, '#d9a066', 1, 1);
      }
    },
  },

  logSnow: {
    w: 34,
    h: 9,
    draw(ctx, rng) {
      PROCEDURAL_SPRITES.log.draw(ctx, rng);
      for (let x = 3; x < 31; x++) px(ctx, x, rng.chance(0.3) ? 1 : 0, '#f4f8ff', 1, rng.chance(0.5) ? 2 : 1);
    },
  },

  iceblock: {
    w: 14,
    h: 12,
    draw(ctx, rng) {
      px(ctx, 0, 0, '#3d7fa8', 14, 12);
      px(ctx, 1, 1, '#e6f7ff', 12, 3);
      px(ctx, 1, 4, '#9fdcf5', 12, 7);
      px(ctx, 1, 4, '#5fb8e0', 12, 1);
      px(ctx, 11, 4, '#7ac8ea', 2, 7);
      for (let i = 0; i < 3; i++) {
        const x = rng.int(2, 8);
        const y = rng.int(5, 8);
        px(ctx, x, y, '#ffffff');
        px(ctx, x + 1, y + 1, '#ffffff');
      }
      px(ctx, 2, 1, '#ffffff', 3, 1);
    },
  },

  barrier: {
    w: 26,
    h: 9,
    draw(ctx) {
      px(ctx, 2, 5, '#5a5a68', 2, 4);
      px(ctx, 22, 5, '#5a5a68', 2, 4);
      px(ctx, 0, 1, '#2a2440', 26, 6);
      for (let x = 1; x < 25; x++) {
        for (let y = 2; y < 6; y++) {
          px(ctx, x, y, Math.floor((x + y) / 3) % 2 ? '#e8383d' : '#ffffff');
        }
      }
      px(ctx, 12, 0, '#ffcc33', 2, 1);
    },
  },

  manhole: {
    w: 12,
    h: 8,
    draw(ctx, rng) {
      forEllipse(12, 8, rng, 0, (x, y, edge, nx, ny) => {
        px(ctx, x, y, edge ? '#7a7a88' : ny < -0.3 ? '#08070c' : '#1a1820');
      });
    },
  },

  pothole: {
    w: 13,
    h: 8,
    draw(ctx, rng) {
      forEllipse(13, 8, rng, 0.35, (x, y, edge, nx, ny) => {
        let c = ny < -0.2 ? '#050408' : '#121018';
        if (edge) c = rng.chance(0.5) ? '#3a3848' : '#2a2838';
        px(ctx, x, y, c);
      });
    },
  },

  umbrella_red: umbrella('#e8383d', '#ffffff'),
  umbrella_blue: umbrella('#3f7fe0', '#ffd23f'),
  umbrella_green: umbrella('#3fb86a', '#ffffff'),

  // небезпечні (але не смертельні) зони
  puddle: blob({ w: 22, h: 11, edge: '#2f5fa0', base: '#3f78c8', light: '#8ab8ff', lines: 2 }),
  mud: blob({ w: 24, h: 12, edge: '#3a2412', base: '#5a3a1e', light: '#7a5230', sparkle: ['#6b4628'], lines: 1 }),
  sandpit: blob({ w: 26, h: 12, edge: '#c9a060', base: '#f2d8a0', light: '#fff0c8', sparkle: ['#d9b878'], lines: 3, wobble: 0.3 }),
  ice: blob({ w: 26, h: 13, edge: '#7ac0e8', base: '#bfe9ff', light: '#ffffff', sparkle: ['#ffffff'], lines: 3, wobble: 0.35 }),
  oil: blob({ w: 20, h: 11, edge: '#05040a', base: '#0e0c14', light: '#2a2440', sparkle: ['#7a4fe0', '#2fb8a8', '#e0b84f'], wobble: 0.4 }),

  // декор
  tree0: tree(['#14361a', '#1f4d24', '#2f6b2a', '#3f8a3a', '#5fae4a']),
  tree1: tree(['#14361a', '#1f4d24', '#2f6b2a', '#3f8a3a', '#5fae4a'], 20, 22),
  tree2: tree(['#14361a', '#24572a', '#357a34', '#4a9a42', '#7ac45a'], 24, 26),
  treeAutumn: tree(['#4a1a08', '#7a2f12', '#b8541e', '#e07a2a', '#f2a94a']),
  bush0: bush(['#14361a', '#1f4d24', '#2f6b2a', '#3f8a3a', '#5fae4a']),
  bush1: bush(['#14361a', '#24572a', '#357a34', '#4a9a42', '#7ac45a'], 10, 8),
  bushBeach: bush(['#1a4a20', '#2a6a2a', '#3f8a3a', '#5fae4a', '#8ad06a'], 12, 9),
  bushSnow: bush(['#16302a', '#22473a', '#2f5f48', '#3f7a5a', '#5f9a78'], 12, 9, true),
  pine0: pine(),
  pine1: pine(),
  snowpine0: pine({ snow: true }),
  snowpine1: pine({ snow: true }),
  snowpine2: pine({ snow: true }),
  palm0: palm(),
  palm1: palm(),
  palm2: palm(),
  building0: building(44),
  building1: building(52),
  building2: building(38),
  building3: building(58),
  buildingNight0: building(44, { night: true }),
  buildingNight1: building(54, { night: true }),
  buildingNight2: building(40, { night: true }),
  lamp: {
    w: 5,
    h: 5,
    draw(ctx) {
      px(ctx, 1, 0, '#3a3a46', 3, 5);
      px(ctx, 0, 1, '#3a3a46', 5, 3);
      px(ctx, 1, 1, '#fff3b0', 3, 3);
      px(ctx, 2, 2, '#ffffff', 1, 1);
    },
  },
  neonPink: neon('#ff4fd8', '#a02a88'),
  neonCyan: neon('#4cf0ff', '#2a8a9a'),
  neonLime: neon('#b6ff4f', '#6a9a2a'),
  dune0: dune(),
  dune1: dune(),
  towel0: towel('#ff5b7a', '#ffffff'),
  towel1: towel('#3f7fe0', '#ffd23f'),
  towel2: towel('#3fb86a', '#fff3a0'),

  // кільце щита навколо гравця
  shieldRing: {
    w: 21,
    h: 29,
    draw(ctx) {
      const cx = 10;
      const cy = 14;
      for (let y = 0; y < 29; y++) {
        for (let x = 0; x < 21; x++) {
          const d = ((x - cx) / 10.2) ** 2 + ((y - cy) / 14.2) ** 2;
          if (d <= 1 && d > 0.78) px(ctx, x, y, (x + y) % 3 === 0 ? '#ffffff' : '#4cd6ff');
        }
      }
    },
  },
};
