import PixelButton from './PixelButton.jsx';
import PxIcon from './PxIcon.jsx';
import { SpriteIcon } from './SpriteIcon.jsx';

export default function TopBar({ title, onBack, coins }) {
  return (
    <header className="topbar">
      <PixelButton small onClick={onBack} aria-label="Назад">
        <PxIcon name="left" />
      </PixelButton>
      <h2 className="topbar__title">{title}</h2>
      {coins !== undefined ? (
        <span className="coin-counter">
          <SpriteIcon name="coin" />
          {coins}
        </span>
      ) : (
        <span />
      )}
    </header>
  );
}
