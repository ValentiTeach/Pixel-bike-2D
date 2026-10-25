import Button from './Button.jsx';
import Icon from './Icon.jsx';

export default function TopBar({ title, onBack, coins }) {
  return (
    <header className="topbar">
      <Button variant="ghost" icon="chevronLeft" onClick={onBack} aria-label="Назад" />
      <h2 className="topbar__title">{title}</h2>
      {coins !== undefined ? (
        <span className="pill pill--coin">
          <Icon name="coin" />
          {coins}
        </span>
      ) : (
        <span className="topbar__spacer" />
      )}
    </header>
  );
}
