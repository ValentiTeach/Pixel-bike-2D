import { useEffect, useRef } from 'react';
import { getSprite, getBikeFrame, spriteSize, PREVIEW } from '../game/sprites.js';

// Малює ігровий спрайт у маленькому canvas; розмір у CSS кратний ігровому пікселю (--u).
export function SpriteIcon({ name, frame = 0, scale: scaleProp = 1, box, className = '', title }) {
  const ref = useRef(null);
  const { w, h } = spriteSize(name);
  // box — вписати спрайт у квадрат box×box ігрових пікселів (для іконок у списках)
  const scale = box ? Math.min(box / w, box / h) : scaleProp;
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

// Велосипед з райдером (вигляд збоку) — для гаража і «Як грати».
export function BikeIcon({ bike, skin, frame = 0, scale = 1, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(getBikeFrame(bike, skin, frame), 0, 0);
  }, [bike, skin, frame]);
  return (
    <canvas
      ref={ref}
      width={PREVIEW.w}
      height={PREVIEW.h}
      className={`sprite-icon ${className}`}
      style={{ width: `calc(var(--u) * ${PREVIEW.w * scale})`, height: `calc(var(--u) * ${PREVIEW.h * scale})` }}
      aria-hidden
    />
  );
}
