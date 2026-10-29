import { useState } from 'react';
import Icon from './Icon.jsx';

const coarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// Сенсорні кнопки як у мобільних MTB-іграх: зліва — нахил назад / уперед, справа — гальмо і педалі,
// над педалями — банні-хоп. Працює і мишею: затисни кнопку миші на потрібній кнопці.
const BUTTONS = [
  { id: 'back', side: 'left', icon: 'rotateBack', label: 'Нахил назад' },
  { id: 'forward', side: 'left', icon: 'rotateFwd', label: 'Нахил уперед' },
  { id: 'brake', side: 'right', icon: 'brake', label: 'Гальмо' },
  { id: 'pedal', side: 'right', icon: 'pedal', label: 'Педалі' },
];

export default function TouchControls({ onButton, showHints }) {
  const [active, setActive] = useState({});
  const [touch] = useState(coarse);

  const bind = (id) => {
    const release = () => {
      onButton(id, false);
      setActive((a) => ({ ...a, [id]: false }));
    };
    return {
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onButton(id, true);
        setActive((a) => ({ ...a, [id]: true }));
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onContextMenu: (e) => e.preventDefault(),
    };
  };

  // на комп'ютері керують клавіатурою — кнопки лише на сенсорних екранах
  if (!touch) return null;
  return (
    <div className={`touch ${showHints ? 'is-visible' : ''}`}>
      {['left', 'right'].map((side) => (
        <div key={side} className={`touch__group touch__group--${side}`}>
          {side === 'right' && (
            <button type="button" className={`touch__btn touch__btn--hop ${active.hop ? 'is-active' : ''}`} aria-label="Банні-хоп" {...bind('hop')}>
              <Icon name="arrowUp" />
            </button>
          )}
          {BUTTONS.filter((b) => b.side === side).map((b) => (
            <button type="button" key={b.id} className={`touch__btn touch__btn--${b.id} ${active[b.id] ? 'is-active' : ''}`} aria-label={b.label} {...bind(b.id)}>
              <Icon name={b.icon} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
