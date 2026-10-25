import { audio } from '../game/audio.js';
import Icon from './Icon.jsx';

// Кнопка інтерфейсу: primary — заливка, secondary — напівпрозора, ghost — без фону, icon — кругла.
export default function Button({ variant = 'secondary', size = 'md', icon, iconRight, className = '', onClick, children, ...rest }) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, !children ? 'btn--icon' : '', className].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={(e) => {
        audio.play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children && <span className="btn__label">{children}</span>}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}
