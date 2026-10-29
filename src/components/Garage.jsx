import { useEffect, useState } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import TopBar from './TopBar.jsx';
import { BikeIcon } from './SpriteIcon.jsx';
import { SKINS, getSkin } from '../game/skins.js';
import { BIKES, getBike, bikeStats } from '../game/bikes.js';
import { buySkin, buyBike } from '../game/storage.js';
import { audio } from '../game/audio.js';

// Анімований велосипедист: крутить педалі на «біговій доріжці».
function BikePreview({ bike, skin }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), 110);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="garage__stage">
      <div className="garage__ground" />
      <BikeIcon bike={bike} skin={skin} frame={t % 8} scale={1.7} className="garage__bike" />
    </div>
  );
}

function StatBars({ bike }) {
  return (
    <ul className="stats">
      {bikeStats(bike).map((s) => (
        <li key={s.id}>
          <span>{s.label}</span>
          <span className="stats__bar" aria-label={`${s.value} з 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < s.value ? 'is-on' : ''} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Garage({ save, setSave, onBack }) {
  const [tab, setTab] = useState('bikes');
  const [bikeId, setBikeId] = useState(save.bike);
  const [skinId, setSkinId] = useState(save.skin);
  const [message, setMessage] = useState('');
  const bike = getBike(bikeId);
  const skin = getSkin(skinId);
  const isBikes = tab === 'bikes';
  const item = isBikes ? bike : skin;
  const owned = isBikes ? save.ownedBikes.includes(bike.id) : save.ownedSkins.includes(skin.id);
  const equipped = isBikes ? save.bike === bike.id : save.skin === skin.id;
  const canAfford = save.coins >= item.price;
  // у прев'ю — обраний предмет на тлі того, що вже вдягнено
  const previewBike = isBikes ? bike : getBike(save.bike);
  const previewSkin = isBikes ? getSkin(save.skin) : skin;

  const action = () => {
    if (equipped) return;
    if (owned) {
      setSave(isBikes ? { ...save, bike: bike.id } : { ...save, skin: skin.id });
      setMessage(`Обрано: ${item.name}`);
      return;
    }
    const next = isBikes ? buyBike(save, bike.id) : buySkin(save, skin.id);
    if (!next) {
      audio.play('error');
      setMessage(`Не вистачає ${item.price - save.coins} монет`);
      return;
    }
    audio.play('buy');
    setSave(next);
    setMessage(`Куплено: ${item.name}`);
  };

  const list = isBikes ? BIKES : SKINS;
  const selected = isBikes ? bikeId : skinId;
  const ownedList = isBikes ? save.ownedBikes : save.ownedSkins;
  const current = isBikes ? save.bike : save.skin;

  return (
    <div className="screen garage">
      <TopBar title="Гараж" onBack={onBack} coins={save.coins} />
      <div className="garage__body">
        <div className="garage__left">
          <div className="tabs" role="tablist">
            {[
              ['bikes', 'Велосипеди'],
              ['kit', 'Екіпірування'],
            ].map(([id, label]) => (
              <button
                type="button"
                role="tab"
                key={id}
                aria-selected={tab === id}
                className={`tabs__tab ${tab === id ? 'is-active' : ''}`}
                onClick={() => {
                  audio.play('click');
                  setTab(id);
                  setMessage('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <BikePreview bike={previewBike} skin={previewSkin} />
          <div className={`garage__grid ${isBikes ? 'garage__grid--bikes' : ''}`} role="listbox" aria-label={isBikes ? 'Велосипеди' : 'Екіпірування'}>
            {list.map((s) => {
              const has = ownedList.includes(s.id);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === s.id}
                  key={s.id}
                  title={s.name}
                  className={`skin ${selected === s.id ? 'is-selected' : ''} ${has ? '' : 'is-locked'} ${current === s.id ? 'is-equipped' : ''}`}
                  onClick={() => {
                    audio.play('click');
                    if (isBikes) setBikeId(s.id);
                    else setSkinId(s.id);
                    setMessage('');
                  }}
                >
                  <span className="skin__swatch" style={{ background: isBikes ? s.colors.frame : s.palette.j ?? '#e8383d' }} />
                  <span className="skin__label">{has ? <Icon name="check" /> : s.price}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="garage__info glass">
          <span className="eyebrow">{isBikes ? bike.kind : 'Екіпірування'}</span>
          <h3 className="garage__name">{item.name}</h3>
          {isBikes && <p className="garage__desc">{bike.description}</p>}
          {isBikes && <StatBars bike={bike} />}
          {isBikes && (
            <p className="garage__specs muted">
              {Math.round(bike.travelF * 1000)}/{bike.travelR ? Math.round(bike.travelR * 1000) : '—'} мм · {bike.mass} кг · {bike.headAngle}°
            </p>
          )}
          <p className="garage__status">
            {equipped ? (
              isBikes ? 'Зараз їздиш на ньому' : 'Зараз на тобі'
            ) : owned ? (
              'У гаражі'
            ) : (
              <>
                <Icon name="coin" className="c-accent" /> {item.price}
              </>
            )}
          </p>
          <Button variant={owned ? 'secondary' : 'primary'} icon={equipped ? 'check' : owned ? null : 'bag'} onClick={action} disabled={equipped || (!owned && !canAfford)}>
            {equipped ? 'Обрано' : owned ? 'Обрати' : canAfford ? 'Купити' : 'Замало монет'}
          </Button>
          <p className="garage__msg" aria-live="polite">
            {message || 'Монети дають за проїзд, монети на трасі й трюки.'}
          </p>
        </div>
      </div>
    </div>
  );
}
