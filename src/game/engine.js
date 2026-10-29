// Ігровий рушій: склеює World (логіка), Renderer (малювання), Input і звук.
// Працює на requestAnimationFrame; довгі кадри розбиваються на дрібні кроки симуляції (1/240 с).
import { MAX_FRAME_DT, MAX_STEP } from './constants.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { getLocation } from './locations.js';
import { audio } from './audio.js';

const SOUND_EVENTS = new Set(['coin', 'bigcoin', 'beep', 'go', 'land', 'thud', 'scrape', 'checkpoint', 'trick', 'respawn', 'splash', 'splashBig']);
const HUD_INTERVAL = 0.1;

const vibrate = (ms) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* деякі браузери забороняють вібрацію */
  }
};

export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} o
   * @param {string} o.locationId
   * @param {'level'|'endless'|'demo'} o.mode
   * @param {object} o.skin       екіпірування райдера з skins.js
   * @param {string} [o.bikeId]   велосипед з bikes.js
   * @param {number} [o.seed]     у режимі рівня — фіксований сід траси
   * @param {boolean} [o.shake]   тряска екрана при ударах
   * @param {object} [o.callbacks] onHud(hud), onEnd(result), onEvent(ev)
   */
  constructor(canvas, { locationId, mode = 'level', skin, bikeId = 'trail', seed, shake = true, callbacks = {} }) {
    this.location = getLocation(locationId);
    this.mode = mode;
    this.cb = callbacks;
    this.seed = seed ?? (mode === 'level' ? this.location.seed : Math.floor(Math.random() * 2 ** 31));
    this.world = new World({ location: this.location, mode, seed: this.seed, bikeId });
    this.renderer = new Renderer(canvas, this.location, skin);
    this.renderer.shakeEnabled = shake;
    this.input = new Input();
    this.paused = false;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.hudTimer = 0;
    this.hudKey = '';
    this.loop = this.loop.bind(this);
  }

  get isDemo() {
    return this.mode === 'demo';
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (!this.isDemo) {
      this.input.attach();
      audio.startMusic(this.location.music);
    }
    this.last = performance.now();
    this.renderer.render(this.world);
    this.emitHud(true);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    if (!this.isDemo) audio.stopRide();
  }

  setPaused(paused) {
    if (this.isDemo || this.paused === paused) return;
    this.paused = paused;
    this.input.clear();
    const over = this.world.phase === 'over';
    if (paused) {
      audio.stopMusic(true);
      audio.stopRide();
    } else if (!over) audio.startMusic(this.location.music);
  }

  // Сенсорні кнопки: 'pedal' | 'brake' | 'back' | 'forward' | 'hop'
  setButton(btn, pressed) {
    this.input.setButton(btn, pressed);
  }

  respawn() {
    this.world.requestRespawn();
  }

  loop(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(MAX_FRAME_DT, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (!this.paused) {
      if (!this.isDemo) {
        this.world.setInput(this.input.state());
        if (this.input.consumeRespawn()) this.world.requestRespawn();
      }
      const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) this.world.update(h);
      this.handleEvents();
      if (!this.isDemo) audio.updateRide(this.world.rideSound());
      this.hudTimer -= dt;
      this.emitHud(this.hudTimer <= 0);
    }
    this.renderer.render(this.world);
  }

  handleEvents() {
    const events = this.world.events;
    if (!events.length) return;
    if (this.isDemo) {
      events.length = 0;
      return;
    }
    for (const ev of events) {
      if (SOUND_EVENTS.has(ev.type)) audio.play(ev.type, ev);
      if (ev.type === 'land' && ev.power > 0.6) vibrate(30);
      if (ev.type === 'crash') {
        audio.play('crash');
        vibrate([90, 50, 160]);
      }
      if (ev.type === 'finish') {
        audio.stopMusic(true);
        audio.play('finish');
      }
      if (ev.type === 'trick' || ev.type === 'checkpoint' || ev.type === 'crash' || ev.type === 'respawn') this.cb.onEvent?.(ev);
      if (ev.type === 'end') {
        audio.stopRide();
        if (!ev.result.completed) {
          audio.stopMusic(true);
          audio.play('gameover');
        }
        this.emitHud(true);
        this.cb.onEnd?.(ev.result);
      }
    }
    events.length = 0;
  }

  // HUD оновлюємо ~10 разів/с або одразу, якщо змінилось щось важливе (фаза, монети, падіння).
  emitHud(force) {
    if (this.isDemo || !this.cb.onHud) return;
    const hud = this.world.hud();
    const key = `${hud.phase}|${hud.countdown}|${hud.coins}|${hud.crashes}|${hud.score}`;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    this.hudTimer = HUD_INTERVAL;
    this.cb.onHud(hud);
  }
}
