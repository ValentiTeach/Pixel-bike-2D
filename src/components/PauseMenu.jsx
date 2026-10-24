import { useRef } from 'react';
import PxIcon from './PxIcon.jsx';
import PixelButton from './PixelButton.jsx';
import { Toggle } from './Settings.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';

export default function PauseMenu({ save, setSave, onResume, onRestart, onExit }) {
  const ref = useRef(null);
  useMenuKeys(ref);
  const s = save.settings;
  const set = (patch) => setSave({ ...save, settings: { ...s, ...patch } });
  return (
    <div className="overlay">
      <div className="overlay__panel px-box" ref={ref}>
        <h2 className="overlay__title">Пауза</h2>
        <PixelButton variant="primary" onClick={onResume}>
          <PxIcon name="right" /> Продовжити
        </PixelButton>
        <PixelButton onClick={onRestart}>
          <PxIcon name="retry" /> Спочатку
        </PixelButton>
        <PixelButton onClick={onExit}>Локації</PixelButton>
        <div className="overlay__toggles">
          <Toggle label="Музика" value={s.music} onChange={(v) => set({ music: v })} />
          <Toggle label="Ефекти" value={s.sfx} onChange={(v) => set({ sfx: v })} />
        </div>
      </div>
    </div>
  );
}
