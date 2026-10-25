// Бічні панелі для широких екранів (на телефонах приховані CSS-ом).
import PxIcon from './PxIcon.jsx';
export default function SidePanel({ side }) {
  if (side === 'left') {
    return (
      <aside className="side side--left">
        <h3>Керування</h3>
        <p>
          <kbd>Пробіл</kbd> <kbd>↑</kbd> <kbd>W</kbd>
          <br />
          стрибок (тримай — вище)
        </p>
        <p>
          <kbd>
            <PxIcon name="arrowLeft" />
          </kbd>{' '}
          <kbd>
            <PxIcon name="arrowRight" />
          </kbd>{' '}
          / <kbd>A</kbd> <kbd>D</kbd>
          <br />
          гальмо / розгін
        </p>
        <p>
          <kbd>Esc</kbd> / <kbd>P</kbd>
          <br />
          пауза
        </p>
        <p>
          <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd>
          <br />
          меню
        </p>
      </aside>
    );
  }
  return (
    <aside className="side side--right">
      <h3>Поради</h3>
      <ul>
        <li>Дуга з монет показує, де стрибати.</li>
        <li>Під птахами не стрибай — проїжджай знизу.</li>
        <li>Перед довгою ямою розженися (→).</li>
        <li>Уступ зупиняє — стрибай заздалегідь.</li>
        <li>Щит розбиває одну перешкоду.</li>
      </ul>
    </aside>
  );
}
