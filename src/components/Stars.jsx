import { SpriteIcon } from './SpriteIcon.jsx';

export default function Stars({ count, max = 3, scale = 1, animate = false }) {
  return (
    <span className={`stars ${animate ? 'stars--animate' : ''}`} aria-label={`${count} з ${max} зірок`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="stars__item" style={{ animationDelay: `${0.25 + i * 0.25}s` }}>
          <SpriteIcon name={i < count ? 'star' : 'star:empty'} scale={scale} />
        </span>
      ))}
    </span>
  );
}
