import Icon from './Icon.jsx';

export default function Stars({ count, max = 3, size = '1.1em', animate = false }) {
  return (
    <span className={`stars ${animate ? 'stars--animate' : ''}`} aria-label={`${count} з ${max} зірок`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`stars__item ${i < count ? 'is-on' : ''}`} style={{ animationDelay: `${0.2 + i * 0.18}s` }}>
          <Icon name="star" fill={i < count} size={size} />
        </span>
      ))}
    </span>
  );
}
