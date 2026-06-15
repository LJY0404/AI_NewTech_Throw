import React, { useState, useRef } from 'react';
import './DestinySetupModal.css';

const COMPANIONS = [
  { id: 'solo', label: '혼자', icon: '🧑' },
  { id: 'couple', label: '커플', icon: '👩‍❤️‍👨' },
  { id: 'friend', label: '친구', icon: '👯' },
];

const REGION_SUGGESTIONS = [
  { label: '성수', icon: '🏭' },
  { label: '해운대', icon: '🌊' },
  { label: '제주', icon: '🌴' },
  { label: '강릉', icon: '⛱️' },
  { label: '전주', icon: '🏯' },
  { label: '서울 도심', icon: '🌆' },
];

const WHEN_SUGGESTIONS = [
  { label: '지금 바로', value: '지금 바로' },
  { label: '오늘 저녁', value: '오늘 저녁' },
  { label: '내일', value: '내일' },
  { label: '이번 주말', value: '이번 주말' },
  { label: '다음 주말', value: '다음 주말' },
];

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

export default function DestinySetupModal({ isOpen, onClose, onSubmit }) {
  const [companion, setCompanion] = useState('couple');
  const [region, setRegion] = useState('');
  const [when, setWhen] = useState('');
  const [moods, setMoods] = useState([]);
  const regionInputRef = useRef(null);

  if (!isOpen) return null;

  const toggleMood = (label) => {
    setMoods((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const pickRegion = (label) => {
    setRegion(label);
    regionInputRef.current?.focus();
  };

  const handleSubmit = () => {
    let finalRegion = region.trim();
    if (!finalRegion) {
      const CITY_NAMES = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '제주', '춘천', '강릉', '전주', '목포'];
      finalRegion = CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)];
    }
    onSubmit({ region: finalRegion, when, companion, mood: moods.join(', ') });
    onClose();
  };

  return (
    <div className="destiny-modal-overlay" onClick={onClose}>
      <div className="destiny-modal" onClick={(e) => e.stopPropagation()}>
        <button className="destiny-modal__close" onClick={onClose}>&times;</button>

        <h2 className="destiny-modal__title">운명의 여정 설정</h2>
        <p className="destiny-modal__subtitle">조건을 입력하면 4개의 AI가 완벽한 코스를 계산합니다.</p>

        <div className="destiny-modal__group">
          <span className="destiny-modal__label">누구와 떠나시나요?</span>
          <div className="destiny-modal__companions">
            {COMPANIONS.map((c) => (
              <button
                key={c.id}
                className={`destiny-modal__companion-btn ${companion === c.id ? 'active' : ''}`}
                onClick={() => setCompanion(c.id)}
              >
                <span className="destiny-modal__companion-icon">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="destiny-modal__group">
          <span className="destiny-modal__label">
            어디로 가고 싶으신가요? <span className="destiny-modal__hint">선택 안하면 랜덤 추첨</span>
          </span>
          <div className={`destiny-modal__combobox ${region ? 'has-value' : ''}`}>
            <span className="destiny-modal__combobox-icon">🔍</span>
            <input
              ref={regionInputRef}
              type="text"
              className="destiny-modal__combobox-input"
              placeholder="지역·키워드 입력 또는 아래에서 선택"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
            {region && (
              <button
                className="destiny-modal__combobox-clear"
                onClick={() => pickRegion('')}
                aria-label="지우기"
              >
                &times;
              </button>
            )}
          </div>
          <div className="destiny-modal__chips">
            {REGION_SUGGESTIONS.map((r) => (
              <button
                key={r.label}
                className={`destiny-modal__chip ${region === r.label ? 'active' : ''}`}
                onClick={() => pickRegion(r.label)}
              >
                <span className="destiny-modal__chip-icon">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="destiny-modal__group">
          <span className="destiny-modal__label">
            언제 방문하시나요? <span className="destiny-modal__hint">선택</span>
          </span>
          <div className="destiny-modal__chips">
            {WHEN_SUGGESTIONS.map((w) => (
              <button
                key={w.value}
                className={`destiny-modal__chip ${when === w.value ? 'active' : ''}`}
                onClick={() => setWhen(when === w.value ? '' : w.value)}
              >
                {w.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="destiny-modal__inline-input"
            placeholder="직접 입력 (예: 이번주 토요일 14시)"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </div>

        <div className="destiny-modal__group">
          <span className="destiny-modal__label">
            어떤 분위기를 원하시나요? <span className="destiny-modal__hint">복수 선택 가능</span>
          </span>
          <div className="destiny-modal__chips">
            {MOOD_SUGGESTIONS.map((m) => (
              <button
                key={m.label}
                className={`destiny-modal__chip ${moods.includes(m.label) ? 'active' : ''}`}
                onClick={() => toggleMood(m.label)}
              >
                <span className="destiny-modal__chip-icon">{m.icon}</span>
                {m.label}
                {moods.includes(m.label) && <span className="destiny-modal__chip-check">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button className="destiny-modal__submit" onClick={handleSubmit}>
          운명에 맡기기
        </button>
      </div>
    </div>
  );
}
