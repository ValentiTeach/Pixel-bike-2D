import { useRef } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Stars from './Stars.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';
import { LOCATIONS, getLocation, locationIndex } from '../game/locations.js';
import { formatTime } from '../game/storage.js';

export default function ResultScreen({ summary, coinsTotal, onRetry, onNext, onExit }) {
  const ref = useRef(null);
  useMenuKeys(ref);
  const { result, newBest, unlocked, earned } = summary;
  const level = result.mode === 'level';
  const next = LOCATIONS[locationIndex(result.locationId) + 1];
  const title = result.completed ? 'Фініш' : level ? 'Заїзд перервано' : 'Фрірайд завершено';
  const showNext = level && result.completed && next;
  const t = result.times;

  return (
    <div className="overlay">
      <div className={`modal glass modal--result ${result.completed ? 'is-win' : 'is-lose'}`} ref={ref}>
        <span className="eyebrow">{getLocation(result.locationId).name}</span>
        <h2 className="modal__title">{title}</h2>
        {level && result.completed && <Stars count={result.stars} size="1.8em" animate />}
        {level && result.completed && (
          <p className="result__targets">
            <span className={result.time <= t.gold ? 'is-hit' : ''}>
              <Icon name="star" fill /> {formatTime(t.gold)}
            </span>
            <span className={result.time <= t.silver ? 'is-hit' : ''}>
              <Icon name="star" fill /> {formatTime(t.silver)}
            </span>
          </p>
        )}

        <dl className="metrics">
          <div>
            <dt>
              <Icon name="clock" /> {level ? 'Час' : 'Дистанція'}
            </dt>
            <dd>{level ? formatTime(result.time) : `${result.distanceM} м`}</dd>
          </div>
          <div>
            <dt>
              <Icon name="crash" /> Падіння
            </dt>
            <dd>{result.crashes}</dd>
          </div>
          <div>
            <dt>
              <Icon name="flip" /> Трюки
            </dt>
            <dd>
              {result.score}
              <small> · {result.tricks}</small>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="coin" /> Монети
            </dt>
            <dd>
              +{earned}
              <small> · {coinsTotal}</small>
            </dd>
          </div>
        </dl>
        <p className="result__extra">
          Макс. швидкість <strong>{result.maxSpeedKmh} км/год</strong>
          <span className="sep" />
          Найдовший політ <strong>{result.maxAir} с</strong>
          {result.bestTrick && (
            <>
              <span className="sep" />
              Найкращий трюк <strong>{result.bestTrick}</strong>
            </>
          )}
        </p>

        {(newBest || unlocked) && (
          <div className="badges">
            {newBest && (
              <span className="badge badge--accent">
                <Icon name="trophy" /> {level ? 'Новий рекорд часу' : 'Новий рекорд'}
              </span>
            )}
            {unlocked && (
              <span className="badge badge--success">
                <Icon name="lock" /> Відкрито: {getLocation(unlocked).name}
              </span>
            )}
          </div>
        )}

        <div className="modal__buttons modal__buttons--row">
          {showNext && (
            <Button variant="primary" iconRight="arrowRight" onClick={() => onNext(next.id)}>
              {next.name}
            </Button>
          )}
          <Button variant={showNext ? 'secondary' : 'primary'} icon="retry" onClick={onRetry}>
            Ще раз
          </Button>
          <Button variant="ghost" onClick={onExit}>
            Траси
          </Button>
        </div>
      </div>
    </div>
  );
}
