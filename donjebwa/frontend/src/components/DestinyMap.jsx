import RouletteWheel from './RouletteWheel';
import './DestinyMap.css';

export default function DestinyMap({
  cityNames,
  selected,
  needleRot,
  spinning,
  statusText,
  btnLabel,
  target,
  rpm,
  onSpin,
}) {
  return (
    <section id="destiny-map" className="destiny-map">
      <div className="destiny-map__label">DESTINY MAP</div>
      <h2 className="destiny-map__title">운명의 룰렛</h2>
      <p className="destiny-map__desc">
        지도는 가만히, 운명만이 빙글빙글 돕니다. 룰렛이 멈추는 그곳이 바로 당신의 destiny point.
      </p>

      <RouletteWheel
        cityNames={cityNames}
        selected={selected}
        needleRot={needleRot}
        spinning={spinning}
      />

      {/* Status indicator */}
      <div className="destiny-map__status">
        <div className="destiny-map__dots">
          <div className="destiny-map__dot destiny-map__dot--1" />
          <div className="destiny-map__dot destiny-map__dot--2" />
          <div className="destiny-map__dot destiny-map__dot--3" />
        </div>
        <span className="destiny-map__status-text">{statusText}</span>
      </div>

      {/* Spin button */}
      <button className="destiny-map__spin-btn" onClick={onSpin}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FF8A4C" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M16 8l-2 6-6 2 2-6 6-2z" />
        </svg>
        {btnLabel}
      </button>

      {/* Stats */}
      <div className="destiny-map__stats">
        <div className="destiny-map__stat">
          <span className="destiny-map__stat-dot destiny-map__stat-dot--green" />
          CITIES: 12
        </div>
        <div className="destiny-map__stat">
          <span className="destiny-map__stat-dot destiny-map__stat-dot--orange" />
          TARGET: {target}
        </div>
        <div className="destiny-map__stat">
          RPM: {rpm}
        </div>
      </div>
    </section>
  );
}
