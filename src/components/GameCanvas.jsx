import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine.js';
import { VIEW_W, VIEW_H } from '../game/constants.js';

// Обгортка над ігровим рушієм: створює GameEngine при монтуванні і знищує при демонтуванні.
// Колбеки зберігаються в ref, щоб їх зміна не перезапускала гру.
export default function GameCanvas({ locationId, mode, skin, shake = true, onHud, onEnd, engineRef, className = '' }) {
  const canvasRef = useRef(null);
  const callbacks = useRef({ onHud, onEnd });

  useEffect(() => {
    callbacks.current = { onHud, onEnd };
  }, [onHud, onEnd]);

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, {
      locationId,
      mode,
      skin,
      shake,
      callbacks: {
        onHud: (h) => callbacks.current.onHud?.(h),
        onEnd: (r) => callbacks.current.onEnd?.(r),
      },
    });
    if (engineRef) engineRef.current = engine;
    // у режимі розробки рушій доступний з консолі: window.__pixelBike.world.hearts = 99
    if (import.meta.env.DEV && mode !== 'demo') window.__pixelBike = engine;
    engine.start();
    return () => {
      engine.destroy();
      if (engineRef) engineRef.current = null;
    };
  }, [locationId, mode, skin, shake, engineRef]);

  return <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} className={`game-canvas ${className}`} />;
}
