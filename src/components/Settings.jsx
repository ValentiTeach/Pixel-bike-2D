import { useRef, useState } from 'react';
import TopBar from './TopBar.jsx';
import PixelButton from './PixelButton.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';
import { defaultSave } from '../game/storage.js';
import { audio } from '../game/audio.js';

export function Toggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      className={`toggle ${value ? 'is-on' : ''}`}
      role="switch"
      aria-checked={value}
      onClick={() => {
        audio.play('click');
        onChange(!value);
      }}
    >
      <span>{label}</span>
      <span className="toggle__box">{value ? 'ТАК' : 'НІ'}</span>
    </button>
  );
}

export default function Settings({ save, setSave, onBack }) {
  const ref = useRef(null);
  useMenuKeys(ref);
  const [confirm, setConfirm] = useState(false);
  const s = save.settings;
  const set = (patch) => setSave({ ...save, settings: { ...s, ...patch } });

  return (
    <div className="screen settings">
      <TopBar title="Налаштування" onBack={onBack} />
      <div className="scroll" ref={ref}>
        <section className="px-box settings__group">
          <h3>Звук</h3>
          <Toggle label="Музика" value={s.music} onChange={(v) => set({ music: v })} />
          <Toggle label="Ефекти" value={s.sfx} onChange={(v) => set({ sfx: v })} />
          <label className="slider">
            <span>Гучність {Math.round(s.volume * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={s.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
            />
          </label>
        </section>

        <section className="px-box settings__group">
          <h3>Гра</h3>
          <Toggle label="Тряска екрана" value={s.shake} onChange={(v) => set({ shake: v })} />
          <Toggle label="Сенсорні стрілки" value={s.touchHints} onChange={(v) => set({ touchHints: v })} />
        </section>

        <section className="px-box settings__group">
          <h3>Прогрес</h3>
          <p className="hint">Заїздів: {save.runs} · Зібрано монет: {save.totalCoins}</p>
          {confirm ? (
            <div className="settings__confirm">
              <p>Точно стерти все?</p>
              <PixelButton
                variant="danger"
                onClick={() => {
                  setSave({ ...defaultSave(), settings: s });
                  setConfirm(false);
                }}
              >
                Так, стерти
              </PixelButton>
              <PixelButton onClick={() => setConfirm(false)}>Скасувати</PixelButton>
            </div>
          ) : (
            <PixelButton variant="danger" onClick={() => setConfirm(true)}>
              Скинути прогрес
            </PixelButton>
          )}
        </section>
      </div>
    </div>
  );
}
