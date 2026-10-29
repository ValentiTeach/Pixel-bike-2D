import { describe, it, expect } from 'vitest';
import { Track, MAT } from '../src/game/terrain.js';
import { BikeBody, deriveBike } from '../src/game/bikePhysics.js';
import { BIKES, getBike } from '../src/game/bikes.js';
import { PX_PER_M as M, DX, kmh } from '../src/game/constants.js';

const DT = 1 / 240;

// Траса з функції y(x) у пікселях.
function track(fn, from = -400, to = 24000, mat = MAT.dirt) {
  const t = new Track();
  t.x0 = from;
  for (let x = from; x <= to; x += DX) t.push(fn(x), mat);
  return t;
}

function ride(bike, t, sec, input, onStep) {
  let crash = null;
  for (let i = 0; i < sec / DT; i++) {
    const r = bike.step(DT, typeof input === 'function' ? input(bike, i * DT) : input, t, {});
    if (r.crash && !crash) crash = r.crash;
    onStep?.(bike, r);
  }
  return crash;
}

const NONE = { pedal: 0, brake: 0, lean: 0 };

describe('фізика велосипеда', () => {
  it('стоїть на рівному: підвіска просідає на ~30% ходу, байк не повзе й не перекидається', () => {
    for (const spec of BIKES) {
      const t = track(() => 160);
      const b = new BikeBody(spec);
      b.place(t, 0);
      ride(b, t, 2, NONE);
      expect(Math.abs(b.x), spec.id).toBeLessThan(0.05 * M);
      expect(Math.abs(b.a), spec.id).toBeLessThan(0.05);
      expect(b.rear.contact && b.front.contact, spec.id).toBeTruthy();
      if (spec.travelF > 0) {
        const sag = b.front.s / b.front.def.L;
        expect(sag, spec.id).toBeGreaterThan(0.15);
        expect(sag, spec.id).toBeLessThan(0.45);
      }
    }
  });

  it('педалі: реалістичний розгін і максимальна швидкість на рівному', () => {
    const t = track(() => 160);
    const b = new BikeBody(getBike('trail'));
    b.place(t, 0);
    let t20 = null;
    ride(b, t, 25, { pedal: 1, brake: 0, lean: 0 }, (bk) => {
      if (t20 === null && kmh(bk.speed) >= 20) t20 = bk.x;
    });
    expect(t20).not.toBeNull();
    const top = kmh(b.speed);
    expect(top).toBeGreaterThan(33);
    expect(top).toBeLessThan(50);
  });

  it('гальма зупиняють з ~40 км/год за 8–16 м і не перекидають через кермо', () => {
    const t = track(() => 160);
    const b = new BikeBody(getBike('trail'));
    b.place(t, 0);
    ride(b, t, 20, { pedal: 1, brake: 0, lean: 0 });
    const x0 = b.x;
    expect(kmh(b.speed)).toBeGreaterThan(35);
    const crash = ride(b, t, 5, { pedal: 0, brake: 1, lean: 0 });
    expect(crash).toBeNull();
    expect(kmh(b.speed)).toBeLessThan(1);
    const dist = (b.x - x0) / M;
    expect(dist).toBeGreaterThan(8);
    expect(dist).toBeLessThan(16);
  });

  it('на льоду гальмівний шлях у рази довший', () => {
    const run = (mat) => {
      const t = track(() => 160, -400, 30000, mat);
      const b = new BikeBody(getBike('trail'));
      b.place(t, 0);
      b.vx = 8 * M;
      for (const wh of b.wheels) wh.spin = (8 * M) / b.P.R;
      const x0 = b.x;
      ride(b, t, 12, { pedal: 0, brake: 1, lean: 0 });
      return (b.x - x0) / M;
    };
    expect(run(MAT.ice)).toBeGreaterThan(run(MAT.dirt) * 3);
  });

  it('з гори котиться сам і розганяється', () => {
    const t = track((x) => 160 + Math.max(0, x) * 0.15);
    const b = new BikeBody(getBike('trail'));
    b.place(t, 0);
    const crash = ride(b, t, 10, NONE);
    expect(crash).toBeNull();
    expect(kmh(b.speed)).toBeGreaterThan(30);
  });

  it('педалювання підіймає ніс: на крутому підйомі без нахилу вперед — перекид назад', () => {
    const t = track((x) => 900 - Math.max(0, x) * 0.25);
    const lazy = new BikeBody(getBike('trail'));
    lazy.place(t, 0);
    expect(ride(lazy, t, 8, { pedal: 1, brake: 0, lean: 0 })).not.toBeNull();
    const good = new BikeBody(getBike('trail'));
    good.place(t, 0);
    expect(ride(good, t, 8, { pedal: 1, brake: 0, lean: 0.6 })).toBeNull();
  });

  it('нахил назад піднімає переднє колесо (вілі)', () => {
    const t = track(() => 160);
    const b = new BikeBody(getBike('trail'));
    b.place(t, 0);
    ride(b, t, 3, { pedal: 1, brake: 0, lean: 0 });
    let lifted = false;
    ride(b, t, 0.6, { pedal: 1, brake: 0, lean: -1 }, (bk) => {
      if (bk.rear.contact && !bk.front.contact) lifted = true;
    });
    expect(lifted).toBe(true);
  });

  it('у повітрі нахил крутить байк (сальто), легкий дьорт — швидше за даунхіл', () => {
    const spinFor = (id) => {
      const t = track(() => 4000);
      const b = new BikeBody(getBike(id));
      b.x = 0;
      b.y = 0;
      let rot = 0;
      let prev = 0;
      ride(b, t, 0.8, { pedal: 0, brake: 0, lean: -1 }, (bk) => {
        let da = bk.a - prev;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        rot += da;
        prev = bk.a;
      });
      return rot;
    };
    expect(spinFor('trail')).toBeLessThan(-3); // > 170° назад за 0.8 с
    expect(Math.abs(spinFor('dirt'))).toBeGreaterThan(Math.abs(spinFor('downhill')));
  });

  it('приземлення догори дриґом — падіння (голова торкається землі)', () => {
    const t = track(() => 160);
    const b = new BikeBody(getBike('trail'));
    b.x = 0;
    b.y = 160 - 3 * M;
    b.a = Math.PI;
    const crash = ride(b, t, 1.5, NONE);
    expect(['head', 'shoulder', 'hip']).toContain(crash);
  });

  it('жорстке приземлення на рівне з великої висоти «пробиває» підвіску', () => {
    const dropTo = (h) => {
      const t = track((x) => (x < 30 * M ? 160 : 160 + h * M));
      const b = new BikeBody(getBike('trail'));
      b.place(t, 0);
      return ride(b, t, 12, (bk) => {
        if (!bk.grounded) return { pedal: 0, brake: 0, lean: Math.max(-1, Math.min(1, -bk.a * 3 - bk.w * 0.5)) };
        return { pedal: kmh(bk.speed) < 25 && bk.x < 26 * M ? 1 : 0, brake: 0, lean: 0 };
      });
    };
    expect(dropTo(0.8)).toBeNull();
    expect(dropTo(6)).toBe('hard');
  });

  it('хардтейл не має задньої підвіски, даунхіл має найбільший хід', () => {
    expect(deriveBike(getBike('hardtail')).rear.rigidFrame).toBe(true);
    expect(deriveBike(getBike('trail')).rear.rigidFrame).toBe(false);
    const travel = (id) => deriveBike(getBike(id)).front.L;
    expect(travel('downhill')).toBeGreaterThan(travel('enduro'));
    expect(travel('enduro')).toBeGreaterThan(travel('trail'));
  });

  it('після падіння байк котиться сам, без райдера', () => {
    const t = track((x) => 160 + Math.max(0, x) * 0.1);
    const b = new BikeBody(getBike('trail'));
    b.place(t, 0);
    ride(b, t, 2, NONE);
    const m0 = b.P.m;
    b.detachRider();
    expect(b.P.m).toBeLessThan(m0 / 3);
    const crash = ride(b, t, 2, { pedal: 1, brake: 0, lean: -1 });
    expect(crash).toBeNull();
    expect(b.pedaling).toBe(false);
  });
});
