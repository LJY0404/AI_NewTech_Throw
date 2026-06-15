import { useState } from 'react';
import './DestinyLevelSelector.css';

const LEVELS = [
  {
    level: 1,
    title: '여행 초보자',
    description: '검증된 인기 여행지 안에서만 안전하게 골라드려요.',
    rangeLabel: '인기 여행지',
  },
  {
    level: 2,
    title: '여행 중급자',
    description: '인기 여행지에 더해, 조금 멀고 낯선 곳까지 후보를 넓혀요.',
    rangeLabel: '+ 낯선 여행지',
  },
  {
    level: 3,
    title: '여행 고수',
    description: '숨겨진 보석 같은 곳까지, 추천 범위가 훨씬 넓어져요.',
    rangeLabel: '+ 숨은 명소',
  },
  {
    level: 4,
    title: '무작정 떠나기',
    description: '인적 드문 오지까지 — 지도 위 거의 모든 곳이 후보가 돼요.',
    rangeLabel: '+ 미지의 오지',
  },
];

export default function DestinyLevelSelector({ onLevelSelect, defaultLevel = null }) {
  const [selected, setSelected] = useState(defaultLevel);

  const handleSelect = (level) => {
    setSelected(level);
    onLevelSelect?.(level);
  };

  return (
    <section className="dls">
      <div className="dls__head">
        <span className="dls__eyebrow">ADVENTURER LEVEL</span>
        <h2 className="dls__title">
          어디까지 <span className="dls__title-accent">운명</span>에 맡길까요?
        </h2>
        <p className="dls__subtitle">
          레벨은 추천 <strong>후보 범위</strong>를 정해요. 높일수록 가까운 인기 여행지부터
          아무도 모르는 오지까지, 운명의 폭이 점점 넓어집니다.
        </p>
      </div>

      <div className="dls__track" role="radiogroup" aria-label="모험 강도 선택">
        {LEVELS.map((item) => {
          const isActive = selected === item.level;
          return (
            <button
              key={item.level}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`dls-card dls-card--lv${item.level} ${isActive ? 'dls-card--active' : ''}`}
              onClick={() => handleSelect(item.level)}
            >
              <span className="dls-card__node" aria-hidden="true">
                <span className="dls-card__node-dot" />
              </span>

              <span className="dls-card__body">
                <span className="dls-card__heading">
                  <span className="dls-card__level">LV.{item.level}</span>
                  <span className="dls-card__title">{item.title}</span>
                  <span className="dls-card__indicator" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </span>
                <span className="dls-card__desc">{item.description}</span>

                <span className="dls-card__range" aria-hidden="true">
                  <span className="dls-card__range-track">
                    <span
                      className="dls-card__range-fill"
                      style={{ width: `${(item.level / LEVELS.length) * 100}%` }}
                    />
                  </span>
                  <span className="dls-card__range-tag">{item.rangeLabel}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
