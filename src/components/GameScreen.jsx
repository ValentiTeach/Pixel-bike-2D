import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas.jsx';
import HUD from './HUD.jsx';
import TouchControls from './TouchControls.jsx';
import PauseMenu from './PauseMenu.jsx';
import ResultScreen from './ResultScreen.jsx';
import { getLocation, DIFFICULTY } from '../game/locations.js';
import { getSkin } from '../game/skins.js';
import { getBike } from '../game/bikes.js';
import { formatTime } from '../game/storage.js';

const Key = ({ children }) => <kbd className="key">{children}</kbd>;

export default function GameScreen({ run, save, setSave, onRunEnd, onRestart, onNext, onExit }) {
  const engineRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [paused, setPaused] = useState(false);
  const [summary, setSummary] = useState(null);
  const [toasts, setToasts] = useState([]);
  const loc = getLocation(run.locationId);
  const bike = getBike(save.bike);
  const phase = hud?.phase;

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  // коротке «ВПЕРЕД!» після відліку
  const go = phase === 'ride' && hud.phaseTime < 0.8 && hud.distanceM < 30 && hud.crashes === 0;

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

  // Тости: трюки, чекпоінти, падіння (зникають самі)
  const idRef = useRef(0);
  const pushToast = useCallback((toast) => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), toast.kind === 'trick' ? 1900 : 1500);
  }, []);
  const handleEvent = useCallback(
    (ev) => {
      if (ev.type === 'trick') pushToast({ kind: 'trick', title: ev.name, sub: `+${ev.points}` });
      else if (ev.type === 'checkpoint') pushToast({ kind: 'cp', title: `Чекпоінт ${ev.n}/${ev.total}` });
      else if (ev.type === 'crash' && run.mode !== 'endless') {
        const why = { head: 'Падіння', shoulder: 'Падіння', hip: 'Падіння', hard: 'Жорстке приземлення', fall: 'Зірвався вниз' }[ev.reason] ?? 'Падіння';
        pushToast({ kind: 'crash', title: why, sub: 'повернення на чекпоінт' });
      }
    },
    [pushToast, run.mode],
  );

  const handleEnd = useCallback((result) => setSummary(onRunEnd(result)), [onRunEnd]);
  const handleButton = useCallback((btn, pressed) => engineRef.current?.setButton(btn, pressed), []);

  return (
    <div className={`screen game ${paused ? 'is-paused' : ''}`}>
      <GameCanvas
        engineRef={engineRef}
        locationId={run.locationId}
        mode={run.mode}
        skin={getSkin(save.skin)}
        bikeId={bike.id}
        shake={save.settings.shake}
        onHud={setHud}
        onEnd={handleEnd}
        onEvent={handleEvent}
      />
      {!summary && !paused && <TouchControls onButton={handleButton} showHints={save.settings.touchHints} />}
      {hud && !summary && <HUD hud={hud} mode={run.mode} onPause={() => setPaused(true)} />}

      {!summary && !paused && (
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.kind}`}>
              <span className="toast__title">{t.title}</span>
              {t.sub && <span className="toast__sub">{t.sub}</span>}
            </div>
          ))}
        </div>
      )}

      {phase === 'countdown' && !paused && (
        <div className="countdown">
          <span className="eyebrow">
            {run.mode === 'endless' ? 'Фрірайд · без кінця' : `${DIFFICULTY[loc.difficulty].label} траса · ${loc.lengthM} м`}
            {run.mode === 'level' && <> · золото {formatTime(loc.times.gold)}</>}
          </span>
          <p className="countdown__title">{loc.name}</p>
          <p key={hud.countdown} className="countdown__num">
            {hud.countdown}
          </p>
          <p className="countdown__hint">
            <Key>↑</Key> педалі <span className="sep" />
            <Key>↓</Key> гальмо <span className="sep" />
            <Key>←</Key>
            <Key>→</Key> нахил <span className="sep" />
            <Key>Пробіл</Key> хоп
          </p>
          {loc.tip && run.mode === 'level' && <p className="countdown__tip">{loc.tip}</p>}
        </div>
      )}
      {go && !paused && <p className="countdown__go">Вперед</p>}

      {paused && !summary && (
        <PauseMenu
          save={save}
          setSave={setSave}
          canRespawn={run.mode === 'level' && phase === 'ride'}
          onRespawn={() => {
            engineRef.current?.respawn();
            setPaused(false);
          }}
          onResume={() => setPaused(false)}
          onRestart={onRestart}
          onExit={onExit}
        />
      )}
      {summary && <ResultScreen summary={summary} coinsTotal={save.coins} onRetry={onRestart} onNext={onNext} onExit={onExit} />}
    </div>
  );
}
