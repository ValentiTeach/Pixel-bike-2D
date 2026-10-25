import { useState } from 'react';
import Icon from './Icon.jsx';

const coarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// Сенсорні зони на весь екран: зліва — «гальмо» і «розгін», справа (більша частина) — «стрибок».
// Працює і мишею: затисни кнопку миші в потрібній зоні.
export default function TouchControls({ onTouch, onJump, showHints }) {
  const [active, setActive] = useState({});
  const [hints] = useState(coarse);

  const zone = (id, press) => {
    const release = () => {
      press(false);
      setActive((a) => ({ ...a, [id]: false }));
    };
    return {
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        press(true);
        setActive((a) => ({ ...a, [id]: true }));
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onContextMenu: (e) => e.preventDefault(),
    };
  };

  const show = hints && showHints;
  return (
    <div className="touch">
      <div className={`touch__zone touch__zone--brake ${active.brake ? 'is-active' : ''}`} {...zone('brake', (p) => onTouch(-1, p))}>
        {show && (
          <span className="touch__btn" aria-label="Гальмо">
            <Icon name="chevronLeft" />
          </span>
        )}
      </div>
      <div className={`touch__zone touch__zone--boost ${active.boost ? 'is-active' : ''}`} {...zone('boost', (p) => onTouch(1, p))}>
        {show && (
          <span className="touch__btn" aria-label="Розгін">
            <Icon name="chevronRight" />
          </span>
        )}
      </div>
      <div className={`touch__zone touch__zone--jump ${active.jump ? 'is-active' : ''}`} {...zone('jump', onJump)}>
        {show && (
          <span className="touch__btn touch__btn--jump" aria-label="Стрибок">
            <Icon name="arrowUp" />
          </span>
        )}
      </div>
    </div>
  );
}
