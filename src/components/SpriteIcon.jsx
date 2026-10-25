import { useEffect, useRef } from 'react';
import { getSprite, getBikeFrame, spriteSize } from '../game/sprites.js';
import { PLAYER_W, PLAYER_H } from '../game/constants.js';

// Малює ігровий спрайт у маленькому canvas; розмір у CSS кратний ігровому пікселю (--u).
export function SpriteIcon({ name, frame = 0, scale = 1, className = '', title }) {
  const ref = useRef(null);
  const { w, h } = spriteSize(name);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(getSprite(name, { frame }), 0, 0);
  }, [name, frame]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      className={`sprite-icon ${className}`}
      style={{ width: `calc(var(--u) * ${w * scale})`, height: `calc(var(--u) * ${h * scale})` }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export function BikeIcon({ skin, frame = 0, scale = 1, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(getBikeFrame(skin, frame), 0, 0);
  }, [skin, frame]);
  return (
    <canvas
      ref={ref}
      width={PLAYER_W}
      height={PLAYER_H}
      className={`sprite-icon ${className}`}
      style={{ width: `calc(var(--u) * ${PLAYER_W * scale})`, height: `calc(var(--u) * ${PLAYER_H * scale})` }}
      aria-hidden
    />
  );
}
