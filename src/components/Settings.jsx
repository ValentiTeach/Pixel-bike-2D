import { useRef, useState } from 'react';
import TopBar from './TopBar.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';
import { defaultSave } from '../game/storage.js';
import { audio } from '../game/audio.js';

// Перемикач у стилі iOS / Material.
export function Toggle({ label, icon, value, onChange }) {
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
      {icon && <Icon name={icon} />}
      <span className="toggle__label">{label}</span>
      <span className="toggle__track">
        <span className="toggle__thumb" />
      </span>
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
      <div className="scroll columns" ref={ref}>
        <section className="card">
          <h3>Звук</h3>
          <Toggle icon="music" label="Музика" value={s.music} onChange={(v) => set({ music: v })} />
          <Toggle icon="volume" label="Ефекти" value={s.sfx} onChange={(v) => set({ sfx: v })} />
          <label className="slider">
            <span className="slider__head">
              <span>Гучність</span>
              <span className="muted">{Math.round(s.volume * 100)}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={s.volume}
              style={{ '--fill': `${s.volume * 100}%` }}
              onChange={(e) => set({ volume: Number(e.target.value) })}
            />
          </label>
        </section>

        <section className="card">
          <h3>Гра</h3>
          <Toggle icon="vibrate" label="Тряска екрана" value={s.shake} onChange={(v) => set({ shake: v })} />
          <Toggle icon="phone" label="Сенсорні кнопки" value={s.touchHints} onChange={(v) => set({ touchHints: v })} />
        </section>

        <section className="card">
          <h3>Прогрес</h3>
          <dl className="metrics metrics--small">
            <div>
              <dt>Заїздів</dt>
              <dd>{save.runs}</dd>
            </div>
            <div>
              <dt>Монет зібрано</dt>
              <dd>{save.totalCoins}</dd>
            </div>
          </dl>
          {confirm ? (
            <div className="confirm">
              <p>Стерти весь прогрес? Це не можна скасувати.</p>
              <div className="confirm__buttons">
                <Button
                  variant="danger"
                  onClick={() => {
                    setSave({ ...defaultSave(), settings: s });
                    setConfirm(false);
                  }}
                >
                  Стерти
                </Button>
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  Скасувати
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="btn--danger-text" icon="trash" onClick={() => setConfirm(true)}>
              Скинути прогрес
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
