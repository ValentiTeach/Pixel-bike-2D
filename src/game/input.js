// Керування: клавіатура (← → / A D) і сенсорні зони (ліва/права половина екрана).
// Якщо натиснуто обидва напрямки — перемагає той, що натиснули останнім.

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);

export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.last = 0;
    this.onKeyDown = (e) => {
      if (LEFT_KEYS.has(e.code)) {
        this.left = true;
        this.last = -1;
        e.preventDefault();
      } else if (RIGHT_KEYS.has(e.code)) {
        this.right = true;
        this.last = 1;
        e.preventDefault();
      }
    };
    this.onKeyUp = (e) => {
      if (LEFT_KEYS.has(e.code)) this.left = false;
      else if (RIGHT_KEYS.has(e.code)) this.right = false;
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

  clear() {
    this.left = this.right = this.touchLeft = this.touchRight = false;
  }

  // -1, 0 або 1
  direction() {
    const l = this.left || this.touchLeft;
    const r = this.right || this.touchRight;
    if (l && r) return this.last;
    return l ? -1 : r ? 1 : 0;
  }
}
