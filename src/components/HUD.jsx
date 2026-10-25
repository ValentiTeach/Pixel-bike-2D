import Icon from './Icon.jsx';
import { MAX_HEARTS } from '../game/constants.js';

export default function HUD({ hud, mode, onPause }) {
  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__group">
          <div className="hud__hearts" aria-label={`Життя: ${hud.hearts}`}>
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <Icon key={i} name="heart" fill={i < hud.hearts} className={i < hud.hearts ? 'is-full' : 'is-lost'} />
            ))}
          </div>
        </div>

        {mode === 'level' ? (
          <div className="hud__progress" aria-label={`Пройдено ${hud.distanceM} з ${hud.lengthM} м`}>
            <div className="hud__track">
              <div className="hud__fill" style={{ width: `${hud.progress * 100}%` }} />
            </div>
            <span className="hud__meters">
              {hud.distanceM}
              <span className="muted"> / {hud.lengthM} м</span>
            </span>
          </div>
        ) : (
          <div className="hud__progress hud__progress--endless">
            <Icon name="infinity" />
            <span className="hud__meters">{hud.distanceM} м</span>
          </div>
        )}

        <div className="hud__group hud__group--right">
          <span className="pill pill--coin" aria-label={`Монети: ${hud.coins}`}>
            <Icon name="coin" />
            <span key={hud.coins} className="pop">
              {hud.coins}
            </span>
          </span>
          <button type="button" className="hud__pause" onClick={onPause} aria-label="Пауза">
            <Icon name="pause" />
          </button>
        </div>
      </div>

      <div className="hud__bottom">
        <span className="hud__speed">
          <strong>{hud.speedKmh}</strong> км/год
        </span>
        <span className="hud__effects">
          {hud.shield > 0 && (
            <span className="pill pill--shield">
              <Icon name="shield" />
              <span className="mini-bar">
                <span style={{ width: `${hud.shield * 100}%` }} />
              </span>
            </span>
          )}
          {hud.slow && (
            <span className="pill">
              <Icon name="droplet" /> Повільно
            </span>
          )}
          {hud.slip && (
            <span className="pill">
              <Icon name="snowflake" /> Слизько
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
