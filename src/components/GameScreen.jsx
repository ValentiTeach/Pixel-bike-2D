import { useCallback, useEffect, useRef, useState } from 'react';
import PxIcon from './PxIcon.jsx';
import GameCanvas from './GameCanvas.jsx';
import HUD from './HUD.jsx';
import TouchControls from './TouchControls.jsx';
import PauseMenu from './PauseMenu.jsx';
import ResultScreen from './ResultScreen.jsx';
import { getLocation } from '../game/locations.js';
import { getSkin } from '../game/skins.js';

export default function GameScreen({ run, save, setSave, onRunEnd, onRestart, onNext, onExit }) {
  const engineRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [paused, setPaused] = useState(false);
  const [summary, setSummary] = useState(null);
  const loc = getLocation(run.locationId);
  const phase = hud?.phase;

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  // коротке «ВПЕРЕД!» після відліку
  const go = phase === 'ride' && hud.phaseTime < 0.7 && hud.distanceM < 40;

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!summary) setPaused((p) => !p);
      } else if ((e.code === 'Enter' || e.code === 'Space') && summary && document.activeElement?.tagName !== 'BUTTON') {
        onRestart();
      }
    };
    const onVisibility = () => {
      if (document.hidden && !summary) setPaused(true);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [summary, onRestart]);

  const handleEnd = useCallback((result) => setSummary(onRunEnd(result)), [onRunEnd]);
  const handleTouch = useCallback((side, pressed) => engineRef.current?.setTouch(side, pressed), []);
  const handleJump = useCallback((pressed) => engineRef.current?.setJump(pressed), []);

  return (
    <div className={`screen game ${paused ? 'is-paused' : ''}`}>
      <GameCanvas
        engineRef={engineRef}
        locationId={run.locationId}
        mode={run.mode}
        skin={getSkin(save.skin)}
        shake={save.settings.shake}
        onHud={setHud}
        onEnd={handleEnd}
      />
      {!summary && !paused && <TouchControls onTouch={handleTouch} onJump={handleJump} showHints={save.settings.touchHints} />}
      {hud && !summary && <HUD hud={hud} mode={run.mode} onPause={() => setPaused(true)} />}

      {phase === 'countdown' && !paused && (
        <div className="countdown">
          <p className="countdown__title">{loc.name}</p>
          <p className="countdown__mode">{run.mode === 'endless' ? (
              <>
                <PxIcon name="infinity" /> Нескінченний режим
              </>
            ) : (
              `Траса ${loc.lengthM} м`
            )}</p>
          <p key={hud.countdown} className="countdown__num">
            {hud.countdown}
          </p>
          <p className="countdown__hint">
            Пробіл / <PxIcon name="up" /> — стрибок · <PxIcon name="arrowLeft" /> <PxIcon name="arrowRight" /> — швидкість
          </p>
        </div>
      )}
      {go && !paused && <p className="countdown__go">Вперед!</p>}

      {paused && !summary && (
        <PauseMenu save={save} setSave={setSave} onResume={() => setPaused(false)} onRestart={onRestart} onExit={onExit} />
      )}
      {summary && <ResultScreen summary={summary} coinsTotal={save.coins} onRetry={onRestart} onNext={onNext} onExit={onExit} />}
    </div>
  );
}
