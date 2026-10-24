import { useEffect, useState } from 'react';
import PxIcon from './PxIcon.jsx';
import PixelButton from './PixelButton.jsx';
import TopBar from './TopBar.jsx';
import { BikeIcon, SpriteIcon } from './SpriteIcon.jsx';
import { SKINS, getSkin } from '../game/skins.js';
import { buySkin } from '../game/storage.js';
import { audio } from '../game/audio.js';

// Анімований велосипедист: крутить педалі і похитується вліво-вправо.
function BikePreview({ skin }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), 140);
    return () => clearInterval(id);
  }, []);
  const lean = [0, 0, -1, -1, 0, 0, 1, 1][Math.floor(t / 3) % 8];
  return (
    <div className="garage__stage">
      <div className="garage__road" />
      <BikeIcon skin={skin} lean={lean} frame={t % 2} scale={4} className="garage__bike" />
    </div>
  );
}

export default function Garage({ save, setSave, onBack }) {
  const [selected, setSelected] = useState(save.skin);
  const [message, setMessage] = useState('');
  const skin = getSkin(selected);
  const owned = save.ownedSkins.includes(skin.id);
  const equipped = save.skin === skin.id;
  const canAfford = save.coins >= skin.price;

  const action = () => {
    if (equipped) return;
    if (owned) {
      setSave({ ...save, skin: skin.id });
      setMessage(`Обрано: ${skin.name}`);
      return;
    }
    const next = buySkin(save, skin.id);
    if (!next) {
      audio.play('error');
      setMessage(`Не вистачає ${skin.price - save.coins} монет`);
      return;
    }
    audio.play('buy');
    setSave(next);
    setMessage(`Куплено: ${skin.name}!`);
  };

  return (
    <div className="screen garage">
      <TopBar title="Гараж" onBack={onBack} coins={save.coins} />
      <BikePreview skin={skin} />
      <div className="garage__info px-box">
        <h3 className="garage__name">{skin.name}</h3>
        <p className="garage__status">
          {equipped ? 'Зараз на тобі' : owned ? 'У гаражі' : (
            <>
              Ціна: <SpriteIcon name="coin" /> {skin.price}
            </>
          )}
        </p>
        <PixelButton variant={owned ? 'default' : 'primary'} onClick={action} disabled={equipped || (!owned && !canAfford)}>
          {equipped ? (
            <>
              <PxIcon name="check" /> Обрано
            </>
          ) : owned ? 'Обрати' : canAfford ? 'Купити' : 'Замало монет'}
        </PixelButton>
        <p className="garage__msg" aria-live="polite">
          {message || 'Збирай монети на трасах, щоб купувати нові скіни.'}
        </p>
      </div>
      <div className="garage__grid" role="listbox" aria-label="Скіни">
        {SKINS.map((s) => {
          const has = save.ownedSkins.includes(s.id);
          return (
            <button
              type="button"
              role="option"
              aria-selected={selected === s.id}
              key={s.id}
              className={`skin ${selected === s.id ? 'is-selected' : ''} ${has ? '' : 'is-locked'}`}
              onClick={() => {
                audio.play('click');
                setSelected(s.id);
                setMessage('');
              }}
            >
              <BikeIcon skin={s} scale={1} />
              <span className="skin__label">{save.skin === s.id ? <PxIcon name="check" /> : has ? 'є' : s.price}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
