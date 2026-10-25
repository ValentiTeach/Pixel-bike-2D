import TopBar from './TopBar.jsx';
import Icon from './Icon.jsx';
import { SpriteIcon, BikeIcon } from './SpriteIcon.jsx';
import { LOCATIONS } from '../game/locations.js';
import { ENTITY_TYPES } from '../game/entities.js';
import { getSkin } from '../game/skins.js';

const Row = ({ icon, children }) => (
  <li className="row">
    <span className="row__icon">{icon}</span>
    <span>{children}</span>
  </li>
);

const Key = ({ children }) => <kbd className="key">{children}</kbd>;

export default function HowTo({ save, onBack }) {
  return (
    <div className="screen howto">
      <TopBar title="Як грати" onBack={onBack} />
      <div className="scroll columns">
        <section className="card">
          <h3>Мета</h3>
          <ul>
            <Row icon={<BikeIcon skin={getSkin(save.skin)} scale={0.5} />}>
              Велосипед їде вправо сам. Перестрибуй перешкоди і ями, заїжджай на уступи, керуй швидкістю й доїдь до фінішу.
            </Row>
          </ul>
        </section>

        <section className="card">
          <h3>Керування</h3>
          <ul className="keys">
            <li>
              <span>
                <Key>Пробіл</Key> <Key>↑</Key> <Key>W</Key>
              </span>
              <span>стрибок, тримай — вище</span>
            </li>
            <li>
              <span>
                <Key>
                  <Icon name="arrowLeft" size="1em" />
                </Key>{' '}
                <Key>A</Key>
              </span>
              <span>гальмо</span>
            </li>
            <li>
              <span>
                <Key>
                  <Icon name="arrowRight" size="1em" />
                </Key>{' '}
                <Key>D</Key>
              </span>
              <span>розгін, стоячи на педалях</span>
            </li>
            <li>
              <span>
                <Key>Esc</Key> <Key>P</Key>
              </span>
              <span>пауза</span>
            </li>
            <li>
              <span>
                <Icon name="phone" />
              </span>
              <span>зліва — гальмо й розгін, справа — стрибок</span>
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Бонуси</h3>
          <ul>
            <Row icon={<SpriteIcon name="coin" box={9} />}>Монети — валюта гаража. Дуга з монет показує, де стрибати.</Row>
            <Row icon={<SpriteIcon name="heart" box={9} />}>Серце — +1 життя (максимум 3, інакше +5 монет).</Row>
            <Row icon={<SpriteIcon name="shield" box={9} />}>Щит — 7 секунд захисту, розбиває одну перешкоду.</Row>
          </ul>
        </section>

        <section className="card">
          <h3>Небезпеки</h3>
          <ul>
            <Row icon={<SpriteIcon name="puddle" box={14} />}>Калюжа, багно, пісок — сповільнюють.</Row>
            <Row icon={<SpriteIcon name="ice" box={14} />}>Лід і олія — велосипед котиться сам, гальма не працюють.</Row>
            <Row icon={<SpriteIcon name="bird" box={11} />}>Птахи летять на висоті стрибка — проїжджай під ними.</Row>
            <Row icon={<span className="pit-icon" />}>Яма — мінус життя, повернешся трохи назад.</Row>
          </ul>
        </section>

        <section className="card">
          <h3>Зірки</h3>
          <p>Скільки сердець лишилось на фініші — стільки зірок. Пройдений рівень відкриває наступну локацію і нескінченний режим.</p>
        </section>

        <section className="card">
          <h3>Локації</h3>
          <ul>
            {LOCATIONS.map((l) => (
              <li key={l.id} className="loc-row">
                <span className="loc-row__name">
                  <span className="dot" style={{ background: l.theme.accent }} />
                  {l.name}
                </span>
                <span className="loc-row__icons">
                  {[...l.obstacles, ...l.movers, ...l.flyers, ...l.hazards].map((o) => (
                    <SpriteIcon key={o.type} name={ENTITY_TYPES[o.type].sprites[0]} box={12} />
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
