import { useRef } from 'react';
import PxIcon from './PxIcon.jsx';
import GameCanvas from './GameCanvas.jsx';
import PixelButton from './PixelButton.jsx';
import { SpriteIcon } from './SpriteIcon.jsx';
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
      <GameCanvas locationId={save.lastLocation} mode="demo" skin={getSkin(save.skin)} className="bg-canvas" />
      <div className="menu__shade" />
      <div className="menu__content">
        <h1 className="logo" aria-label="Pixel Bike 2D">
          <span className="logo__line logo__line--a">PIXEL</span>
          <span className="logo__line logo__line--b">BIKE</span>
          <span className="logo__badge">2D</span>
        </h1>
        <p className="tagline">Крути педалі. Об&apos;їжджай перешкоди. Дістанься фінішу!</p>

        <nav className="menu__buttons" ref={navRef}>
          <PixelButton variant="primary" onClick={() => onNavigate('select')}>
            <PxIcon name="right" /> Грати
          </PixelButton>
          <PixelButton onClick={() => onNavigate('garage')}>Гараж</PixelButton>
          <PixelButton onClick={() => onNavigate('howto')}>Як грати</PixelButton>
          <PixelButton onClick={() => onNavigate('settings')}>Налаштування</PixelButton>
        </nav>

        <footer className="menu__footer">
          <span className="chip">
            <SpriteIcon name="star" />
            {stars}/{LOCATIONS.length * 3}
          </span>
          <span className="chip">
            <SpriteIcon name="coin" />
            {save.coins}
          </span>
        </footer>
      </div>
    </div>
  );
}
