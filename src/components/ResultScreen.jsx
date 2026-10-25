import { useRef } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Stars from './Stars.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';
import { LOCATIONS, getLocation, locationIndex } from '../game/locations.js';

export default function ResultScreen({ summary, coinsTotal, onRetry, onNext, onExit }) {
  const ref = useRef(null);
  useMenuKeys(ref);
  const { result, newBest, unlocked } = summary;
  const level = result.mode === 'level';
  const next = LOCATIONS[locationIndex(result.locationId) + 1];
  const title = result.completed ? 'Фініш' : level ? 'Аварія' : 'Заїзд завершено';
  const showNext = level && result.completed && next;

  return (
    <div className="overlay">
      <div className={`modal glass modal--result ${result.completed ? 'is-win' : 'is-lose'}`} ref={ref}>
        <span className="eyebrow">{getLocation(result.locationId).name}</span>
        <h2 className="modal__title">{title}</h2>
        {level && <Stars count={result.stars} size="1.8em" animate />}

        <dl className="metrics">
          <div>
            <dt>
              <Icon name="route" /> Дистанція
            </dt>
            <dd>
              {result.distanceM}
              <small> {level ? `/ ${result.lengthM} ` : ''}м</small>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="coin" /> Монети
            </dt>
            <dd>
              +{result.coins}
              <small> · {coinsTotal}</small>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" /> Час
            </dt>
            <dd>
              {result.time}
              <small> с</small>
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="zap" /> Удари
            </dt>
            <dd>{result.hits}</dd>
          </div>
        </dl>

        {(newBest || unlocked) && (
          <div className="badges">
            {newBest && (
              <span className="badge badge--accent">
                <Icon name="trophy" /> Новий рекорд
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
            Локації
          </Button>
        </div>
      </div>
    </div>
  );
}
