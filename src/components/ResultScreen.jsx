import { useRef } from 'react';
import PxIcon from './PxIcon.jsx';
import PixelButton from './PixelButton.jsx';
import Stars from './Stars.jsx';
import { SpriteIcon } from './SpriteIcon.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';
import { LOCATIONS, getLocation, locationIndex } from '../game/locations.js';

export default function ResultScreen({ summary, coinsTotal, onRetry, onNext, onExit }) {
  const ref = useRef(null);
  useMenuKeys(ref);
  const { result, newBest, unlocked } = summary;
  const level = result.mode === 'level';
  const next = LOCATIONS[locationIndex(result.locationId) + 1];
  const title = result.completed ? 'Фініш!' : level ? 'Аварія!' : 'Заїзд завершено';

  return (
    <div className="overlay overlay--result">
      <div className={`overlay__panel px-box ${result.completed ? 'is-win' : 'is-lose'}`} ref={ref}>
        <h2 className="overlay__title">{title}</h2>
        {level && <Stars count={result.stars} scale={2} animate />}

        <dl className="result__stats">
          <div>
            <dt>Дистанція</dt>
            <dd>
              {result.distanceM}
              {level ? ` / ${result.lengthM}` : ''} м
            </dd>
          </div>
          <div>
            <dt>Монети</dt>
            <dd>
              <SpriteIcon name="coin" /> +{result.coins} <small>({coinsTotal})</small>
            </dd>
          </div>
          <div>
            <dt>Час</dt>
            <dd>{result.time} с</dd>
          </div>
          <div>
            <dt>Зіткнення</dt>
            <dd>{result.hits}</dd>
          </div>
        </dl>

        {newBest && (
          <p className="badge badge--gold">
            <SpriteIcon name="star" /> Новий рекорд!
          </p>
        )}
        {unlocked && <p className="badge badge--green">Відкрито: {getLocation(unlocked).name}!</p>}

        <div className="overlay__buttons">
          {level && result.completed && next && (
            <PixelButton variant="primary" onClick={() => onNext(next.id)}>
              Далі: {next.name} <PxIcon name="right" />
            </PixelButton>
          )}
          <PixelButton variant={result.completed && next && level ? 'default' : 'primary'} onClick={onRetry}>
            <PxIcon name="retry" /> Ще раз
          </PixelButton>
          <PixelButton onClick={onExit}>Локації</PixelButton>
        </div>
      </div>
    </div>
  );
}
