import { useRef } from 'react';
import GameCanvas from './GameCanvas.jsx';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useMenuKeys } from '../hooks/useMenuKeys.js';
import { getSkin } from '../game/skins.js';
import { LOCATIONS } from '../game/locations.js';
import { totalStars } from '../game/storage.js';

export default function MainMenu({ save, onNavigate }) {
  const navRef = useRef(null);
  useMenuKeys(navRef);
  const stars = totalStars(save);

  return (
    <div className="screen menu">
      <GameCanvas locationId={save.lastLocation} mode="demo" skin={getSkin(save.skin)} bikeId={save.bike} className="bg-canvas" />
      <div className="menu__shade" />
      <div className="menu__content">
        <div className="menu__brand">
          <span className="eyebrow">Mountain bike · {LOCATIONS.length} трас</span>
          <h1 className="title">
            Pixel
            <br />
            Bike<span className="title__dot">.</span>
          </h1>
          <p className="lead">Справжня фізика гірського велосипеда: підвіска, зчеплення, дропи, гепи й сальто.</p>
          <div className="chips">
            <span className="pill">
              <Icon name="star" fill className="c-accent" />
              {stars} / {LOCATIONS.length * 3}
            </span>
            <span className="pill pill--coin">
              <Icon name="coin" />
              {save.coins}
            </span>
          </div>
        </div>

        <nav className="menu__nav glass" ref={navRef}>
          <Button variant="primary" size="lg" icon="play" onClick={() => onNavigate('select')}>
            Кататися
          </Button>
          <Button variant="ghost" icon="bike" iconRight="chevronRight" onClick={() => onNavigate('garage')}>
            Гараж
          </Button>
          <Button variant="ghost" icon="help" iconRight="chevronRight" onClick={() => onNavigate('howto')}>
            Як грати
          </Button>
          <Button variant="ghost" icon="sliders" iconRight="chevronRight" onClick={() => onNavigate('settings')}>
            Налаштування
          </Button>
        </nav>
      </div>
    </div>
  );
}
