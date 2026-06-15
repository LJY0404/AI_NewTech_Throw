import { useState } from 'react';
import './ModeSelectionSection.css';
import DestinyLevelSelector from './DestinyLevelSelector';
import KoreaMapDraw, { REGION_NAMES } from './KoreaMapDraw';

const CITY_NAMES = ['서울','부산','대구','인천','광주','대전','울산','제주','춘천','강릉','전주','목포'];

// 프론트 동행 id → 백엔드 Companion enum 값(한글)
const COMPANION_KO = { solo: '혼자', couple: '커플', friend: '친구' };

const REGION_SUGGESTIONS = [
  { label: '성수', icon: '🏭' },
  { label: '해운대', icon: '🌊' },
  { label: '제주', icon: '🌴' },
  { label: '강릉', icon: '⛱️' },
  { label: '전주', icon: '🏯' },
  { label: '서울 도심', icon: '🌆' },
];

const WHEN_SUGGESTIONS = ['지금 바로', '오늘 저녁', '내일', '이번 주말', '다음 주말'];

const MOOD_SUGGESTIONS = [
  { label: '조용한', icon: '🍃' },
  { label: '인스타 감성', icon: '📸' },
  { label: '로맨틱', icon: '💞' },
  { label: '활기찬', icon: '🎉' },
  { label: '힐링', icon: '🧖' },
  { label: '미식 탐방', icon: '🍽️' },
  { label: '레트로', icon: '📻' },
  { label: '자연', icon: '🌲' },
];

export default function ModeSelectionSection({ onThrow }) {
  const [mode, setMode] = useState(null); // null | 'random' | 'planned'

  // Random path state
  const [destinyLevel, setDestinyLevel] = useState(null); // 1~4
  const [lotteryRegion, setLotteryRegion] = useState(null); // 추첨 애니메이션이 착지할 지역

  // Planned form state
  const [companion, setCompanion] = useState('couple');
  const [region, setRegion] = useState('');
  const [when, setWhen] = useState('');
  const [moods, setMoods] = useState([]);

  const toggleMood = (label) =>
    setMoods((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );

  const handleRandom = () => {
    // 바로 던지지 않고 먼저 모험 강도(레벨)를 고르게 한다
    setMode('random');
  };

  const handleThrowDestiny = () => {
    // 랜덤 경로: 결과(지역)는 여기서 미리 확정하고, 추첨 애니메이션은 순수 연출.
    // 후보 풀은 지도가 그리는 20개 지역과 동일(REGION_NAMES) — 지도에 없는 곳에 착지 불가.
    // (추후 destinyLevel로 가중치 추첨 가능)
    const finalRegion = REGION_NAMES[Math.floor(Math.random() * REGION_NAMES.length)];
    setLotteryRegion(finalRegion);
  };

  const handleLotteryConfirm = (region) => {
    setLotteryRegion(null);
    onThrow({
      region,
      when: when.trim() || undefined,
      companion: COMPANION_KO[companion],
      destinyLevel, // 백엔드는 추가 필드를 무시 — 추후 가중치 연동용
    });
  };

  const handlePlanned = () => {
    setMode('planned');
  };

  const handleSubmit = () => {
    let finalRegion = region.trim();
    if (!finalRegion) {
      finalRegion = CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)];
    }
    // 계획형 경로: 사용자 입력을 ThrowRequest 형태로 전달
    onThrow({
      region: finalRegion,
      when: when.trim() || undefined,
      companion: COMPANION_KO[companion],
      mood: moods.length ? moods.join(', ') : undefined,
    });
  };

  const companions = [
    { id: 'solo', label: '혼자', icon: '🧑' },
    { id: 'couple', label: '커플', icon: '👩‍❤️‍👨' },
    { id: 'friend', label: '친구', icon: '👯' },
  ];

  return (
    <section id="mode-selection" className="mode-selection">
      <div className="mode-selection__label">CHOOSE YOUR PATH</div>
      <h2 className="mode-selection__title">
        운명을 <span className="mode-selection__title-accent">어떻게</span> 정할까요?
      </h2>
      <p className="mode-selection__desc">
        모든 걸 운명에 맡길지, 당신의 취향을 더할지 선택하세요.
      </p>

      <div className="mode-selection__cards">
        {/* Choice A — Random */}
        <button
          type="button"
          className={`mode-card ${mode === 'random' ? 'mode-card--active' : ''}`}
          onClick={handleRandom}
        >
          <div className="mode-card__glow" />
          <div className="mode-card__icon mode-card__icon--random" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="8" cy="16" r="1.4" fill="currentColor" stroke="none" />
              <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h3 className="mode-card__title">랜덤으로 갈래</h3>
          <p className="mode-card__text">
            누구와·언제만 정하면, 여행지는 AI가 운명처럼 무작위로 추첨합니다.
          </p>
          <span className="mode-card__cta">
            운명에 맡기기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>

        {/* Choice B — Planned */}
        <button
          type="button"
          className={`mode-card ${mode === 'planned' ? 'mode-card--active' : ''}`}
          onClick={handlePlanned}
        >
          <div className="mode-card__glow" />
          <div className="mode-card__icon mode-card__icon--planned" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polygon points="15.5 8.5 10.5 10.5 8.5 15.5 13.5 13.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h3 className="mode-card__title">직접 입력할래</h3>
          <p className="mode-card__text">
            누구와, 어떤 분위기의 여행을 가고 싶은지 직접 설정합니다.
          </p>
          <span className="mode-card__cta">
            취향 설정하기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>

      {/* Inline expanding random flow (Choice A): 누구와 + 언제 입력 → 레벨 설정 */}
      <div className={`mode-form ${mode === 'random' ? 'mode-form--open' : ''}`}>
        <div className="mode-form__inner">
          {/* Step 1 — 누구와 떠나는지 */}
          <div className="mode-form__group">
            <span className="mode-form__label">누구와 떠나시나요?</span>
            <div className="mode-form__companions">
              {companions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`mode-form__companion ${companion === c.id ? 'mode-form__companion--active' : ''}`}
                  onClick={() => setCompanion(c.id)}
                >
                  <span className="mode-form__companion-icon">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1 — 언제 떠나는지 */}
          <div className="mode-form__group">
            <span className="mode-form__label">
              언제 떠나시나요? <span className="mode-form__hint">선택</span>
            </span>
            <div className="mode-form__chips">
              {WHEN_SUGGESTIONS.map((w) => (
                <button
                  type="button"
                  key={w}
                  className={`mode-form__chip ${when === w ? 'mode-form__chip--active' : ''}`}
                  onClick={() => setWhen(when === w ? '' : w)}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="mode-form__inline-input"
              placeholder="직접 입력 (예: 이번주 토요일 14시)"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          {/* Step 2 — 레벨(모험 강도) 설정. 여행지는 랜덤으로 떠납니다. */}
          <DestinyLevelSelector
            defaultLevel={destinyLevel}
            onLevelSelect={setDestinyLevel}
          />
          <button
            type="button"
            className="mode-form__submit"
            disabled={!destinyLevel}
            onClick={handleThrowDestiny}
          >
            {destinyLevel ? '운명에 맡기기' : '모험 강도를 선택하세요'}
          </button>
        </div>
      </div>

      {/* Inline expanding glassmorphic form (Choice B) */}
      <div className={`mode-form ${mode === 'planned' ? 'mode-form--open' : ''}`}>
        <div className="mode-form__inner">
          <div className="mode-form__group">
            <span className="mode-form__label">누구와 떠나시나요?</span>
            <div className="mode-form__companions">
              {companions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`mode-form__companion ${companion === c.id ? 'mode-form__companion--active' : ''}`}
                  onClick={() => setCompanion(c.id)}
                >
                  <span className="mode-form__companion-icon">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mode-form__group">
            <span className="mode-form__label">
              어디로 가고 싶으신가요? <span className="mode-form__hint">선택 안하면 랜덤 추첨</span>
            </span>
            <div className={`mode-form__combobox ${region ? 'mode-form__combobox--filled' : ''}`}>
              <span className="mode-form__combobox-icon">🔍</span>
              <input
                type="text"
                className="mode-form__combobox-input"
                placeholder="지역·키워드 입력 또는 아래에서 선택"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
              {region && (
                <button
                  type="button"
                  className="mode-form__combobox-clear"
                  onClick={() => setRegion('')}
                  aria-label="지우기"
                >
                  &times;
                </button>
              )}
            </div>
            <div className="mode-form__chips">
              {REGION_SUGGESTIONS.map((r) => (
                <button
                  type="button"
                  key={r.label}
                  className={`mode-form__chip ${region === r.label ? 'mode-form__chip--active' : ''}`}
                  onClick={() => setRegion(region === r.label ? '' : r.label)}
                >
                  <span className="mode-form__chip-icon">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mode-form__group">
            <span className="mode-form__label">
              언제 방문하시나요? <span className="mode-form__hint">선택</span>
            </span>
            <div className="mode-form__chips">
              {WHEN_SUGGESTIONS.map((w) => (
                <button
                  type="button"
                  key={w}
                  className={`mode-form__chip ${when === w ? 'mode-form__chip--active' : ''}`}
                  onClick={() => setWhen(when === w ? '' : w)}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="mode-form__inline-input"
              placeholder="직접 입력 (예: 이번주 토요일 14시)"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div className="mode-form__group">
            <span className="mode-form__label">
              어떤 분위기를 원하시나요? <span className="mode-form__hint">복수 선택 가능</span>
            </span>
            <div className="mode-form__chips">
              {MOOD_SUGGESTIONS.map((m) => (
                <button
                  type="button"
                  key={m.label}
                  className={`mode-form__chip ${moods.includes(m.label) ? 'mode-form__chip--active' : ''}`}
                  onClick={() => toggleMood(m.label)}
                >
                  <span className="mode-form__chip-icon">{m.icon}</span>
                  {m.label}
                  {moods.includes(m.label) && <span className="mode-form__chip-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="mode-form__submit" onClick={handleSubmit}>
            일정 생성하기
          </button>
        </div>
      </div>

      {/* 랜덤 추첨 연출 오버레이 — "운명에 맡기기"를 누르면 등장 */}
      {lotteryRegion && (
        <KoreaMapDraw
          selectedRegion={lotteryRegion}
          onConfirm={handleLotteryConfirm}
        />
      )}
    </section>
  );
}
