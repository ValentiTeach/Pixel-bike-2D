import { audio } from '../game/audio.js';

export default function PixelButton({ variant = 'default', small = false, className = '', onClick, children, ...rest }) {
  const cls = ['px-btn', `px-btn--${variant}`, small ? 'px-btn--small' : '', className].filter(Boolean).join(' ');
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
      {children}
    </button>
  );
}
