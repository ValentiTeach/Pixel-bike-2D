// Звук без жодного аудіофайлу: ефекти, «живий» звук їзди і чіптюн-музика через Web Audio API.
// Звук їзди синтезується безперервно: шурхіт шин (фільтрований шум, тембр залежить від покриття),
// свист вітру на швидкості, вереск заносу і характерна тріскачка втулки, коли котишся без педалей.
// AudioContext створюється лише після першої дії користувача (вимога браузерів).

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

export function noteToFreq(note) {
  const m = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!m) return null;
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

const seq = (str) => str.trim().split(/\s+/).map((t) => (t === '.' ? null : t));

// Треки: bpm, ноти мелодії/басу по 16-х (кожен рядок — такт), барабани: k — бочка, s — малий, h — хет.
export const TRACKS = {
  menu: {
    bpm: 112,
    wave: 'square',
    lead: seq(`G4 . B4 . D5 . B4 . C5 . E5 . D5 . B4 .  G4 . B4 . D5 . G5 . F#5 . D5 . E5 . D5 .`),
    bass: seq(`G2 . . . G2 . . . C3 . . . D3 . . .  G2 . . . G2 . . . D3 . . . D3 . . .`),
    drums: 'k...h...k.k.h...k...h...k.k.h.h.',
  },
  city: {
    bpm: 138,
    wave: 'square',
    lead: seq(`E5 . G5 E5 C6 . G5 . A5 . G5 . E5 . D5 .  E5 . G5 E5 C6 . D6 . E6 . D6 C6 A5 . G5 .`),
    bass: seq(`C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .  C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .`),
    drums: 'k.h.s.h.k.h.s.hhk.h.s.h.k.k.s.hh',
  },
  forest: {
    bpm: 118,
    wave: 'triangle',
    lead: seq(`A4 . C5 . E5 . D5 . C5 . B4 . A4 . . .  G4 . B4 . D5 . C5 . B4 . A4 . G4 . E4 .`),
    bass: seq(`A2 . . . E2 . . . F2 . . . G2 . . .  A2 . . . E2 . . . F2 . . . E2 . . .`),
    drums: 'k...h...k.k.h...k...h...k.k.h.h.',
  },
  desert: {
    bpm: 126,
    wave: 'square',
    lead: seq(`E5 F5 . E5 . D5 . C5 B4 . C5 . B4 A4 . .  E5 F5 . E5 . G5 . F5 E5 . D5 . E5 . . .`),
    bass: seq(`E2 . E2 . E2 . F2 . E2 . E2 . D2 . E2 .  E2 . E2 . E2 . F2 . G2 . F2 . E2 . . .`),
    drums: 'k..hs..hk.k.s..hk..hs..hk.k.s.hh',
  },
  snow: {
    bpm: 108,
    wave: 'triangle',
    lead: seq(`D5 . F#5 . A5 . F#5 . G5 . E5 . C#5 . A4 .  D5 . F#5 . A5 . D6 . C#6 . A5 . E5 . F#5 .`),
    bass: seq(`D3 . . . A2 . . . G2 . . . A2 . . .  D3 . . . A2 . . . G2 . . . A2 . . .`),
    drums: 'k.......h.......k.......h...h...',
  },
  beach: {
    bpm: 132,
    wave: 'square',
    lead: seq(`F5 . A5 . C6 . A5 F5 G5 . A#5 . A5 . F5 .  F5 . A5 . C6 . D6 C6 A#5 . A5 . G5 . F5 .`),
    bass: seq(`F2 . . F2 . . C3 . A#2 . . A#2 . . C3 .  F2 . . F2 . . C3 . A#2 . . A#2 . C3 . .`),
    drums: 'k..hs.h.k.hhs.h.k..hs.h.k.hhs.hh',
  },
  night: {
    bpm: 148,
    wave: 'sawtooth',
    lead: seq(`C5 . D#5 . G5 . D#5 . A#4 . D5 . F5 . D5 .  G#4 . C5 . D#5 . G5 . G5 . F5 . D#5 . D5 .`),
    bass: seq(`C2 C3 C2 C3 C2 C3 C2 C3 A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2  G#1 G#2 G#1 G#2 G#1 G#2 G#1 G#2 G1 G2 G1 G2 G1 G2 G1 G2`),
    drums: 'k.h.s.h.k.h.s.h.k.h.s.h.k.k.s.hs',
  },
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.settings = { music: true, sfx: true, volume: 0.6 };
    this.track = null; // бажаний трек
    this.playing = null; // трек, що реально грає
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
  }

  // Викликати з обробника кліку/клавіші.
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applySettings();
      this.initRide();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.track && !this.playing) this.startMusic(this.track);
  }

  setSettings(s) {
    this.settings = { ...this.settings, ...s };
    this.applySettings();
  }

  applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.volume, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.settings.music ? 0.32 : 0, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfx ? 0.55 : 0, t, 0.02);
  }

  // ---------- Безперервний звук їзди ----------
  initRide() {
    const ctx = this.ctx;
    const loop = (filters, gainNode) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      let node = src;
      for (const f of filters) node = node.connect(f);
      node.connect(gainNode).connect(this.sfxGain);
      src.start();
      return src;
    };
    const bq = (type, freq, Q = 0.8) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = Q;
      return f;
    };
    const gain = () => {
      const g = ctx.createGain();
      g.gain.value = 0;
      return g;
    };
    this.rollFilter = bq('bandpass', 500, 0.7);
    this.rollGain = gain();
    loop([this.rollFilter], this.rollGain);
    this.windGain = gain();
    loop([bq('highpass', 500), bq('lowpass', 2200)], this.windGain);
    this.skidGain = gain();
    loop([bq('bandpass', 2400, 3)], this.skidGain);
    this.tickRate = 0;
    this.nextTick = 0;
    this.tickTimer = setInterval(() => this.scheduleTicks(), 25);
  }

  // Тембр шурхоту шин для покриттів: [частота фільтра, гучність].
  static SURFACE = {
    dirt: [420, 1], roots: [380, 1.1], grass: [300, 0.7], rock: [900, 1.15], wood: [650, 1.2], sand: [260, 0.9], snow: [220, 0.8],
    ice: [1600, 0.5], mud: [180, 1], concrete: [1100, 0.8], water: [700, 1.4], log: [500, 1], gravel: [1500, 1.3], gap: [400, 0],
  };

  /**
   * Щокадрове оновлення звуку їзди.
   * @param {{speed:number, grounded:boolean, mat:string|null, skid:boolean, pedaling:boolean, wheelSpin:number, active:boolean}} st
   */
  updateRide(st) {
    if (!this.ctx || !this.rollGain) return;
    const t = this.ctx.currentTime;
    const on = st.active && this.settings.sfx;
    const [freq, k] = AudioManager.SURFACE[st.mat] ?? AudioManager.SURFACE.dirt;
    const v = st.speed;
    this.rollFilter.frequency.setTargetAtTime(freq * (0.8 + Math.min(1, v / 12) * 0.5), t, 0.05);
    this.rollGain.gain.setTargetAtTime(on && st.grounded ? Math.min(0.32, (0.015 + v * 0.016) * k) : 0, t, 0.04);
    this.windGain.gain.setTargetAtTime(on ? Math.min(0.2, v * v * 0.0011) : 0, t, 0.1);
    this.skidGain.gain.setTargetAtTime(on && st.skid && st.grounded ? 0.12 : 0, t, 0.03);
    // тріскачка: собачки втулки клацають, коли колесо обганяє педалі
    const revs = st.wheelSpin / (2 * Math.PI * 0.37);
    this.tickRate = on && !st.pedaling && st.wheelSpin > 0.6 ? Math.min(70, revs * 24) : 0;
  }

  stopRide() {
    if (!this.ctx || !this.rollGain) return;
    this.updateRide({ speed: 0, grounded: false, mat: null, skid: false, pedaling: false, wheelSpin: 0, active: false });
  }

  scheduleTicks() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.tickRate <= 0) {
      this.nextTick = now;
      return;
    }
    if (this.nextTick < now) this.nextTick = now;
    while (this.nextTick < now + 0.06) {
      this.tone(3400 + Math.random() * 400, this.nextTick, 0.008, { wave: 'square', vol: 0.025 });
      this.nextTick += (1 / this.tickRate) * (0.85 + Math.random() * 0.3);
    }
  }

  // ---------- Примітиви ----------
  tone(freq, start, dur, { wave = 'square', vol = 0.3, slide = 0, dest = this.sfxGain } = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  noise(start, dur, { vol = 0.3, filter = 2000, type = 'lowpass', dest = this.sfxGain } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filter;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(start, Math.random() * 0.5);
    src.stop(start + dur + 0.02);
  }

  // ---------- Звукові ефекти ----------
  play(name, opts = {}) {
    if (!this.ctx || !this.settings.sfx) return;
    const t = this.ctx.currentTime + 0.005;
    const power = opts.power ?? 0.5;
    switch (name) {
      case 'coin':
        this.tone(988, t, 0.06, { vol: 0.14 });
        this.tone(1319, t + 0.06, 0.12, { vol: 0.14 });
        break;
      case 'bigcoin':
        [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, t + i * 0.05, 0.1, { vol: 0.16 }));
        break;
      case 'land':
        // удар підвіски: глухий «бум» + шурхіт
        this.tone(90, t, 0.12 + power * 0.1, { wave: 'sine', vol: 0.2 + power * 0.35, slide: -50 });
        this.noise(t, 0.08 + power * 0.12, { vol: 0.12 + power * 0.3, filter: 500 });
        if (power > 0.6) this.noise(t + 0.02, 0.05, { vol: 0.12, filter: 3000, type: 'highpass' });
        break;
      case 'thud':
        this.tone(70, t, 0.18, { wave: 'sine', vol: 0.25 + power * 0.3, slide: -30 });
        this.noise(t, 0.15, { vol: 0.2 + power * 0.2, filter: 400 });
        break;
      case 'scrape':
        this.noise(t, 0.12, { vol: 0.12, filter: 3500, type: 'bandpass' });
        break;
      case 'hop':
        this.noise(t, 0.08, { vol: 0.08, filter: 900 });
        break;
      case 'checkpoint':
        this.tone(1568, t, 0.35, { wave: 'triangle', vol: 0.2 });
        this.tone(2093, t + 0.08, 0.5, { wave: 'triangle', vol: 0.16 });
        break;
      case 'trick':
        this.noise(t, 0.25, { vol: 0.1, filter: 1800, type: 'bandpass' });
        [784, 988, 1175].forEach((f, i) => this.tone(f, t + 0.05 + i * 0.07, 0.14, { wave: 'triangle', vol: 0.18 }));
        break;
      case 'respawn':
        this.tone(440, t, 0.12, { wave: 'triangle', vol: 0.15, slide: 300 });
        break;
      case 'splashBig':
        this.noise(t, 0.6, { vol: 0.45, filter: 1200 });
        this.noise(t + 0.05, 0.4, { vol: 0.2, filter: 3000, type: 'highpass' });
        break;
      case 'crash':
        // удар тіла об землю і брязкіт велосипеда
        this.noise(t, 0.5, { vol: 0.55, filter: 700 });
        this.tone(80, t, 0.35, { wave: 'sine', vol: 0.4, slide: -40 });
        this.noise(t + 0.08, 0.25, { vol: 0.18, filter: 4000, type: 'highpass' });
        break;
      case 'splash':
        this.noise(t, 0.3, { vol: 0.25, filter: 1400 });
        break;
      case 'beep':
        this.tone(440, t, 0.12, { vol: 0.22 });
        break;
      case 'go':
        this.tone(880, t, 0.3, { vol: 0.25 });
        break;
      case 'finish':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.1, i === 5 ? 0.4 : 0.12, { vol: 0.22 }));
        break;
      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, t + i * 0.16, 0.2, { wave: 'triangle', vol: 0.3 }));
        break;
      case 'click':
        this.tone(1200, t, 0.04, { vol: 0.12 });
        break;
      case 'buy':
        [660, 880, 1320].forEach((f, i) => this.tone(f, t + i * 0.07, 0.1, { vol: 0.2 }));
        break;
      case 'error':
        this.tone(160, t, 0.18, { wave: 'square', vol: 0.2 });
        break;
      default:
        break;
    }
  }

  // ---------- Музика (простий секвенсор із запасом планування) ----------
  startMusic(id) {
    this.track = id;
    if (!this.ctx) return; // заграє після unlock()
    if (this.playing === id) return;
    this.stopMusic(true);
    const tr = TRACKS[id];
    if (!tr) return;
    this.playing = id;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic(keepTrack = false) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = null;
    if (!keepTrack) this.track = null;
  }

  schedule() {
    const tr = TRACKS[this.playing];
    if (!tr || !this.ctx) return;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const i = this.step;
      const t = this.nextTime;
      const lead = tr.lead[i % tr.lead.length];
      const bass = tr.bass[i % tr.bass.length];
      const drum = tr.drums[i % tr.drums.length];
      if (lead) this.tone(noteToFreq(lead), t, stepDur * 1.6, { wave: tr.wave, vol: 0.09, dest: this.musicGain });
      if (bass) this.tone(noteToFreq(bass), t, stepDur * 1.8, { wave: 'triangle', vol: 0.2, dest: this.musicGain });
      if (drum === 'k') this.tone(150, t, 0.12, { wave: 'sine', vol: 0.35, slide: -110, dest: this.musicGain });
      else if (drum === 's') this.noise(t, 0.1, { vol: 0.16, filter: 3000, type: 'highpass', dest: this.musicGain });
      else if (drum === 'h') this.noise(t, 0.03, { vol: 0.07, filter: 7000, type: 'highpass', dest: this.musicGain });
      this.step += 1;
      this.nextTime += stepDur;
    }
  }
}

export const audio = new AudioManager();
