import { useState } from 'react';
import PxIcon from './PxIcon.jsx';

const coarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// Дві невидимі сенсорні зони: ліва половина — вліво, права — вправо. Працює і мишею.
export default function TouchControls({ onTouch, showHints }) {
  const [active, setActive] = useState({ '-1': false, 1: false });
  const [hints] = useState(coarse);

  const zone = (side) => {
    const release = () => {
      onTouch(side, false);
      setActive((a) => ({ ...a, [side]: false }));
    };
    return {
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onTouch(side, true);
        setActive((a) => ({ ...a, [side]: true }));
      },
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onContextMenu: (e) => e.preventDefault(),
    };
  };

  return (
    <div className="touch">
      <div className={`touch__zone touch__zone--left ${active[-1] ? 'is-active' : ''}`} {...zone(-1)}>
        {hints && showHints && <PxIcon name="left" size={3} className="touch__arrow" />}
      </div>
      <div className={`touch__zone touch__zone--right ${active[1] ? 'is-active' : ''}`} {...zone(1)}>
        {hints && showHints && <PxIcon name="right" size={3} className="touch__arrow" />}
      </div>
    </div>
  );
}
