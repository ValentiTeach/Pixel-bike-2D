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

function carSide(body, shade, light, { taxi = false, night = false } = {}) {
  // авто збоку, фарами вліво — назустріч велосипедисту
  return {
    w: 30,
    h: 16,
    draw(ctx) {
      // кабіна
      px(ctx, 9, 1, body, 13, 1);
      px(ctx, 8, 2, body, 15, 4);
      px(ctx, 10, 2, '#2a3a5a', 5, 3);
      px(ctx, 16, 2, '#2a3a5a', 5, 3);
      px(ctx, 10, 2, '#9fd4ff', 4, 2);
      px(ctx, 16, 2, '#9fd4ff', 4, 2);
      px(ctx, 10, 2, '#e6f6ff', 1, 1);
      if (taxi) {
        px(ctx, 13, 0, '#1d1b26', 5, 1);
        px(ctx, 14, 0, '#ffffff', 1, 1);
        px(ctx, 16, 0, '#ffffff', 1, 1);
      }
      // кузов
      px(ctx, 3, 5, body, 26, 1);
      px(ctx, 1, 6, body, 28, 6);
      px(ctx, 1, 6, light, 28, 1);
      px(ctx, 1, 11, shade, 28, 1);
      px(ctx, 15, 6, shade, 1, 5);
      px(ctx, 17, 8, shade, 2, 1);
      px(ctx, 0, 7, night ? '#fffbd0' : '#f6f2c8', 2, 2);
      px(ctx, 28, 7, '#ff3b3b', 2, 2);
      px(ctx, 0, 10, '#3a3a46', 3, 2);
      px(ctx, 27, 10, '#3a3a46', 3, 2);
      // колеса
      for (const cx of [7, 23]) {
        for (let y = -3; y <= 3; y++) {
          for (let x = -3; x <= 3; x++) {
            const d = Math.hypot(x, y);
            if (d > 3.4) continue;
            px(ctx, cx + x, 12 + y, d < 1.3 ? '#9aa3b5' : '#15141c');
          }
        }
      }
    },
  };
}

function umbrellaSide(a, b) {
  return {
    w: 16,
    h: 22,
    draw(ctx) {
      for (let y = 0; y < 6; y++) {
        const half = Math.round(8 * Math.sqrt(1 - ((5 - y) / 6) ** 2)) || 1;
        for (let x = 8 - half; x < 8 + half; x++) px(ctx, x, y, Math.floor(x / 4) % 2 ? a : b);
      }
      px(ctx, 0, 5, '#2a2440', 16, 1);
      px(ctx, 7, 6, '#d9d9e3', 2, 15);
      px(ctx, 8, 6, '#9aa3b5', 1, 15);
      px(ctx, 4, 21, '#5a5470', 8, 1);
    },
  };
}

// Тонка смуга на поверхні землі (калюжа, багно, лід…), вид збоку.
function strip(w, { base, light, edge, sparkle = [] }) {
  return {
    w,
    h: 5,
    draw(ctx, rng) {
      px(ctx, 3, 0, light, w - 6, 1);
      px(ctx, 1, 1, base, w - 2, 3);
      px(ctx, 2, 4, edge, w - 4, 1);
      px(ctx, 0, 2, edge, 1, 1);
      px(ctx, w - 1, 2, edge, 1, 1);
      for (let i = 0; i < w / 4; i++) px(ctx, rng.int(2, w - 3), rng.int(1, 3), rng.chance(0.5) && sparkle.length ? rng.pick(sparkle) : light);
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

export const PROCEDURAL_SPRITES = {
  // машини (вид збоку)
  car_red: carSide('#e0483f', '#9a2a24', '#ff8a7a'),
  car_blue: carSide('#3f7fe0', '#24509a', '#8ab8ff'),
  car_white: carSide('#e9e9f0', '#a0a0b4', '#ffffff'),
  car_taxi: carSide('#f2c230', '#a8801a', '#ffe68a', { taxi: true }),
  car_green: carSide('#3fb86a', '#257a44', '#8ae8a8'),
  car_night_purple: carSide('#7a4fe0', '#4a2a9a', '#b89aff', { night: true }),
  car_night_teal: carSide('#2fb8a8', '#1a7a70', '#8af0e0', { night: true }),
  car_night_dark: carSide('#4a4660', '#2a2640', '#7a7698', { night: true }),

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
    h: 12,
    draw(ctx) {
      px(ctx, 2, 6, '#5a5a68', 2, 6);
      px(ctx, 22, 6, '#5a5a68', 2, 6);
      px(ctx, 0, 1, '#2a2440', 26, 6);
      for (let x = 1; x < 25; x++) {
        for (let y = 2; y < 6; y++) {
          px(ctx, x, y, Math.floor((x + y) / 3) % 2 ? '#e8383d' : '#ffffff');
        }
      }
      px(ctx, 12, 0, '#ffcc33', 2, 1);
    },
  },

  umbrella_red: umbrellaSide('#e8383d', '#ffffff'),
  umbrella_blue: umbrellaSide('#3f7fe0', '#ffd23f'),
  umbrella_green: umbrellaSide('#3fb86a', '#ffffff'),

  // небезпечні (але не смертельні) смуги на землі
  puddle: strip(26, { base: '#3f78c8', light: '#8ab8ff', edge: '#2f5fa0', sparkle: ['#ffffff'] }),
  mud: strip(26, { base: '#5a3a1e', light: '#7a5230', edge: '#3a2412' }),
  sandpit: strip(28, { base: '#f2d8a0', light: '#fff0c8', edge: '#c9a060', sparkle: ['#d9b878'] }),
  ice: strip(30, { base: '#bfe9ff', light: '#ffffff', edge: '#7ac0e8', sparkle: ['#ffffff'] }),
  oil: strip(24, { base: '#0e0c14', light: '#2a2440', edge: '#05040a', sparkle: ['#7a4fe0', '#2fb8a8', '#e0b84f'] }),

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
  lampPost: {
    w: 8,
    h: 34,
    draw(ctx) {
      px(ctx, 5, 3, '#3a3a46', 2, 31);
      px(ctx, 6, 3, '#5a5a68', 1, 29);
      px(ctx, 1, 2, '#3a3a46', 6, 1);
      px(ctx, 0, 3, '#3a3a46', 3, 2);
      px(ctx, 0, 5, '#fff3b0', 3, 1);
      px(ctx, 4, 31, '#3a3a46', 4, 3);
    },
  },
  fence: {
    w: 16,
    h: 10,
    draw(ctx) {
      px(ctx, 0, 0, '#8a5a30', 2, 10);
      px(ctx, 14, 0, '#8a5a30', 2, 10);
      px(ctx, 0, 2, '#b07a46', 16, 2);
      px(ctx, 0, 6, '#b07a46', 16, 2);
      px(ctx, 0, 0, '#c99a60', 2, 1);
      px(ctx, 14, 0, '#c99a60', 2, 1);
    },
  },
  neonPink: neon('#ff4fd8', '#a02a88'),
  neonCyan: neon('#4cf0ff', '#2a8a9a'),
  neonLime: neon('#b6ff4f', '#6a9a2a'),
  dune0: dune(),

  // кільце щита навколо гравця
  shieldRing: {
    w: 32,
    h: 30,
    draw(ctx) {
      for (let y = 0; y < 30; y++) {
        for (let x = 0; x < 32; x++) {
          const d = ((x - 15.5) / 15.6) ** 2 + ((y - 14.5) / 14.6) ** 2;
          if (d <= 1 && d > 0.8) px(ctx, x, y, (x + y) % 3 === 0 ? '#ffffff' : '#4cd6ff');
        }
      }
    },
  },
};
