import { useEffect, useState } from 'react';
import { VIEW_W, VIEW_H } from '../game/constants.js';

// Розмір «ігрового пікселя» в CSS-пікселях: рамка 320×180 вписується у вікно.
// Округлюємо до 1/8, щоб пікселі виглядали рівно, і не опускаємось нижче 1.
// room — скільки місця лишається по боках (для бічних панелей з підказками).
function compute() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const u = Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H) * 8) / 8);
  return { u, room: w - VIEW_W * u };
}

export function useFrameScale() {
  const [state, setState] = useState(compute);
  useEffect(() => {
    const onResize = () => setState(compute());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return state;
}
