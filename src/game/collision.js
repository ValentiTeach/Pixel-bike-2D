// Прямокутні зіткнення (AABB).

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Хітбокс сутності у світових координатах. Для віддзеркаленого спрайта міняємо лівий/правий відступ.
export function hitboxOf(e) {
  const [l, t, r, b] = e.hitbox;
  const left = e.flip ? r : l;
  const right = e.flip ? l : r;
  return { x: e.x + left, y: e.y + t, w: e.w - left - right, h: e.h - t - b };
}
