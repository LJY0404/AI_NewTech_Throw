import { useMemo } from 'react';
import SouthKoreaMap from './SouthKoreaMap';
import './RouletteWheel.css';

const CENTER = 310;
const RADIUS = 250;

export default function RouletteWheel({ cityNames, selected, needleRot, spinning }) {
  const cities = useMemo(() => {
    return cityNames.map((name, i) => {
      const angle = (-90 + i * 30) * Math.PI / 180;
      const x = CENTER + RADIUS * Math.cos(angle);
      const y = CENTER + RADIUS * Math.sin(angle);
      const isSel = selected === i;
      return { name, x, y, isSel };
    });
  }, [cityNames, selected]);

  const needleStyle = {
    position: 'absolute',
    left: '310px',
    top: '82px',
    width: '4px',
    height: '228px',
    transformOrigin: '50% 100%',
    transform: `rotate(${needleRot}deg)`,
    transition: spinning
      ? 'transform 4.2s cubic-bezier(.16,.74,.12,1)'
      : 'transform .4s ease',
    zIndex: 6,
    pointerEvents: 'none',
  };

  return (
    <div className="roulette">
      {/* Background circles */}
      <div className="roulette__glow" />
      <div className="roulette__orbit-ring" />
      <div className="roulette__inner-ring" />

      {/* Top pointer */}
      <div className="roulette__pointer">
        <svg width="22" height="14" viewBox="0 0 22 14" fill="#FF5A1F">
          <path d="M11 14L1 1h20z" />
        </svg>
      </div>

      {/* Map panel */}
      <SouthKoreaMap />

      {/* Needle */}
      <div style={needleStyle}>
        <div className="roulette__needle-bar" />
        <div className="roulette__needle-dot" />
      </div>

      {/* Center dot */}
      <div className="roulette__center-dot" />

      {/* City markers */}
      {cities.map((city, i) => (
        <div
          key={i}
          className="roulette__city"
          style={{ left: `${city.x}px`, top: `${city.y}px` }}
        >
          <div className={`roulette__city-dot ${city.isSel ? 'roulette__city-dot--selected' : ''}`} />
          <div className={`roulette__city-label ${city.isSel ? 'roulette__city-label--selected' : ''}`}>
            {city.name}
          </div>
        </div>
      ))}
    </div>
  );
}
