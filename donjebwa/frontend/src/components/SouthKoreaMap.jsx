import './SouthKoreaMap.css';

const SK_PATH = 'M55,62 L65,50 L95,40 L130,35 L160,40 L175,62 L200,100 L210,148 L200,175 L182,195 L160,210 L150,212 L115,213 L95,220 L55,235 L50,210 L55,185 L50,168 L65,152 L55,145 L55,132 L38,112 L62,105 L70,100 L60,78 Z';

export default function SouthKoreaMap() {
  return (
    <div className="sk-map-panel">
      <svg width="240" height="300" viewBox="0 0 240 300" className="sk-map-svg">
        <defs>
          <radialGradient id="skfill" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#5a1c08" />
            <stop offset="60%" stopColor="#7a2408" />
            <stop offset="100%" stopColor="#3a1204" />
          </radialGradient>
          <linearGradient id="skstroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD24A" />
            <stop offset="55%" stopColor="#FF8A2C" />
            <stop offset="100%" stopColor="#FF5A1F" />
          </linearGradient>
          <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="0.9" fill="rgba(255,150,70,.35)" />
          </pattern>
        </defs>
        <path d={SK_PATH} fill="url(#skfill)" stroke="url(#skstroke)" strokeWidth="2.4" strokeLinejoin="round" />
        <path d={SK_PATH} fill="url(#dots)" opacity="0.55" />
        <ellipse cx="72" cy="266" rx="19" ry="10" fill="url(#skfill)" stroke="url(#skstroke)" strokeWidth="2" />
      </svg>
    </div>
  );
}
