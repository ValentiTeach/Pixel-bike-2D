import { useEffect, useState } from 'react';
import { VIEW_W, VIEW_H } from '../game/constants.js';

// Розмір «ігрового пікселя» в CSS-пікселях: рамка 180×320 вписується у вікно.
// Округлюємо до 1/8, щоб пікселі виглядали рівно, і не опускаємось нижче 1.
function compute() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const u = Math.min(w / VIEW_W, h / VIEW_H);
  return Math.max(1, Math.floor(u * 8) / 8);
}

export function useFrameScale() {
  const [u, setU] = useState(compute);
  useEffect(() => {
    const onResize = () => setU(compute());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return u;
}
