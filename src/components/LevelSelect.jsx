import { useEffect, useState } from 'react';
import GameCanvas from './GameCanvas.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
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
    <div className="screen select" style={{ '--loc': loc.theme.accent }}>
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
            <Icon name="lock" size="2.6em" />
          </div>
        )}
      </div>

      <TopBar title="Локації" onBack={onBack} coins={save.coins} />

      <section className="select__card glass" key={loc.id}>
        <div className="select__head">
          <span className="eyebrow">
            {String(index + 1).padStart(2, '0')} / {String(LOCATIONS.length).padStart(2, '0')}
          </span>
          <div className="select__arrows">
            <Button variant="ghost" size="sm" icon="chevronLeft" onClick={() => move(-1)} disabled={index === 0} aria-label="Попередня локація" />
            <Button
              variant="ghost"
              size="sm"
              icon="chevronRight"
              onClick={() => move(1)}
              disabled={index === LOCATIONS.length - 1}
              aria-label="Наступна локація"
            />
          </div>
        </div>

        <h2 className="select__name">{loc.name}</h2>
        <p className="select__subtitle">{loc.subtitle}</p>
        <div className="select__bars" role="tablist" aria-label="Локації">
          {LOCATIONS.map((l, i) => (
            <button
              type="button"
              role="tab"
              aria-selected={i === index}
              key={l.id}
              className={`bar ${i === index ? 'is-active' : ''} ${isUnlocked(save, i) ? '' : 'is-locked'}`}
              onClick={() => setIndex(i)}
              aria-label={l.name}
            />
          ))}
        </div>
        <p className="select__desc">{loc.description}</p>

        <div className="select__obstacles" aria-label="Перешкоди локації">
          {[...loc.obstacles, ...loc.movers, ...loc.flyers, ...loc.hazards].map((o) => (
            <SpriteIcon key={o.type} name={ENTITY_TYPES[o.type].sprites[0]} box={14} />
          ))}
        </div>

        <dl className="metrics">
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
            <dt>Рекорд ∞</dt>
            <dd>{prog.bestEndless ? `${prog.bestEndless} м` : '—'}</dd>
          </div>
        </dl>

        {unlocked ? (
          <div className="select__actions">
            <Button variant="primary" icon="play" onClick={() => onStart(loc.id, 'level')}>
              Почати
            </Button>
            <Button icon="infinity" onClick={() => onStart(loc.id, 'endless')} disabled={!prog.completed} title="Нескінченний режим">
              Без кінця
            </Button>
            {!prog.completed && <p className="hint">Пройди рівень, щоб відкрити нескінченний режим.</p>}
          </div>
        ) : (
          <p className="select__locked">
            <Icon name="lock" /> Пройди «{LOCATIONS[index - 1].name}», щоб відкрити
          </p>
        )}
      </section>
    </div>
  );
}
