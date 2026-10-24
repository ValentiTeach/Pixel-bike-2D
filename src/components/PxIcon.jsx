// Піксельні SVG-іконки для інтерфейсу. У шрифті Press Start 2P немає стрілок ←→, ∞, ✓, ↻,
// тому малюємо їх самі — тим самим «x»-матричним форматом, що й ігрові спрайти.
const ICONS = {
  left: ['....x', '...xx', '..xxx', '.xxxx', '..xxx', '...xx', '....x'],
  right: ['x....', 'xx...', 'xxx..', 'xxxx.', 'xxx..', 'xx...', 'x....'],
  arrowLeft: ['..x....', '.xx....', 'xxxxxxx', '.xx....', '..x....'],
  arrowRight: ['....x..', '....xx.', 'xxxxxxx', '....xx.', '....x..'],
  check: ['......x', '.....xx', 'x...xx.', 'xx.xx..', '.xxx...', '..x....'],
  retry: ['.xxxx.x', 'x....xx', 'x...xxx', 'x......', 'x.....x', '.x...x.', '..xxx..'],
  infinity: ['.xx...xx.', 'x..x.x..x', 'x...x...x', 'x..x.x..x', '.xx...xx.'],
  phone: ['xxxxx', 'x...x', 'x...x', 'x...x', 'x...x', 'xxxxx', 'xx.xx', 'xxxxx'],
};

export default function PxIcon({ name, size = 1, className = '', label }) {
  const rows = ICONS[name];
  const h = rows.length;
  const w = rows[0].length;
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) if (row[x] === 'x') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  });
  return (
    <svg
      className={`px-icon ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: `calc(var(--u) * ${w * size})`, height: `calc(var(--u) * ${h * size})` }}
      shapeRendering="crispEdges"
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects}
    </svg>
  );
}
