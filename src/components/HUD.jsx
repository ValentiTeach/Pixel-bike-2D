import Icon from './Icon.jsx';
import { formatTime } from '../game/storage.js';

// Ігровий HUD: час і падіння зліва, смуга прогресу з чекпоінтами, монети й очки справа,
// швидкість унизу. Тости трюків і чекпоінтів показує GameScreen.
export default function HUD({ hud, mode, onPause }) {
  const level = mode === 'level';
  return (
    <div className="hud">
      <div className="hud__top">
        <div className="hud__group">
          <span className="pill pill--time" aria-label={`Час ${formatTime(hud.time)}`}>
            <Icon name="clock" />
            <span className="mono">{formatTime(hud.time)}</span>
          </span>
          {hud.crashes > 0 && (
            <span className="pill pill--crash" aria-label={`Падінь: ${hud.crashes}`}>
              <Icon name="crash" />
              {hud.crashes}
            </span>
          )}
        </div>

        {level ? (
          <div className="hud__progress" aria-label={`Пройдено ${hud.distanceM} з ${hud.lengthM} м`}>
            <div className="hud__track">
              <div className="hud__fill" style={{ width: `${hud.progress * 100}%` }} />
              {hud.checkpoints.map((c, i) => (
                <span key={i} className={`hud__cp ${c.passed ? 'is-passed' : ''}`} style={{ left: `${c.at * 100}%` }} />
              ))}
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
          {hud.score > 0 && (
            <span className="pill pill--score" aria-label={`Очки за трюки: ${hud.score}`}>
              <Icon name="flip" />
              <span key={hud.score} className="pop">
                {hud.score}
              </span>
            </span>
          )}
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
      </div>
    </div>
  );
}
