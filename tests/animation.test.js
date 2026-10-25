import { describe, it, expect } from 'vitest';
import { World } from '../src/game/world.js';
import { LOCATIONS } from '../src/game/locations.js';
import { GROUND_Y } from '../src/game/constants.js';
import { drawRider, RIDER_CANVAS } from '../src/game/bikeSprite.js';

const DT = 1 / 120;

// Рівна земля без перешкод — щоб перевіряти лише анімацію.
function flatWorld() {
  const w = new World({ location: LOCATIONS[0], mode: 'level', seed: 1 });
  w.countdown = 0;
  w.update(DT);
  w.segments.length = 0;
  w.entities.length = 0;
  w.addSegment(-1000, 100000, GROUND_Y);
  w.gen.ensure = () => {};
  return w;
}

const run = (w, sec) => {
  for (let i = 0; i < sec * 120; i++) w.update(DT);
};

describe('анімація велосипедиста', () => {
  it('педалі крутяться від швидкості, а колеса — завжди', () => {
    const w = flatWorld();
    run(w, 1);
    const p = w.player;
    const pedal0 = p.pedal;
    const wheel0 = p.wheel;
    run(w, 0.5);
    expect(p.pedaling).toBe(true);
    expect(p.pedal).toBeGreaterThan(pedal0);
    expect(p.wheel).toBeGreaterThan(wheel0);
    expect(p.pose).toBe('ride');
  });

  it('при розгоні — стоячи на педалях, при гальмуванні — пригнувшись і накатом', () => {
    const w = flatWorld();
    run(w, 1);
    w.dir = 1;
    run(w, 0.3);
    expect(w.player.pose).toBe('stand');
    w.dir = -1;
    run(w, 0.2);
    expect(w.player.pose).toBe('tuck');
    const pedal = w.player.pedal;
    run(w, 0.2);
    expect(w.player.pedaling).toBe(false);
    expect(w.player.pedal).toBe(pedal);
  });

  it('у стрибку: поза «air», ніс угору на зльоті, вниз при падінні; після приземлення амортизація просідає', () => {
    const w = flatWorld();
    run(w, 1);
    w.jumpHeld = true;
    w.pressJump();
    run(w, 0.12);
    expect(w.player.pose).toBe('air');
    expect(w.player.pitch).toBeLessThan(-0.05);
    run(w, 0.4);
    expect(w.player.pitch).toBeGreaterThan(0.02);
    let maxCrouch = 0;
    for (let i = 0; i < 60; i++) {
      w.update(DT);
      if (w.player.onGround) maxCrouch = Math.max(maxCrouch, w.player.crouch);
    }
    expect(maxCrouch).toBeGreaterThan(0.8);
    run(w, 1);
    expect(Math.abs(w.player.crouch)).toBeLessThan(0.1);
    expect(Math.abs(w.player.pitch)).toBeLessThan(0.01);
  });

  it('при аварії райдер злітає з велосипеда і падає на землю', () => {
    const w = flatWorld();
    run(w, 1);
    w.hearts = 1;
    const e = w.spawn('cone', w.player.x + w.player.w, GROUND_Y - 9);
    e.active = true;
    run(w, 0.3);
    expect(w.phase).toBe('crash');
    expect(w.rider).not.toBeNull();
    expect(w.rider.x).toBeGreaterThan(w.player.x);
    run(w, 1.4);
    expect(w.rider.onGround).toBe(true);
  });

  it('усі пози малюються в межах полотна при будь-якому нахилі', () => {
    for (const pose of ['ride', 'stand', 'tuck', 'air']) {
      for (const pitch of [-0.4, 0, 0.4, 1.5, 3]) {
        for (const part of ['all', 'bike', 'rider']) {
          let n = 0;
          const ctx = {
            fillStyle: '',
            fillRect: (x, y) => {
              n++;
              expect(x >= 0 && y >= 0 && x < RIDER_CANVAS.w && y < RIDER_CANVAS.h).toBe(true);
            },
          };
          drawRider(ctx, {}, { pedal: 1, wheel: 2, pitch, pose, crouch: 1, bob: 1, sway: 1, blur: 0.8, part });
          expect(n, `${pose}/${pitch}/${part}`).toBeGreaterThan(40);
        }
      }
    }
  });
});
