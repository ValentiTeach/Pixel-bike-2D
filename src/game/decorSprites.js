// Декор у масштабі світу (16 px = 1 м): дерева, кущі, каміння, будинки, ліхтарі, знаки байк-парку.
// Усе малюється кодом цілими пікселями; світло — зліва згори (як сонце на фонах), тінь — справа знизу.
// Кожен запис: { w, h, draw(ctx, rng) } — реєструється разом з іншими процедурними спрайтами.

const px = (ctx, x, y, c, w = 1, h = 1) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

// «Клубки» крони з освітленням: кожен піксель отримує тон від нормалі найближчого клубка.
function clumps(ctx, rng, list, colors, { holes = 0, outline = true } = {}) {
  const [line, dark, mid, light, hi] = colors;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of list) {
    minX = Math.min(minX, c.x - c.r);
    maxX = Math.max(maxX, c.x + c.r);
    minY = Math.min(minY, c.y - c.r);
    maxY = Math.max(maxY, c.y + c.r);
  }
  const owner = (x, y) => {
    let best = null;
    for (const c of list) {
      const d = Math.hypot(x + 0.5 - c.x, (y + 0.5 - c.y) * (c.sq ?? 1));
      if (d <= c.r && (!best || c.y > best.c.y)) best = { c, d };
    }
    return best;
  };
  for (let y = Math.floor(minY); y <= maxY; y++) {
    for (let x = Math.floor(minX); x <= maxX; x++) {
      const o = owner(x, y);
      if (!o) continue;
      if (holes && rng.chance(holes) && o.d > o.c.r * 0.55) continue;
      const edge = outline && (!owner(x - 1, y) || !owner(x + 1, y) || !owner(x, y - 1) || !owner(x, y + 1));
      const lx = (x + 0.5 - o.c.x) / o.c.r;
      const ly = (y + 0.5 - o.c.y) / o.c.r;
      const lit = -(lx * 0.8 + ly) * 0.75 + rng.range(-0.3, 0.3);
      let c = mid;
      if (edge) c = line;
      else if (lit > 0.7) c = hi;
      else if (lit > 0.2) c = light;
      else if (lit < -0.4) c = dark;
      px(ctx, x, y, c);
    }
  }
}

// Стовбур з корою: світлий лівий край, темний правий, поперечні риски.
function trunk(ctx, rng, cx, top, bottom, w0, w1, colors, { marks = null, flare = 2 } = {}) {
  const [dark, mid, light] = colors;
  for (let y = top; y < bottom; y++) {
    const t = (y - top) / Math.max(1, bottom - top);
    let w = w0 + (w1 - w0) * t;
    if (y > bottom - 4) w += (flare * (y - (bottom - 4))) / 4;
    const x0 = Math.round(cx - w / 2);
    const ww = Math.max(1, Math.round(w));
    px(ctx, x0, y, mid, ww, 1);
    px(ctx, x0, y, light, Math.max(1, Math.round(ww * 0.3)), 1);
    px(ctx, x0 + ww - Math.max(1, Math.round(ww * 0.3)), y, dark, Math.max(1, Math.round(ww * 0.3)), 1);
    if (marks && rng.chance(marks.p)) px(ctx, x0 + rng.int(0, ww - 1), y, marks.c, rng.int(1, Math.max(1, ww - 1)), 1);
  }
}

// Ялина: ярусні «лапи», що звисають; сніг на верхніх краях.
function spruce({ w = 40, h = 104, snow = false, colors = ['#0c2418', '#14321f', '#1d4a2c', '#2a6239', '#3d7a48'] } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const cx = w / 2;
      trunk(ctx, rng, cx, h - 14, h, 4, 5, ['#2a1a10', '#4a3020', '#6b4a32']);
      const tiers = 9;
      const top = 2;
      const bottom = h - 8;
      for (let i = 0; i < tiers; i++) {
        const t = (i + 1) / tiers;
        const ty = Math.round(top + (bottom - top) * (i / tiers) * 0.92);
        const th = Math.round(((bottom - top) / tiers) * 1.9);
        const half = (w / 2 - 1) * (0.25 + 0.75 * t);
        for (let y = 0; y < th; y++) {
          const k = (y + 1) / th;
          const span = Math.max(1, Math.round(half * Math.pow(k, 0.8)));
          for (let x = -span; x <= span; x++) {
            // нижній край лапи «звисає» до країв
            const droop = Math.round((Math.abs(x) / Math.max(1, half)) ** 2 * 3);
            if (y < droop && Math.abs(x) > span * 0.6) continue;
            const xx = Math.round(cx + x);
            const side = x / Math.max(1, span);
            let c = colors[2];
            if (side < -0.35) c = colors[3];
            if (side < -0.75 && rng.chance(0.5)) c = colors[4];
            if (side > 0.4) c = colors[1];
            if (y === th - 1 || (y > th - 3 && rng.chance(0.4))) c = colors[0];
            if (rng.chance(0.12)) c = rng.pick([colors[1], colors[2], colors[3]]);
            if (snow && y < 2 + (rng.chance(0.5) ? 1 : 0) && side < 0.8) c = rng.chance(0.8) ? '#ffffff' : '#dbe6f4';
            px(ctx, xx, ty + y, c);
          }
        }
      }
      px(ctx, Math.round(cx), 0, colors[2], 1, 3);
      if (snow) px(ctx, Math.round(cx), 0, '#ffffff', 1, 1);
    },
  };
}

// Сосна звичайна: високий голий стовбур (вгорі — помаранчевий), крона пластами нагорі.
function scotsPine({ w = 36, h = 120, snow = false } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const cx = Math.round(w / 2 + rng.range(-2, 2));
      const crownBottom = Math.round(h * 0.42);
      // стовбур: внизу сіро-коричнева кора, вище — помаранчева
      for (let y = 8; y < h; y++) {
        const t = y / h;
        const ww = 3 + t * 2.5 + (y > h - 4 ? (y - (h - 4)) * 0.8 : 0);
        const x0 = Math.round(cx - ww / 2);
        const upper = y < h * 0.62;
        const mid = upper ? '#b8683a' : '#6a4a38';
        const light = upper ? '#d88a52' : '#8a6a52';
        const dark = upper ? '#7a3e22' : '#3e2a20';
        px(ctx, x0, y, mid, Math.round(ww), 1);
        px(ctx, x0, y, light, 1, 1);
        px(ctx, x0 + Math.round(ww) - 1, y, dark, 1, 1);
        if (!upper && rng.chance(0.3)) px(ctx, x0 + rng.int(0, Math.round(ww) - 1), y, '#2e1e16', 1, 1);
      }
      // гілки
      for (let i = 0; i < 4; i++) {
        const by = rng.int(crownBottom - 18, crownBottom + 6);
        const dir = rng.sign();
        const len = rng.int(5, 11);
        for (let s = 0; s < len; s++) px(ctx, cx + dir * s, by - Math.round(s * 0.5), '#5a3420');
      }
      // крона: пласти-«хмарки»
      const list = [];
      for (let i = 0; i < 7; i++) {
        list.push({ x: cx + rng.range(-w * 0.32, w * 0.32), y: rng.range(8, crownBottom - 6), r: rng.range(5, 9), sq: 1.5 });
      }
      list.push({ x: cx, y: 10, r: 8, sq: 1.4 });
      clumps(ctx, rng, list, ['#0e2a1a', '#173d26', '#215234', '#2f6a42', '#4a8a52'], { holes: 0.04 });
      if (snow) {
        for (const c of list) {
          for (let x = -c.r * 0.8; x < c.r * 0.6; x++) px(ctx, Math.round(c.x + x), Math.round(c.y - c.r / 1.5 + Math.abs(x) * 0.2), '#f4f8ff');
        }
      }
    },
  };
}

function birch({ w = 30, h = 96 } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const cx = Math.round(w / 2);
      trunk(ctx, rng, cx, 14, h, 3, 4, ['#a8a8a0', '#e8e8e0', '#ffffff'], { marks: { p: 0.35, c: '#2a2a2a' }, flare: 1 });
      for (let i = 0; i < 5; i++) {
        const by = rng.int(18, 50);
        const dir = rng.sign();
        for (let s = 0; s < rng.int(4, 9); s++) px(ctx, cx + dir * s, by - s, '#d8d8d0');
      }
      const list = [];
      for (let i = 0; i < 9; i++) list.push({ x: cx + rng.range(-w * 0.36, w * 0.36), y: rng.range(8, 50), r: rng.range(5, 8) });
      clumps(ctx, rng, list, ['#2a4a18', '#3f6a22', '#5a8a2e', '#7aa83a', '#a8c85a'], { holes: 0.1 });
    },
  };
}

function deciduous({ w = 40, h = 80, colors = ['#1f3a14', '#2f5a1e', '#3f7a28', '#5a9a34', '#86c04a'] } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const cx = Math.round(w / 2);
      trunk(ctx, rng, cx, Math.round(h * 0.45), h, 4, 5, ['#2a1a10', '#4a3020', '#6b4a32'], { flare: 3 });
      const list = [];
      for (let i = 0; i < 8; i++) list.push({ x: cx + rng.range(-w * 0.3, w * 0.3), y: rng.range(h * 0.15, h * 0.5), r: rng.range(7, 11) });
      clumps(ctx, rng, list, colors, { holes: 0.03 });
    },
  };
}

function boulder({ w = 22, h = 14, colors = ['#3a3a42', '#5a5a64', '#7a7a86', '#9a9aa6', '#bdbdc8'], moss = null, snow = false } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const cx = w / 2;
      const p = rng.range(0, 6.28);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x + 0.5 - cx) / (w / 2);
          const ny = (y + 0.5 - h) / h; // -1 (верх) … 0 (низ)
          const a = Math.atan2(ny, nx);
          const rr = 0.86 + 0.14 * Math.sin(3 * a + p) + 0.06 * Math.sin(7 * a);
          const d = Math.hypot(nx, ny);
          if (d > rr) continue;
          const lit = -nx * 0.6 - ny * 0.4 - 0.25 + rng.range(-0.12, 0.12);
          let c = colors[2];
          if (d > rr - 0.08) c = colors[0];
          else if (lit > 0.35) c = colors[4];
          else if (lit > 0.1) c = colors[3];
          else if (lit < -0.25) c = colors[1];
          if (moss && ny < -0.55 && rng.chance(0.6)) c = rng.pick(moss);
          if (snow && ny < -0.6 + Math.abs(nx) * 0.2) c = rng.chance(0.85) ? '#ffffff' : '#dbe6f4';
          px(ctx, x, y, c);
        }
      }
      // тріщини
      for (let i = 0; i < 2; i++) {
        let x = rng.int(3, w - 4);
        let y = rng.int(3, h - 3);
        for (let s = 0; s < 4; s++) {
          px(ctx, x, y, colors[1]);
          x += rng.int(-1, 1);
          y += 1;
        }
      }
    },
  };
}

function bush({ w = 26, h = 16, colors = ['#14301a', '#1f4624', '#2d6030', '#3f7a3a', '#5e9a48'], berries = null } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const list = [];
      for (let i = 0; i < 6; i++) list.push({ x: rng.range(w * 0.2, w * 0.8), y: rng.range(h * 0.35, h * 0.7), r: rng.range(h * 0.3, h * 0.5) });
      list.push({ x: w / 2, y: h - h * 0.35, r: h * 0.45 });
      clumps(ctx, rng, list, colors, { holes: 0.02 });
      if (berries) for (let i = 0; i < 5; i++) px(ctx, rng.int(3, w - 4), rng.int(3, h - 4), berries);
    },
  };
}

function grassTuft({ w = 16, h = 10, colors = ['#3f6a2a', '#5a8a3a', '#8ab04a', '#c8b060'] } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      for (let i = 0; i < w * 1.2; i++) {
        const x0 = rng.range(1, w - 2);
        const len = rng.int(Math.round(h * 0.4), h - 1);
        const lean = rng.range(-0.5, 0.5);
        const c = rng.pick(colors);
        for (let s = 0; s < len; s++) px(ctx, Math.round(x0 + lean * s), h - 1 - s, c);
      }
    },
  };
}

function fern() {
  return {
    w: 20,
    h: 11,
    draw(ctx, rng) {
      const cols = ['#2a5a24', '#3f7a2e', '#5a9a3a', '#7ab84a'];
      for (let f = 0; f < 6; f++) {
        const ang = -Math.PI / 2 + rng.range(-1.2, 1.2);
        const len = rng.range(6, 10);
        for (let s = 0; s < len; s++) {
          const t = s / len;
          const x = 10 + Math.cos(ang) * s * 1.1;
          const y = 10 + Math.sin(ang) * s + t * t * 4;
          px(ctx, Math.round(x), Math.round(y), cols[Math.min(3, Math.floor(t * 4))]);
          if (s % 2 === 0) {
            px(ctx, Math.round(x - Math.sin(ang)), Math.round(y + 1), cols[1]);
            px(ctx, Math.round(x + Math.sin(ang)), Math.round(y - 1), cols[2]);
          }
        }
      }
    },
  };
}

function saguaro() {
  return {
    w: 30,
    h: 96,
    draw(ctx, rng) {
      const cols = ['#1e4a24', '#2f6a30', '#3f8a3a', '#5aa848', '#8ac86a'];
      const column = (x0, y0, y1, ww) => {
        for (let y = y0; y < y1; y++) {
          for (let i = 0; i < ww; i++) {
            const t = i / (ww - 1);
            let c = cols[2];
            if (t < 0.25) c = cols[3];
            if (t < 0.1) c = cols[4];
            if (t > 0.7) c = cols[1];
            if (i === 0 || i === ww - 1) c = cols[0];
            if (i % 2 === 1 && t > 0.15 && t < 0.85) c = cols[1]; // ребра
            px(ctx, x0 + i, y, c);
          }
        }
        for (let i = 1; i < ww - 1; i++) px(ctx, x0 + i, y0 - 1, cols[i < ww / 2 ? 3 : 2]);
      };
      column(11, 3, 96, 8);
      // руки
      const arm = (dir, y0, len, up) => {
        const x = dir < 0 ? 11 - len : 19;
        column(dir < 0 ? x : x + len - 6, y0 - up, y0 + 2, 6);
        for (let y = y0 - 1; y < y0 + 4; y++) for (let i = 0; i < len; i++) px(ctx, x + i, y, y === y0 + 3 ? cols[0] : cols[2]);
      };
      arm(-1, rng.int(36, 46), 10, 18);
      arm(1, rng.int(30, 40), 10, 22);
      // колючки
      for (let i = 0; i < 40; i++) px(ctx, rng.int(10, 20), rng.int(4, 94), '#f2e8c8');
    },
  };
}

function joshua() {
  return {
    w: 40,
    h: 70,
    draw(ctx, rng) {
      const bark = ['#3a2a1e', '#5a4632', '#7a6448'];
      const branch = (x, y, ang, len, depth) => {
        let cx = x;
        let cy = y;
        for (let s = 0; s < len; s++) {
          cx += Math.cos(ang);
          cy += Math.sin(ang);
          px(ctx, Math.round(cx), Math.round(cy), bark[1], 3, 2);
          px(ctx, Math.round(cx), Math.round(cy), bark[2]);
        }
        if (depth > 0) {
          branch(cx, cy, ang - rng.range(0.3, 0.7), len * 0.7, depth - 1);
          branch(cx, cy, ang + rng.range(0.3, 0.7), len * 0.7, depth - 1);
        } else {
          for (let i = 0; i < 18; i++) {
            const a = rng.range(0, Math.PI * 2);
            const r = rng.range(1, 5);
            px(ctx, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), rng.pick(['#4a6a2a', '#6a8a3a', '#8aa84a']));
          }
        }
      };
      trunk(ctx, rng, 20, 34, 70, 4, 5, bark);
      branch(20, 36, -Math.PI / 2 - 0.4, 12, 2);
      branch(20, 36, -Math.PI / 2 + 0.4, 12, 2);
    },
  };
}

function palmTall() {
  return {
    w: 46,
    h: 110,
    draw(ctx, rng) {
      const bend = rng.range(6, 12) * rng.sign();
      let topX = 0;
      for (let y = 14; y < 110; y++) {
        const t = (y - 14) / 96;
        const x = 23 + bend * (1 - t) * (1 - t);
        if (y === 14) topX = x;
        const ww = 3 + t * 1.5;
        const x0 = Math.round(x - ww / 2);
        px(ctx, x0, y, y % 4 === 0 ? '#6a4a2a' : '#a8784a', Math.round(ww), 1);
        px(ctx, x0, y, '#c8985a');
        px(ctx, x0 + Math.round(ww) - 1, y, '#5a3a1e');
      }
      const greens = ['#1a4a22', '#2a6a2e', '#3f8a3a', '#6aae4a'];
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI + (i / 8) * Math.PI + rng.range(-0.15, 0.15);
        const len = rng.range(16, 22);
        for (let s = 0; s < len; s++) {
          const t = s / len;
          const fx = topX + Math.cos(ang) * s;
          const fy = 14 + Math.sin(ang) * s * 0.55 + t * t * 12;
          px(ctx, Math.round(fx), Math.round(fy), greens[Math.min(3, Math.floor((1 - t) * 3.5))], 1, 2);
          if (s % 2 === 0 && t > 0.2) px(ctx, Math.round(fx), Math.round(fy) + 2, greens[0]);
        }
      }
      for (let i = 0; i < 4; i++) px(ctx, Math.round(topX) + rng.int(-2, 1), 15 + rng.int(0, 2), '#5a3a1e', 2, 2);
    },
  };
}

function house({ w = 90, h = 92, wall = '#d8c8a8', wallDark = '#b8a888', roof = '#a0483a', floors = 3 } = {}) {
  return {
    w,
    h,
    draw(ctx, rng) {
      const roofH = 14;
      px(ctx, 2, roofH, wall, w - 4, h - roofH);
      px(ctx, w - 10, roofH, wallDark, 8, h - roofH);
      px(ctx, 2, roofH, '#efe2c8', 2, h - roofH);
      // дах
      for (let y = 0; y < roofH; y++) {
        const inset = Math.round((roofH - y) * 0.9);
        px(ctx, inset, y, y % 3 === 0 ? '#7a3428' : roof, w - inset * 2, 1);
      }
      px(ctx, w - 22, 2, '#5a4a44', 6, 10);
      // вікна
      const fh = Math.floor((h - roofH - 6) / floors);
      for (let f = 0; f < floors; f++) {
        const wy = roofH + 6 + f * fh;
        for (let wx = 8; wx < w - 14; wx += 16) {
          if (f === floors - 1 && wx > w / 2 - 10 && wx < w / 2 + 6) continue;
          px(ctx, wx, wy, '#4a3a30', 9, 13);
          px(ctx, wx + 1, wy + 1, rng.chance(0.3) ? '#ffe8a0' : '#6a8ab0', 7, 11);
          px(ctx, wx + 1, wy + 1, '#a8c8e8', 3, 4);
          px(ctx, wx + 4, wy + 1, '#4a3a30', 1, 11);
          px(ctx, wx - 1, wy + 13, '#efe2c8', 11, 2);
        }
      }
      // двері
      const dx = Math.round(w / 2 - 6);
      px(ctx, dx, h - 22, '#3a2418', 12, 22);
      px(ctx, dx + 1, h - 21, '#6a3a22', 10, 21);
      px(ctx, dx + 8, h - 11, '#ffcc33');
      px(ctx, 0, h - 3, '#8a7a66', w, 3);
    },
  };
}

function lampTall() {
  return {
    w: 16,
    h: 80,
    draw(ctx) {
      px(ctx, 11, 8, '#2a2a34', 3, 72);
      px(ctx, 11, 8, '#5a5a68', 1, 72);
      px(ctx, 9, 74, '#2a2a34', 7, 6);
      px(ctx, 2, 6, '#2a2a34', 12, 2);
      px(ctx, 0, 8, '#2a2a34', 7, 3);
      px(ctx, 1, 11, '#fff3b0', 5, 1);
      px(ctx, 12, 3, '#2a2a34', 1, 4);
    },
  };
}

function lanternPost() {
  return {
    w: 10,
    h: 40,
    draw(ctx) {
      px(ctx, 4, 6, '#3a2a1e', 3, 34);
      px(ctx, 4, 6, '#5a4632', 1, 34);
      px(ctx, 1, 2, '#1d1b26', 9, 2);
      px(ctx, 2, 4, '#1d1b26', 7, 6);
      px(ctx, 3, 5, '#ffd27a', 5, 4);
      px(ctx, 3, 5, '#fff3c8', 2, 2);
    },
  };
}

// Попереджувальний знак байк-парку: жовтий ромб на стовпчику.
function sign(icon) {
  return {
    w: 15,
    h: 26,
    draw(ctx) {
      px(ctx, 7, 12, '#5a4632', 2, 14);
      px(ctx, 7, 12, '#7a6448', 1, 14);
      for (let y = 0; y < 15; y++) {
        const half = 7 - Math.abs(y - 7);
        px(ctx, 7 - half, y, '#1d1b26', half * 2 + 1, 1);
        if (half > 0) px(ctx, 8 - half, y, '#ffcc33', Math.max(1, half * 2 - 1), 1);
      }
      const k = '#1d1b26';
      if (icon === 'jump') {
        // трамплін і дуга
        px(ctx, 4, 10, k, 7, 1);
        px(ctx, 6, 9, k, 2, 1);
        px(ctx, 7, 8, k, 1, 1);
        px(ctx, 5, 5, k, 1, 1);
        px(ctx, 6, 4, k, 3, 1);
        px(ctx, 9, 5, k, 1, 1);
      } else if (icon === 'drop') {
        px(ctx, 4, 5, k, 4, 1);
        px(ctx, 7, 5, k, 1, 5);
        px(ctx, 7, 10, k, 4, 1);
        px(ctx, 9, 7, k, 1, 2);
      } else {
        // геп: дві «губи» і провалля
        px(ctx, 3, 8, k, 3, 1);
        px(ctx, 9, 8, k, 3, 1);
        px(ctx, 5, 9, k, 1, 2);
        px(ctx, 9, 9, k, 1, 2);
        px(ctx, 7, 4, k, 1, 3);
        px(ctx, 7, 8, k, 1, 1);
      }
    },
  };
}

export const DECOR_SPRITES = {
  // ліс
  pineTall: scotsPine(),
  spruce: spruce(),
  birch: birch(),
  fern: fern(),
  bushBig: bush({ berries: '#c8283a' }),
  stumpDecor: {
    w: 14,
    h: 9,
    draw(ctx, rng) {
      px(ctx, 2, 2, '#4a3020', 10, 7);
      px(ctx, 2, 2, '#6b4a32', 3, 7);
      px(ctx, 1, 7, '#4a3020', 12, 2);
      px(ctx, 2, 1, '#c8955a', 10, 2);
      px(ctx, 4, 1, '#a8703a', 6, 1);
      for (let i = 0; i < 3; i++) px(ctx, rng.int(3, 10), rng.int(3, 7), '#2e1e14');
      px(ctx, 9, 5, '#4a8a3a', 3, 1);
    },
  },
  boulder: boulder({ moss: ['#4a7a3a', '#5a8a42', '#3f6a30'] }),
  mushrooms: {
    w: 9,
    h: 6,
    draw(ctx) {
      px(ctx, 1, 2, '#c8283a', 3, 2);
      px(ctx, 2, 2, '#ffffff');
      px(ctx, 2, 4, '#f4ecd8', 1, 2);
      px(ctx, 5, 1, '#a8382a', 4, 2);
      px(ctx, 6, 1, '#ffffff');
      px(ctx, 6, 3, '#f4ecd8', 2, 3);
    },
  },
  // місто
  lampTall: lampTall(),
  houseA: house(),
  houseB: house({ w: 70, h: 110, wall: '#c8d0d8', wallDark: '#a8b0b8', roof: '#4a5a6a', floors: 4 }),
  treeCity: deciduous(),
  bench: {
    w: 26,
    h: 11,
    draw(ctx) {
      px(ctx, 2, 0, '#7a4a26', 22, 2);
      px(ctx, 2, 4, '#9a6236', 22, 2);
      px(ctx, 3, 6, '#2a2a34', 2, 5);
      px(ctx, 21, 6, '#2a2a34', 2, 5);
      px(ctx, 3, 2, '#2a2a34', 1, 2);
      px(ctx, 22, 2, '#2a2a34', 1, 2);
    },
  },
  hydrantBig: {
    w: 8,
    h: 13,
    draw(ctx) {
      px(ctx, 2, 0, '#a81c1c', 4, 2);
      px(ctx, 1, 2, '#d8282a', 6, 9);
      px(ctx, 1, 2, '#ff5a4a', 2, 9);
      px(ctx, 0, 5, '#a81c1c', 8, 2);
      px(ctx, 0, 11, '#7a1414', 8, 2);
    },
  },
  barrierTape: {
    w: 40,
    h: 16,
    draw(ctx) {
      for (const x of [1, 19, 37]) {
        px(ctx, x, 2, '#e8e8ee', 2, 14);
        px(ctx, x + 1, 2, '#a8a8b4', 1, 14);
      }
      for (let x = 2; x < 38; x++) {
        const sag = Math.round(Math.sin(((x % 18) / 18) * Math.PI) * 1.5);
        px(ctx, x, 4 + sag, Math.floor(x / 3) % 2 ? '#e8383d' : '#ffffff');
      }
    },
  },
  // каньйон
  saguaro: saguaro(),
  joshua: joshua(),
  desertBush: bush({ w: 20, h: 10, colors: ['#4a4a2a', '#6a6a3a', '#8a8a4a', '#a8a85a', '#c8c87a'] }),
  boulderRed: boulder({ w: 30, h: 18, colors: ['#5a2414', '#8a3a22', '#b0502e', '#d06a3e', '#e8925a'] }),
  skull: {
    w: 12,
    h: 7,
    draw(ctx) {
      px(ctx, 3, 2, '#f4ecd8', 6, 4);
      px(ctx, 0, 0, '#f4ecd8', 3, 2);
      px(ctx, 9, 0, '#f4ecd8', 3, 2);
      px(ctx, 4, 3, '#3a2a1e');
      px(ctx, 7, 3, '#3a2a1e');
      px(ctx, 4, 6, '#d8ccb0', 4, 1);
    },
  },
  // узбережжя
  palmTall: palmTall(),
  dunegrass: grassTuft({ colors: ['#8a9a4a', '#a8b85a', '#c8c87a', '#e0d090'] }),
  boulderGrey: boulder({ w: 26, h: 16, colors: ['#3a3e44', '#5a6068', '#7a828a', '#9aa2aa', '#c0c6cc'], moss: ['#c8c070', '#a8a85a'] }),
  seaShrub: bush({ w: 20, h: 12, colors: ['#1a3a2a', '#2a5a3a', '#3f7a4a', '#5a9a5a', '#8ac07a'], berries: '#e8d0f0' }),
  // гори
  spruceSnow: spruce({ snow: true }),
  pineSnow: scotsPine({ snow: true }),
  boulderSnow: boulder({ w: 24, h: 15, snow: true }),
  snowBush: bush({ w: 20, h: 10, colors: ['#1a302a', '#22473a', '#2f5f48', '#3f7a5a', '#5f9a78'] }),
  skiPole: {
    w: 4,
    h: 40,
    draw(ctx) {
      for (let y = 0; y < 40; y++) px(ctx, 1, y, Math.floor(y / 5) % 2 ? '#ff7a1a' : '#1d1b26', 2, 1);
    },
  },
  // ніч
  lanternPost: lanternPost(),
  // знаки
  signJump: sign('jump'),
  signDrop: sign('drop'),
  signGap: sign('gap'),
};
