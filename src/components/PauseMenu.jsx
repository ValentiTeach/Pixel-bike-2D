import { useRef } from 'react';
import Button from './Button.jsx';
import { Toggle } from './Settings.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';

export default function PauseMenu({ save, setSave, onResume, onRestart, onExit }) {
  const ref = useRef(null);
  useMenuKeys(ref);
  const s = save.settings;
  const set = (patch) => setSave({ ...save, settings: { ...s, ...patch } });
  return (
    <div className="overlay">
      <div className="modal glass" ref={ref}>
        <span className="eyebrow">Гру призупинено</span>
        <h2 className="modal__title">Пауза</h2>
        <div className="modal__buttons">
          <Button variant="primary" icon="play" onClick={onResume}>
            Продовжити
          </Button>
          <Button icon="retry" onClick={onRestart}>
            Спочатку
          </Button>
          <Button variant="ghost" icon="chevronLeft" onClick={onExit}>
            До локацій
          </Button>
        </div>
        <div className="modal__toggles">
          <Toggle icon="music" label="Музика" value={s.music} onChange={(v) => set({ music: v })} />
          <Toggle icon="volume" label="Ефекти" value={s.sfx} onChange={(v) => set({ sfx: v })} />
        </div>
      </div>
    </div>
  );
}
