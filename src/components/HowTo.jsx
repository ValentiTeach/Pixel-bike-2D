import TopBar from './TopBar.jsx';
import PxIcon from './PxIcon.jsx';
import { SpriteIcon, BikeIcon } from './SpriteIcon.jsx';
import { LOCATIONS } from '../game/locations.js';
import { ENTITY_TYPES } from '../game/entities.js';
import { getSkin } from '../game/skins.js';

const Row = ({ icon, children }) => (
  <li className="howto__row">
    <span className="howto__icon">{icon}</span>
    <span>{children}</span>
  </li>
);

export default function HowTo({ save, onBack }) {
  return (
    <div className="screen howto">
      <TopBar title="Як грати" onBack={onBack} />
      <div className="scroll">
        <section className="px-box howto__section">
          <h3>Мета</h3>
          <ul>
            <Row icon={<BikeIcon skin={getSkin(save.skin)} />}>
              Велосипед їде сам. Ти керуєш лише <b>вліво-вправо</b> і об&apos;їжджаєш перешкоди. Доїдь до фінішу!
            </Row>
          </ul>
        </section>

        <section className="px-box howto__section">
          <h3>Керування</h3>
          <ul className="howto__keys">
            <li>
              <kbd>
                <PxIcon name="arrowLeft" />
              </kbd>{' '}
              <kbd>
                <PxIcon name="arrowRight" />
              </kbd>{' '}
              або <kbd>A</kbd> <kbd>D</kbd> — рух
            </li>
            <li>
              <kbd>Esc</kbd> / <kbd>P</kbd> — пауза
            </li>
            <li>
              <kbd>Enter</kbd> — ще раз після заїзду
            </li>
            <li>
              <PxIcon name="phone" /> Тримай ліву або праву половину екрана
            </li>
          </ul>
        </section>

        <section className="px-box howto__section">
          <h3>Бонуси</h3>
          <ul>
            <Row icon={<SpriteIcon name="coin" />}>Монета — валюта для гаража. Ланцюжок монет підказує безпечний шлях.</Row>
            <Row icon={<SpriteIcon name="heart" />}>Серце — +1 життя (максимум 3, інакше +5 монет).</Row>
            <Row icon={<SpriteIcon name="shield" />}>Щит — 7 секунд захисту, розбиває одну перешкоду.</Row>
          </ul>
        </section>

        <section className="px-box howto__section">
          <h3>Небезпечні зони</h3>
          <ul>
            <Row icon={<SpriteIcon name="puddle" />}>Калюжа, багно, пісок — сповільнюють.</Row>
            <Row icon={<SpriteIcon name="ice" />}>Лід і олія — велосипед заносить, керування з інерцією.</Row>
          </ul>
        </section>

        <section className="px-box howto__section">
          <h3>Зірки</h3>
          <p>
            Скільки сердець лишилось на фініші — стільки й зірок. Проходження рівня відкриває наступну локацію і
            нескінченний режим на цій.
          </p>
        </section>

        <section className="px-box howto__section">
          <h3>Локації</h3>
          <ul>
            {LOCATIONS.map((l) => (
              <li key={l.id} className="howto__loc">
                <b style={{ color: l.theme.accent }}>{l.name}</b>
                <span className="howto__loc-icons">
                  {[...l.obstacles, ...l.hazards].map((o) => (
                    <SpriteIcon key={o.type} name={ENTITY_TYPES[o.type].sprites[0]} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
