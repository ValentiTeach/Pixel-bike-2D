import TopBar from './TopBar.jsx';
import Icon from './Icon.jsx';
import { SpriteIcon, BikeIcon } from './SpriteIcon.jsx';
import { DifficultyMark } from './LevelSelect.jsx';
import { LOCATIONS, DIFFICULTY } from '../game/locations.js';
import { getSkin } from '../game/skins.js';
import { getBike } from '../game/bikes.js';
import { formatTime } from '../game/storage.js';

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
            <Row icon={<BikeIcon bike={getBike(save.bike)} skin={getSkin(save.skin)} scale={0.45} />}>
              Спустись трасою до фінішу якнайшвидше. Велосипед не їде сам: крути педалі, гальмуй, переносячи вагу, і приземлюйся на обидва колеса.
            </Row>
          </ul>
        </section>

        <section className="card">
          <h3>Керування</h3>
          <ul className="keys">
            <li>
              <span>
                <Key>↑</Key> <Key>W</Key>
              </span>
              <span>крутити педалі</span>
            </li>
            <li>
              <span>
                <Key>↓</Key> <Key>S</Key>
              </span>
              <span>гальмо (обидва колеса)</span>
            </li>
            <li>
              <span>
                <Key>←</Key> <Key>A</Key>
              </span>
              <span>нахил назад: вілі, у повітрі — бекфліп</span>
            </li>
            <li>
              <span>
                <Key>→</Key> <Key>D</Key>
              </span>
              <span>нахил уперед: стопі, у повітрі — фронтфліп</span>
            </li>
            <li>
              <span>
                <Key>Пробіл</Key>
              </span>
              <span>банні-хоп (через колоду чи з губи трампліна)</span>
            </li>
            <li>
              <span>
                <Key>R</Key>
              </span>
              <span>повернутись на чекпоінт</span>
            </li>
            <li>
              <span>
                <Icon name="phone" />
              </span>
              <span>зліва — нахил, справа — гальмо, педалі й хоп</span>
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>Фізика як у житті</h3>
          <ul>
            <Row icon={<Icon name="gauge" />}>Підвіска стискається на приземленні. Якщо впасти з висоти на рівне — «пробій» і падіння.</Row>
            <Row icon={<Icon name="mountain" />}>Приземляйся на схил приземлення паралельно до нього — так м'якше. Біля краю дропа відкинься назад.</Row>
            <Row icon={<Icon name="brake" />}>Різко гальмуєш переднім колесом під гору — перелетиш через кермо. Нахились назад.</Row>
            <Row icon={<Icon name="snowflake" />}>Зчеплення залежить від покриття: камінь і бетон тримають, сніг гірше, лід майже ні. Пісок і багно гальмують колеса.</Row>
            <Row icon={<SpriteIcon name="signGap" box={12} />}>Жовті знаки попереджають про тейбл, дроп чи геп. Дуга монет показує правильну швидкість.</Row>
          </ul>
        </section>

        <section className="card">
          <h3>Трюки</h3>
          <ul>
            <Row icon={<Icon name="flip" />}>Бекфліп і фронтфліп — тримай нахил у повітрі й приземлись на колеса. Подвійний — учетверо більше очок.</Row>
            <Row icon={<Icon name="clock" />}>Політ довше секунди, вілі й стопі, чисте приземлення (×1.25).</Row>
            <Row icon={<SpriteIcon name="coin" box={9} />}>Кожні 250 очок — монета на фініші. Монети — валюта гаража.</Row>
          </ul>
        </section>

        <section className="card">
          <h3>Зірки</h3>
          <p>Зірки дають за час: фініш — одна, «срібний» час — дві, «золотий» — три. Падіння коштує часу: повертаєшся на останній чекпоінт.</p>
        </section>

        <section className="card">
          <h3>Траси</h3>
          <ul>
            {LOCATIONS.map((l) => (
              <li key={l.id} className="loc-row">
                <span className="loc-row__name">
                  <DifficultyMark level={l.difficulty} />
                  {l.name}
                </span>
                <span className="loc-row__icons muted">
                  {DIFFICULTY[l.difficulty].label} · {l.lengthM} м · <Icon name="star" fill size="0.9em" /> {formatTime(l.times.gold)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
