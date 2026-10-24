import { useEffect, useState } from 'react';
import PxIcon from './PxIcon.jsx';
import GameCanvas from './GameCanvas.jsx';
import PixelButton from './PixelButton.jsx';
import TopBar from './TopBar.jsx';
import Stars from './Stars.jsx';
import { SpriteIcon } from './SpriteIcon.jsx';
import { LOCATIONS, locationIndex } from '../game/locations.js';
import { getProgress, isUnlocked } from '../game/storage.js';
import { getSkin } from '../game/skins.js';
import { ENTITY_TYPES } from '../game/entities.js';
import { audio } from '../game/audio.js';

export default function LevelSelect({ save, onBack, onStart }) {
  const [index, setIndex] = useState(() => Math.max(0, locationIndex(save.lastLocation)));
  const loc = LOCATIONS[index];
  const unlocked = isUnlocked(save, index);
  const prog = getProgress(save, loc.id);

  const move = (d) => {
    const next = Math.min(LOCATIONS.length - 1, Math.max(0, index + d));
    if (next !== index) {
      audio.play('click');
      setIndex(next);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') move(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') move(1);
      else if (e.code === 'Escape') onBack();
      else if (e.code === 'Enter' && unlocked && document.activeElement?.tagName !== 'BUTTON') onStart(loc.id, 'level');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // свайп по прев'ю — гортання локацій
  const [touchX, setTouchX] = useState(null);

  return (
    <div className="screen select">
      <div
        className="select__preview"
        onPointerDown={(e) => setTouchX(e.clientX)}
        onPointerUp={(e) => {
          if (touchX !== null && Math.abs(e.clientX - touchX) > 30) move(e.clientX < touchX ? 1 : -1);
          setTouchX(null);
        }}
      >
        <GameCanvas key={loc.id} locationId={loc.id} mode="demo" skin={getSkin(save.skin)} className={`bg-canvas ${unlocked ? '' : 'is-locked'}`} />
        {!unlocked && (
          <div className="select__lock">
            <SpriteIcon name="lock" scale={3} />
          </div>
        )}
      </div>

      <TopBar title="Локації" onBack={onBack} coins={save.coins} />

      <section className="select__card px-box" style={{ '--accent': loc.theme.accent }}>
        <div className="select__nav">
          <PixelButton small onClick={() => move(-1)} disabled={index === 0} aria-label="Попередня локація">
            <PxIcon name="left" />
          </PixelButton>
          <div className="select__dots">
            {LOCATIONS.map((l, i) => (
              <button
                type="button"
                key={l.id}
                className={`dot ${i === index ? 'is-active' : ''} ${isUnlocked(save, i) ? '' : 'is-locked'}`}
                onClick={() => setIndex(i)}
                aria-label={l.name}
              />
            ))}
          </div>
          <PixelButton small onClick={() => move(1)} disabled={index === LOCATIONS.length - 1} aria-label="Наступна локація">
            <PxIcon name="right" />
          </PixelButton>
        </div>

        <h2 className="select__name">
          {index + 1}. {loc.name}
        </h2>
        <p className="select__subtitle">{loc.subtitle}</p>
        <p className="select__desc">{loc.description}</p>

        <div className="select__obstacles" aria-label="Перешкоди локації">
          {[...loc.obstacles, ...loc.hazards].map((o) => (
            <SpriteIcon key={o.type} name={ENTITY_TYPES[o.type].sprites[0]} />
          ))}
        </div>

        <dl className="select__stats">
          <div>
            <dt>Зірки</dt>
            <dd>
              <Stars count={prog.stars} />
            </dd>
          </div>
          <div>
            <dt>Траса</dt>
            <dd>{loc.lengthM} м</dd>
          </div>
          <div>
            <dt>Без кінця</dt>
            <dd>{prog.bestEndless ? `${prog.bestEndless} м` : '—'}</dd>
          </div>
        </dl>

        {unlocked ? (
          <div className="select__actions">
            <PixelButton variant="primary" onClick={() => onStart(loc.id, 'level')}>
              <PxIcon name="right" /> Рівень
            </PixelButton>
            <PixelButton onClick={() => onStart(loc.id, 'endless')} disabled={!prog.completed} title="Нескінченний режим">
              <PxIcon name="infinity" /> Без кінця
            </PixelButton>
            {!prog.completed && <p className="hint">Пройди рівень, щоб відкрити нескінченний режим</p>}
          </div>
        ) : (
          <p className="select__locked">Пройди «{LOCATIONS[index - 1].name}», щоб відкрити цю локацію</p>
        )}
      </section>
    </div>
  );
}
