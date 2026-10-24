import { SpriteIcon } from './SpriteIcon.jsx';
import { MAX_HEARTS } from '../game/constants.js';

export default function HUD({ hud, mode, onPause }) {
  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__hearts" aria-label={`Життя: ${hud.hearts}`}>
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <SpriteIcon key={i} name={i < hud.hearts ? 'heart' : 'heart:empty'} className={i < hud.hearts ? '' : 'is-lost'} />
          ))}
        </div>
        <div className="hud__coins" aria-label={`Монети: ${hud.coins}`}>
          <SpriteIcon name="coin" />
          <span key={hud.coins} className="pop">
            {hud.coins}
          </span>
        </div>
        <button type="button" className="hud__pause" onClick={onPause} aria-label="Пауза">
          <span />
          <span />
        </button>
      </div>

      {mode === 'level' ? (
        <div className="hud__progress" aria-label={`Пройдено ${hud.distanceM} з ${hud.lengthM} м`}>
          <div className="hud__track">
            <div className="hud__fill" style={{ width: `${hud.progress * 100}%` }} />
            <div className="hud__marker" style={{ left: `${hud.progress * 100}%` }} />
          </div>
          <SpriteIcon name="flag" />
        </div>
      ) : (
        <div className="hud__distance">{hud.distanceM} м</div>
      )}

      <div className="hud__bottom">
        <span className="hud__speed">{hud.speedKmh} км/год</span>
        <span className="hud__effects">
          {hud.shield > 0 && (
            <span className="hud__shield">
              <SpriteIcon name="shield" />
              <span className="hud__shield-bar">
                <span style={{ width: `${hud.shield * 100}%` }} />
              </span>
            </span>
          )}
          {hud.slow && <SpriteIcon name="iconSlow" title="Сповільнення" />}
          {hud.slip && <SpriteIcon name="iconSlip" title="Слизько" />}
        </span>
      </div>
    </div>
  );
}
