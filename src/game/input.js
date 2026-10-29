// Керування як у мобільних MTB-іграх: педалі, гальмо, нахил назад/уперед, банні-хоп.
//   ↑ / W — крутити педалі, ↓ / S — гальмо,
//   ← / A — нахил назад (вілі, у повітрі — бекфліп), → / D — нахил уперед (у повітрі — фронтфліп),
//   Пробіл — банні-хоп, R — повернутись на чекпоінт.
// Сенсорні кнопки (TouchControls) викликають ті самі «кнопки» через setButton.

const KEYS = {
  pedal: new Set(['ArrowUp', 'KeyW']),
  brake: new Set(['ArrowDown', 'KeyS']),
  back: new Set(['ArrowLeft', 'KeyA']),
  forward: new Set(['ArrowRight', 'KeyD']),
  hop: new Set(['Space', 'KeyZ']),
  respawn: new Set(['KeyR']),
};

export class Input {
  constructor() {
    this.keys = {};
    this.touch = {};
    this.presses = { hop: 0, respawn: 0 };
    this.lastLean = 0;
    this.onKeyDown = (e) => {
      const btn = this.buttonOf(e.code);
      if (!btn) return;
      e.preventDefault();
      if (e.repeat) return;
      this.press(btn, true, this.keys);
    };
    this.onKeyUp = (e) => {
      const btn = this.buttonOf(e.code);
      if (btn) this.keys[btn] = false;
    };
    this.onBlur = () => this.clear();
  }

  buttonOf(code) {
    for (const [btn, set] of Object.entries(KEYS)) if (set.has(code)) return btn;
    return null;
  }

  press(btn, pressed, store) {
    if (pressed && !store[btn] && (btn === 'hop' || btn === 'respawn')) this.presses[btn] += 1;
    if (pressed && btn === 'back') this.lastLean = -1;
    if (pressed && btn === 'forward') this.lastLean = 1;
    store[btn] = pressed;
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  // Сенсорна кнопка: 'pedal' | 'brake' | 'back' | 'forward' | 'hop'
  setButton(btn, pressed) {
    this.press(btn, pressed, this.touch);
  }

  clear() {
    this.keys = {};
    this.touch = {};
    this.presses = { hop: 0, respawn: 0 };
  }

  held(btn) {
    return Boolean(this.keys[btn] || this.touch[btn]);
  }

  // Стан для World.setInput. Якщо натиснуто обидва нахили — перемагає останній.
  state() {
    const back = this.held('back');
    const fwd = this.held('forward');
    let lean = 0;
    if (back && fwd) lean = this.lastLean;
    else if (back) lean = -1;
    else if (fwd) lean = 1;
    const hop = this.presses.hop > 0;
    this.presses.hop = 0;
    return { pedal: this.held('pedal') ? 1 : 0, brake: this.held('brake') ? 1 : 0, lean, hop };
  }

  consumeRespawn() {
    const n = this.presses.respawn;
    this.presses.respawn = 0;
    return n > 0;
  }
}
