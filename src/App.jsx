import { useCallback, useEffect, useRef, useState } from 'react';
import MainMenu from './components/MainMenu.jsx';
import LevelSelect from './components/LevelSelect.jsx';
import Garage from './components/Garage.jsx';
import HowTo from './components/HowTo.jsx';
import Settings from './components/Settings.jsx';
import GameScreen from './components/GameScreen.jsx';
import SidePanel from './components/SidePanel.jsx';
import { useSave } from './hooks/useSave.js';
import { useFrameScale } from './hooks/useFrameScale.js';
import { VIEW_W, VIEW_H } from './game/constants.js';
import { applyRunResult } from './game/storage.js';
import { audio } from './game/audio.js';

export default function App() {
  const [save, setSave] = useSave();
  const [screen, setScreen] = useState('menu');
  const [run, setRun] = useState(null);
  const { u, room } = useFrameScale();
  const sides = room >= 480;

  // актуальний сейв для синхронних обчислень у колбеках рушія
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => audio.setSettings(save.settings), [save.settings]);

  // браузери дозволяють звук лише після дії користувача
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'game') audio.startMusic('menu');
  }, [screen]);

  const startRun = useCallback(
    (locationId, mode) => {
      setRun({ locationId, mode, key: Date.now() });
      setSave((s) => ({ ...s, lastLocation: locationId }));
      setScreen('game');
    },
    [setSave],
  );

  const onRunEnd = useCallback(
    (result) => {
      const r = applyRunResult(saveRef.current, result);
      saveRef.current = r.save;
      setSave(r.save);
      return { result, newBest: r.newBest, unlocked: r.unlocked };
    },
    [setSave],
  );

  const restart = useCallback(() => run && startRun(run.locationId, run.mode), [run, startRun]);
  const toMenu = () => setScreen('menu');

  return (
    <div className="page" style={{ '--u': `${u}px` }}>
      {sides && <SidePanel side="left" />}
      <main className="frame" style={{ width: VIEW_W * u, height: VIEW_H * u }}>
        {screen === 'menu' && <MainMenu save={save} onNavigate={setScreen} />}
        {screen === 'select' && <LevelSelect save={save} onBack={toMenu} onStart={startRun} />}
        {screen === 'garage' && <Garage save={save} setSave={setSave} onBack={toMenu} />}
        {screen === 'howto' && <HowTo save={save} onBack={toMenu} />}
        {screen === 'settings' && <Settings save={save} setSave={setSave} onBack={toMenu} />}
        {screen === 'game' && run && (
          <GameScreen
            key={run.key}
            run={run}
            save={save}
            setSave={setSave}
            onRunEnd={onRunEnd}
            onRestart={restart}
            onNext={(id) => startRun(id, 'level')}
            onExit={() => setScreen('select')}
          />
        )}
      </main>
      {sides && <SidePanel side="right" />}
      <p className="rotate-hint">Поверни телефон горизонтально — так гра більша і зручніша</p>
    </div>
  );
}
