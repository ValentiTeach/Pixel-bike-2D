// Керування: клавіатура і сенсорні кнопки.
//   ← / A — гальмувати, → / D — розганятися, Пробіл / ↑ / W — стрибок (довше тримаєш — вище стрибок).
// Якщо натиснуто обидва напрямки — перемагає той, що натиснули останнім.

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ']);

export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.jumpKey = false;
    this.jumpTouch = false;
    this.jumpPresses = 0;
    this.last = 0;
    this.onKeyDown = (e) => {
      if (LEFT_KEYS.has(e.code)) {
        this.left = true;
        this.last = -1;
      } else if (RIGHT_KEYS.has(e.code)) {
        this.right = true;
        this.last = 1;
      } else if (JUMP_KEYS.has(e.code)) {
        if (!e.repeat && !this.jumpKey) this.jumpPresses += 1;
        this.jumpKey = true;
      } else return;
      e.preventDefault();
    };
    this.onKeyUp = (e) => {
      if (LEFT_KEYS.has(e.code)) this.left = false;
      else if (RIGHT_KEYS.has(e.code)) this.right = false;
      else if (JUMP_KEYS.has(e.code)) this.jumpKey = false;
    };
    this.onBlur = () => this.clear();
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

  setTouch(side, pressed) {
    if (side < 0) this.touchLeft = pressed;
    else this.touchRight = pressed;
    if (pressed) this.last = side;
  }

  setJump(pressed) {
    if (pressed && !this.jumpTouch) this.jumpPresses += 1;
    this.jumpTouch = pressed;
  }

  clear() {
    this.left = this.right = this.touchLeft = this.touchRight = this.jumpKey = this.jumpTouch = false;
    this.jumpPresses = 0;
  }

  // -1 гальмо, 0, 1 розгін
  direction() {
    const l = this.left || this.touchLeft;
    const r = this.right || this.touchRight;
    if (l && r) return this.last;
    return l ? -1 : r ? 1 : 0;
  }

  jumpHeld() {
    return this.jumpKey || this.jumpTouch;
  }

  // Скільки разів натиснули стрибок з минулого кадру (і скидає лічильник).
  consumeJumpPresses() {
    const n = this.jumpPresses;
    this.jumpPresses = 0;
    return n;
  }
}
