import { useMemo } from 'react';
import './GlowingDie.css';

// Pre-generate ember and streak particle data
function generateEmbers(count = 52) {
  return Array.from({ length: count }, () => {
    const top = 25 + Math.random() * 50;
    const left = 25 + Math.random() * 50;
    const size = 2 + Math.random() * 5.5;
    const dur = (1.5 + Math.random() * 2).toFixed(2);
    const delay = (Math.random() * 3.2).toFixed(2);
    const r = Math.random();
    const col = r > 0.62 ? '#FFE6B6' : (r > 0.32 ? '#FF9E42' : '#FF6A24');
    return { top, left, size, dur, delay, col };
  });
}

function generateStreaks(count = 7) {
  return Array.from({ length: count }, () => {
    const top = 30 + Math.random() * 40;
    const left = 20 + Math.random() * 60;
    const w = 50 + Math.random() * 120;
    const dur = (1.8 + Math.random() * 1.8).toFixed(2);
    const delay = (Math.random() * 2.6).toFixed(2);
    return { top, left, w, dur, delay };
  });
}

const FACES = [
  { char: '서울', className: 'die-face die-face--front' },
  { char: '인천', className: 'die-face die-face--back' },
  { char: '가평', className: 'die-face die-face--right' },
  { char: '전주', className: 'die-face die-face--left' },
  { char: '부산', className: 'die-face die-face--top' },
  { char: '강릉', className: 'die-face die-face--bottom' },
];

export default function GlowingDie() {
  const embers = useMemo(() => generateEmbers(), []);
  const streaks = useMemo(() => generateStreaks(), []);

  return (
    <div className="die-container">
      {/* Ambient glow */}
      <div className="die-ambient-glow" />

      {/* Motion-blur streaks */}
      {streaks.map((s, i) => (
        <div
          key={`streak-${i}`}
          className="die-streak"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.w}px`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Ember trail */}
      {embers.map((e, i) => (
        <div
          key={`ember-${i}`}
          className="die-ember"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            background: e.col,
            boxShadow: `0 0 ${(e.size * 2.2).toFixed(1)}px ${e.col}`,
            animationDuration: `${e.dur}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}

      {/* The die itself */}
      <div className="die-perspective">
        <div className="die-cube">
          {/* Inner glow core */}
          <div className="die-inner-glow" />

          {FACES.map((face, i) => (
            <div key={i} className={face.className}>
              {face.char}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
