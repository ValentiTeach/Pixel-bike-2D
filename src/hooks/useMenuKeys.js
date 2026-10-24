import { useEffect } from 'react';

// Навігація стрілками ↑/↓ між кнопками всередині контейнера (для гри з клавіатури).
export function useMenuKeys(ref, { autoFocus = true } = {}) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const buttons = () => [...root.querySelectorAll('button:not([disabled]), input')];
    if (autoFocus && window.matchMedia?.('(pointer: fine)').matches) buttons()[0]?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
      const list = buttons();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      const next = e.code === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[i === -1 ? 0 : next].focus();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ref, autoFocus]);
}
