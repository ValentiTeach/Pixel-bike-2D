// Калібрування цільового часу трас: бот проїжджає кожну трасу на трейловому байку,
// скрипт друкує його час і пропонує «золото» (93%) і «срібло» (115%) для locations.js.
//   npm run calibrate            — усі траси
//   npm run calibrate -- forest  — одна траса
import { World } from '../src/game/world.js';
import { botInput } from '../src/game/bot.js';
import { LOCATIONS } from '../src/game/locations.js';

const ids = process.argv.slice(2);
const DT = 1 / 240;
for (const loc of LOCATIONS) {
  if (ids.length && !ids.includes(loc.id)) continue;
  const w = new World({ location: loc, mode: 'level', seed: loc.seed, bikeId: 'trail' });
  w.countdown = 0;
  let t = 0;
  while (w.phase !== 'over' && t < 900) {
    if (w.phase === 'ride') w.setInput(botInput(w));
    w.update(DT);
    w.events.length = 0;
    t += DT;
  }
  const r = w.result;
  if (!r?.completed) {
    console.log(`${loc.id}: бот не доїхав (${Math.round(w.distance / 16)} м) — траса нечесна?`);
    continue;
  }
  const gold = Math.round(r.time * 0.93);
  const silver = Math.round(r.time * 1.15);
  const ok = r.time > loc.times.gold && r.time < loc.times.silver ? 'ok' : 'ОНОВИТИ';
  console.log(`${loc.id.padEnd(7)} бот ${r.time.toFixed(1)} с, падінь ${r.crashes} → times: { gold: ${gold}, silver: ${silver} }   зараз ${loc.times.gold}/${loc.times.silver} ${ok}`);
}
