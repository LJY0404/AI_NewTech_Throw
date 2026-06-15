import { useState, useEffect, useMemo } from 'react';
import './KoreaMapDraw.css';
import mapUrl from '../assets/map.avif';

/* ── The 20 destiny regions (mirrors backend region_pool.json) ─────────────
   Each pool region is a city; on the map it lights up the province it sits in.
   ModeSelectionSection imports REGION_NAMES so the lottery can only land on a
   region the map can actually draw.                                          */
export const REGIONS = [
  { name: '성수', province: 'gyeonggi' },
  { name: '강릉', province: 'gangwon' },
  { name: '부산 해운대', province: 'gyeongnam' },
  { name: '양평', province: 'gyeonggi' },
  { name: '가평', province: 'gyeonggi' },
  { name: '속초', province: 'gangwon' },
  { name: '춘천', province: 'gangwon' },
  { name: '전주', province: 'jeonbuk' },
  { name: '경주', province: 'gyeongbuk' },
  { name: '여수', province: 'jeonnam' },
  { name: '인천 송도', province: 'gyeonggi' },
  { name: '수원 화성', province: 'gyeonggi' },
  { name: '파주 헤이리', province: 'gyeonggi' },
  { name: '통영', province: 'gyeongnam' },
  { name: '단양', province: 'chungbuk' },
  { name: '안동', province: 'gyeongbuk' },
  { name: '군산', province: 'jeonbuk' },
  { name: '평창', province: 'gangwon' },
  { name: '영월', province: 'gangwon' },
  { name: '정선', province: 'gangwon' },
];

export const REGION_NAMES = REGIONS.map((r) => r.name);

/* ── Province glow zones, traced over map.avif (viewBox 0 0 900 900) ───────
   Polygons sit on top of the real isometric map image and light up orange.
   Coordinates follow the image's projection so each lit zone lands on the
   matching province; the soft glow feathers any tracing imperfection.       */
const PROVINCES = [
  { id: 'gyeonggi',  points: [[358,150],[470,158],[470,300],[432,316],[306,316],[286,258],[300,202],[338,164]] },
  { id: 'gangwon',   points: [[470,158],[516,114],[558,138],[610,176],[655,256],[678,332],[522,318],[470,300]] },
  { id: 'chungbuk',  points: [[470,300],[522,318],[545,365],[512,425],[440,442],[398,360]] },
  { id: 'chungnam',  points: [[306,316],[432,316],[398,360],[440,442],[386,476],[300,464],[270,402],[290,344]] },
  { id: 'gyeongbuk', points: [[522,318],[678,332],[686,412],[662,478],[560,478],[512,425],[545,365]] },
  { id: 'gyeongnam', points: [[512,425],[560,478],[662,478],[658,514],[610,562],[556,590],[486,558],[470,478]] },
  { id: 'jeonbuk',   points: [[300,464],[386,476],[440,442],[512,425],[470,478],[442,540],[332,530],[296,504]] },
  { id: 'jeonnam',   points: [[296,504],[332,530],[442,540],[486,558],[470,602],[400,642],[316,650],[262,604],[258,544]] },
];

const VIEW = 900;

const toPath = (points) =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + ' Z';

const centroid = (points) => {
  const n = points.length;
  return {
    x: points.reduce((s, p) => s + p[0], 0) / n,
    y: points.reduce((s, p) => s + p[1], 0) / n,
  };
};

export default function KoreaMapDraw({ selectedRegion, onConfirm }) {
  // 'scanning'(2.5s) → 'narrowing'(1.5s) → 'lock'(1s) → 'reveal'
  const [phase, setPhase] = useState('scanning');

  const winner = useMemo(
    () => REGIONS.find((r) => r.name === selectedRegion) ?? REGIONS[0],
    [selectedRegion]
  );

  const provinces = useMemo(
    () =>
      PROVINCES.map((p) => ({
        ...p,
        d: toPath(p.points),
        c: centroid(p.points),
        delay: (Math.random() * 1.6).toFixed(2),
      })),
    []
  );

  const winnerPos = useMemo(
    () => provinces.find((p) => p.id === winner.province)?.c ?? { x: VIEW / 2, y: VIEW / 2 },
    [provinces, winner]
  );

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('narrowing'), 2500),
      setTimeout(() => setPhase('lock'), 4000),
      setTimeout(() => setPhase('reveal'), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const isLocked = phase === 'lock' || phase === 'reveal';
  const isRevealed = phase === 'reveal';

  return (
    <div className="kmd" role="dialog" aria-modal="true" aria-label="운명의 여행지 추첨">
      <div className="kmd__panel">
        {/* Status line */}
        <div className={`kmd__status kmd__status--${phase}`}>
          {!isRevealed ? (
            <span className="kmd__status-text">
              운명의 여행지를 탐색하고 있습니다
              <span className="kmd__ellipsis"><i>.</i><i>.</i><i>.</i></span>
            </span>
          ) : (
            <span className="kmd__status-text kmd__status-text--done">DESTINY LOCKED</span>
          )}
        </div>

        {/* ── Map ─────────────────────────────────────────────────────── */}
        <div className="kmd__map-wrap">
          {/* Real Korea map — white bg drops out via invert + screen blend */}
          <img className="kmd__map-img" src={mapUrl} alt="" aria-hidden="true" />

          {/* Glow overlay aligned to the image */}
          <svg
            className="kmd__overlay"
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="kmd-glow" cx="50%" cy="42%" r="65%">
                <stop offset="0%" stopColor="#FFC79B" />
                <stop offset="45%" stopColor="#FF783C" />
                <stop offset="100%" stopColor="#FF4614" />
              </radialGradient>

              {/* map.avif는 흰 배경(255)에 옅은 회색 지형(~231~242)이라 대비가 거의 없다.
                 invert로 배경=0·지형≈0.05~0.09 로 뒤집은 뒤, 가파른 램프(slope 30)로
                 "흰 배경보다 조금이라도 어두우면 육지"가 되도록 거의 이진 마스크를 만든다.
                 해안 안티에일리어싱 구간만 부분값이 남아 가장자리가 자연스럽게 페더링된다. */}
              <filter id="kmd-land-lum" colorInterpolationFilters="sRGB">
                <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 0 1" />
                <feComponentTransfer>
                  <feFuncR type="linear" slope="30" intercept="-0.3" />
                  <feFuncG type="linear" slope="30" intercept="-0.3" />
                  <feFuncB type="linear" slope="30" intercept="-0.3" />
                </feComponentTransfer>
              </filter>

              {/* 글로우를 실제 육지 실루엣 안으로만 가두는 마스크 → 바다로 절대 안 삐져나감 */}
              <mask id="kmd-land" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW} height={VIEW}>
                <image
                  href={mapUrl}
                  x="0"
                  y="0"
                  width={VIEW}
                  height={VIEW}
                  preserveAspectRatio="xMidYMid meet"
                  filter="url(#kmd-land-lum)"
                />
              </mask>
            </defs>

            <g mask="url(#kmd-land)">
              {provinces.map((p) => {
                const isWinner = p.id === winner.province;
                const stateClass = isLocked
                  ? isWinner
                    ? 'kmd-prov--winner'
                    : 'kmd-prov--dimmed'
                  : `kmd-prov--${phase}`;
                return (
                  <path
                    key={p.id}
                    className={`kmd-prov ${stateClass}`}
                    d={p.d}
                    style={{ '--rise-delay': `${p.delay}s` }}
                  />
                );
              })}
            </g>

            {/* Connector + shockwave + winning city label */}
            {isLocked && (
              <>
                <line
                  className="kmd__connector"
                  x1={winnerPos.x}
                  y1={winnerPos.y}
                  x2={VIEW / 2}
                  y2={VIEW - 4}
                />
                <circle className="kmd__ping" cx={winnerPos.x} cy={winnerPos.y} r="14" />
                <circle className="kmd__ping kmd__ping--delayed" cx={winnerPos.x} cy={winnerPos.y} r="14" />
                <text className="kmd__winner-label" x={winnerPos.x} y={winnerPos.y} textAnchor="middle">
                  {winner.name}
                </text>
              </>
            )}
          </svg>
        </div>

        {/* ── Result reveal ───────────────────────────────────────────── */}
        <div className={`kmd__result ${isRevealed ? 'kmd__result--in' : ''}`}>
          <div className="kmd__result-region">{winner.name}</div>
          <p className="kmd__result-sub">운명이 당신의 여행지를 선택했습니다</p>
          <button type="button" className="kmd__confirm" onClick={() => onConfirm?.(winner.name)}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
