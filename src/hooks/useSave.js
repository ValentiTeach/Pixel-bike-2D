import { useEffect, useState } from 'react';
import { loadSave, writeSave } from '../game/storage.js';

// Стан збереження гри, що автоматично пишеться в localStorage.
export function useSave() {
  const [save, setSave] = useState(() => loadSave());
  useEffect(() => writeSave(save), [save]);
  return [save, setSave];
}
