// Бічні панелі для широких екранів (на телефонах приховані CSS-ом).
import PxIcon from './PxIcon.jsx';
export default function SidePanel({ side }) {
  if (side === 'left') {
    return (
      <aside className="side side--left">
        <h3>Керування</h3>
        <p>
          <kbd>
            <PxIcon name="arrowLeft" />
          </kbd>{' '}
          <kbd>
            <PxIcon name="arrowRight" />
          </kbd>{' '}
          / <kbd>A</kbd> <kbd>D</kbd>
          <br />
          рух вліво-вправо
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
        <li>Ланцюжок монет завжди веде безпечним проходом.</li>
        <li>Після удару ти кілька секунд невразливий — мерехтиш.</li>
        <li>На льоду й олії гальмуй заздалегідь.</li>
        <li>Щит розбиває одну перешкоду.</li>
      </ul>
    </aside>
  );
}
