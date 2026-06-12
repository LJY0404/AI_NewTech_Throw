import GlowingDie from './GlowingDie';
import './HeroSection.css';

export default function HeroSection({ thrown, onScrollSpin }) {
  return (
    <section className="hero">
      {/* Reference-style Background Particles */}
      <div className="hero__particles">
        <div className="particle-dot pd-1"></div>
        <div className="particle-dot pd-2"></div>
        <div className="particle-dot pd-3"></div>
        <div className="particle-dot pd-4"></div>
        <div className="particle-streak ps-1"></div>
        <div className="particle-streak ps-2"></div>
        <div className="particle-streak ps-3"></div>
      </div>

      <h1 className="hero__heading">
        <span className="hero__heading-line">계획하지 마세요.</span>
        <span className="hero__heading-line hero__heading-line--accent">그저 운명을 던지세요.</span>
      </h1>

      <p className="hero__sub">
        4개의 AI가 혼잡도와 동선을 완벽히 계산합니다.
        <br />
        당신은 가벼운 마음으로 떠나고, 완벽한 추억 사진만 남기세요.
      </p>

      <GlowingDie />

      <button className="hero__cta" onClick={onScrollSpin}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF8A4C">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
        운명 던지기
      </button>

      <div className="hero__social-proof">
        <div className="hero__thrown">이미 {thrown.toLocaleString()}명이 완벽한 추억을 남겼습니다</div>
        <div className="hero__reviews-marquee">
          <div className="hero__reviews-track">
            {/* Reviews */}
            <div className="hero__review-chip">
              <div className="hero__review-avatar" style={{ background: '#FF5A1F' }}></div>
              <span>"인생 최고의 P행 ㅋㅋㅋ" - 서울 거주 20대</span>
            </div>
            <div className="hero__review-chip">
              <div className="hero__review-avatar" style={{ background: '#4A90E2' }}></div>
              <span>"노션 일지까지 완벽해요!" - J형 인간</span>
            </div>
            <div className="hero__review-chip">
              <div className="hero__review-avatar" style={{ background: '#50E3C2' }}></div>
              <span>"운명에 맡겼더니 핫플 발굴" - 여행 매니아</span>
            </div>
            {/* Duplicated for infinite scroll */}
            <div className="hero__review-chip">
              <div className="hero__review-avatar" style={{ background: '#FF5A1F' }}></div>
              <span>"인생 최고의 P행 ㅋㅋㅋ" - 서울 거주 20대</span>
            </div>
            <div className="hero__review-chip">
              <div className="hero__review-avatar" style={{ background: '#4A90E2' }}></div>
              <span>"노션 일지까지 완벽해요!" - J형 인간</span>
            </div>
            <div className="hero__review-chip">
              <div className="hero__review-avatar" style={{ background: '#50E3C2' }}></div>
              <span>"운명에 맡겼더니 핫플 발굴" - 여행 매니아</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero__scroll-indicator">
        <span className="hero__scroll-label">SCROLL</span>
        <div className="hero__scroll-line" />
      </div>
    </section>
  );
}
