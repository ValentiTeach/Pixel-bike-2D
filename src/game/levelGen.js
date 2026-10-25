// Генератор рівня для виду збоку: рельєф (земля, ями, уступи), перешкоди, монети, бонуси, декор.
//
// Рівень будується шматками попереду камери: «розгін по рівному» → «виклик» (перешкода, яма,
// уступ, зустрічний звір, птах, калюжа…). Головне — ЧЕСНІСТЬ:
//  • довжина розгону залежить від швидкості (часу на реакцію не менше ~0.6 с);
//  • ширина ями і перешкод обмежена дальністю стрибка на поточній швидкості;
//  • птахи летять на висоті стрибка, але вище голови велосипедиста — під ними можна проїхати;
//  • уступ вгору не вищий за стрибок, а на кожній платформі є місце для приземлення.
import { ENTITY_TYPES } from './entities.js';
import { spriteSize } from './sprites.js';
import {
  GROUND_Y, STEP_H, MAX_LEVEL, START_X, PLAYER_H, PLAYER_W, PLAYER_HITBOX, AIR_TIME, JUMP_HEIGHT, PHYSICS,
} from './constants.js';
import { lerp, clamp } from './rng.js';

const HB_W = PLAYER_W - PLAYER_HITBOX.l - PLAYER_HITBOX.r;
const COIN = 8;
const typeSize = (typeId) => spriteSize(ENTITY_TYPES[typeId].sprites[0]);
const weight = (v, d) => (Array.isArray(v) ? lerp(v[0], v[1], d) : v);

// Скільки секунд нижня точка гравця перебуває вище висоти h під час повного стрибка.
export function timeAbove(h) {
  const rise = JUMP_HEIGHT - h;
  if (rise <= 0) return 0;
  return 2 * Math.sqrt((2 * rise) / PHYSICS.gravity);
}

// Чи можна перестрибнути перешкоду ширини w і висоти h на швидкості v (із запасом 15%).
export function canClear(w, h, v) {
  return w + HB_W <= v * timeAbove(h + 2) * 0.85;
}

export class LevelGen {
  constructor(location, rng, mode) {
    this.loc = location;
    this.rng = rng;
    this.mode = mode;
    this.x = START_X - 320;
    this.level = 0;
    this.finished = false;
    this.log = []; // журнал викликів — для тестів
  }

  top() {
    return GROUND_Y - this.level * STEP_H;
  }

  ensure(world, untilX) {
    while (this.x < untilX) this.next(world);
  }

  // Рівна ділянка поточної висоти + декор на ній.
  flat(world, len, { props = true } = {}) {
    const x0 = this.x;
    const x1 = Math.round(this.x + len);
    const top = this.top();
    world.addSegment(x0, x1, top);
    if (props) this.props(world, x0, x1, top);
    this.x = x1;
    return { x0, x1, top };
  }

  props(world, x0, x1, top) {
    const list = this.loc.props;
    if (!list?.length) return;
    const rng = this.rng;
    const [g0, g1] = this.loc.propGap ?? [20, 70];
    let x = x0 + rng.int(4, g1);
    while (x < x1 - 6) {
      const item = rng.weighted(list);
      const { w, h } = spriteSize(item.sprite);
      if (x + w > x1 - 4) break;
      world.spawnDecor(item, Math.round(x), top - h + 1);
      x += w + rng.int(g0, g1);
    }
  }

  next(world) {
    const rng = this.rng;
    const finishX = world.finishX;

    // фінішна пряма: виходимо на землю і їдемо рівно
    if (this.mode === 'level' && !this.finished && this.x > finishX - 420) {
      if (this.level > 0) {
        this.level = 0;
      }
      this.flat(world, finishX - this.x + 900);
      world.addGate('finish', finishX);
      this.finished = true;
      return;
    }
    if (this.finished) {
      this.flat(world, 400);
      return;
    }
    // стартова пряма
    if (this.x < START_X + 200) {
      this.flat(world, START_X + 260 - this.x);
      return;
    }

    const d = world.difficultyAt(this.x);
    const v = world.targetSpeedAt(this.x);
    const g = this.loc.gen;
    this.flat(world, Math.max(40, v * lerp(g.runway[0], g.runway[1], d) * rng.range(0.85, 1.3)));

    const options = [
      { id: 'obstacle', weight: weight(g.obstacle, d) },
      { id: 'double', weight: weight(g.double, d) },
      { id: 'pit', weight: weight(g.pit, d) },
      { id: 'step', weight: weight(g.step, d) },
      { id: 'mover', weight: this.loc.movers?.length ? weight(g.mover, d) : 0 },
      { id: 'bird', weight: this.loc.flyers?.length ? weight(g.bird, d) : 0 },
      { id: 'hazard', weight: this.loc.hazards?.length ? weight(g.hazard, d) : 0 },
      { id: 'coins', weight: weight(g.coins, d) },
    ].filter((o) => o.weight > 0);
    const kind = rng.weighted(options).id;
    const x0 = this.x;
    const info = this[kind](world, d, v) ?? {};
    this.log.push({ kind, x0, x1: this.x, v, d, level: this.level, ...info });
  }

  // ---------- Виклики ----------

  obstacle(world, d, v) {
    const rng = this.rng;
    const fits = this.loc.obstacles.filter((o) => {
      const { w, h } = typeSize(o.type);
      return canClear(w, h, v);
    });
    const o = rng.weighted(fits.length ? fits : this.loc.obstacles);
    const { w, h } = typeSize(o.type);
    const seg = this.flat(world, w + Math.max(50, v * AIR_TIME * 0.7));
    const ox = seg.x0 + 2;
    world.spawn(o.type, ox, seg.top - h);
    if (rng.chance(0.55)) this.coinArc(world, ox + w / 2, seg.top, v);
    return { type: o.type, ox, w, h };
  }

  double(world, d, v) {
    // дві низькі перешкоди поруч — перестрибуються одним стрибком
    const rng = this.rng;
    const small = this.loc.obstacles.filter((o) => typeSize(o.type).w <= 14 && typeSize(o.type).h <= 14);
    if (!small.length) return this.obstacle(world, d, v);
    const a = rng.weighted(small);
    const b = rng.weighted(small);
    const sa = typeSize(a.type);
    const sb = typeSize(b.type);
    const gap = rng.int(3, 8);
    const total = sa.w + gap + sb.w;
    if (!canClear(total, Math.max(sa.h, sb.h), v)) return this.obstacle(world, d, v);
    const seg = this.flat(world, total + Math.max(50, v * AIR_TIME * 0.7));
    world.spawn(a.type, seg.x0 + 2, seg.top - sa.h);
    world.spawn(b.type, seg.x0 + 2 + sa.w + gap, seg.top - sb.h);
    this.coinArc(world, seg.x0 + 2 + total / 2, seg.top, v);
    return { type: `${a.type}+${b.type}`, ox: seg.x0 + 2, w: total, h: Math.max(sa.h, sb.h) };
  }

  pit(world, d, v) {
    const rng = this.rng;
    const range = v * AIR_TIME;
    let dl = 0;
    if (this.level < MAX_LEVEL && rng.chance(0.25)) dl = 1;
    else if (this.level > 0 && rng.chance(0.45)) dl = -1;
    // яма з підйомом коротша: частину часу стрибка «з'їдає» висота
    const maxW = range * (dl > 0 ? 0.5 : 0.75);
    const width = Math.round(clamp(lerp(22, maxW, d) * rng.range(0.85, 1.05), 18, maxW));
    const cx = this.x + width / 2;
    const fromTop = this.top();
    this.x += width; // порожнеча
    this.level += dl;
    const seg = this.flat(world, Math.max(60, range * 0.6));
    if (rng.chance(0.6)) this.coinArc(world, cx, Math.min(fromTop, seg.top), v);
    return { width, dl, maxW };
  }

  step(world, d, v) {
    const up = this.level < MAX_LEVEL && (this.level === 0 || this.rng.chance(0.55));
    this.level += up ? 1 : -1;
    const seg = this.flat(world, Math.max(80, v * 0.9));
    if (this.rng.chance(0.5)) this.coinLine(world, seg.x0 + 20, seg.top, 4);
    return { up };
  }

  mover(world, d, v) {
    const rng = this.rng;
    const o = rng.weighted(this.loc.movers);
    const T = ENTITY_TYPES[o.type];
    const { h } = typeSize(o.type);
    const len = Math.max(240, v * 2.2);
    const seg = this.flat(world, len);
    const speed = rng.range(T.speed[0], T.speed[1]) * lerp(0.9, 1.2, d);
    world.spawn(o.type, seg.x0 + len * 0.75, seg.top - h, {
      vx: -speed,
      active: false,
      minX: seg.x0 + 10,
      maxX: seg.x1 - 4,
    });
    return { type: o.type };
  }

  bird(world, d, v) {
    const rng = this.rng;
    const o = rng.weighted(this.loc.flyers);
    const T = ENTITY_TYPES[o.type];
    const { h } = typeSize(o.type);
    const len = Math.max(220, v * 1.9);
    const seg = this.flat(world, len);
    // низ птаха — вище голови велосипедиста (≥ 8 px запасу), але в зоні стрибка
    const lift = rng.int(PLAYER_H + 8, PLAYER_H + 18);
    const y = seg.top - lift - h;
    const speed = rng.range(T.speed[0], T.speed[1]);
    world.spawn(o.type, seg.x0 + len * 0.7, y, { vx: -speed, active: false, baseY: y });
    // монети внизу — підказка «їдь під птахом»
    this.coinLine(world, seg.x0 + len * 0.3, seg.top, 5);
    return { type: o.type, lift };
  }

  hazard(world, d, v) {
    const rng = this.rng;
    const hz = rng.weighted(this.loc.hazards);
    const { w } = typeSize(hz.type);
    const seg = this.flat(world, w + 40 + (ENTITY_TYPES[hz.type].effect === 'slip' ? v * 0.6 : 0));
    world.spawn(hz.type, seg.x0 + 10, seg.top - 3);
    return { type: hz.type };
  }

  coins(world, d, v) {
    const rng = this.rng;
    const seg = this.flat(world, 130);
    if (rng.chance(0.5)) {
      this.coinLine(world, seg.x0 + 15, seg.top, 6);
    } else {
      // висока дуга з бонусом на вершині — треба стрибнути
      this.coinArc(world, seg.x0 + 60, seg.top, v, true);
    }
  }

  // ---------- Монети ----------

  coinLine(world, x, top, n) {
    for (let i = 0; i < n; i++) world.spawn('coin', x + i * 14, top - 15);
  }

  // Дуга монет уздовж траєкторії стрибка з вершиною над cx.
  coinArc(world, cx, top, v, bonus = false) {
    const rng = this.rng;
    const half = Math.max(24, (v * AIR_TIME) / 2 - 6);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1; // -1..1
      const y = top - 15 - (JUMP_HEIGHT - 12) * (1 - t * t);
      let type = 'coin';
      if (i === 2 && (bonus || rng.chance(0.12))) {
        const r = rng.next();
        if (r < 0.45 && world.hearts < 3) type = 'heart';
        else if (r < 0.9) type = 'shield';
      }
      world.spawn(type, cx + t * half - COIN / 2, y);
    }
  }
}
