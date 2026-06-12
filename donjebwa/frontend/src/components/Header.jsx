import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" style={{ transform: 'rotate(-12deg)' }}>
            <rect x="4" y="4" width="24" height="24" rx="7" fill="#FF5A1F" />
            <rect x="4" y="4" width="24" height="24" rx="7" fill="url(#cuteGrad)" />
            <circle cx="11" cy="11" r="2.4" fill="#FFF6E4" />
            <circle cx="21" cy="11" r="2.4" fill="#FFF6E4" />
            <circle cx="16" cy="16" r="2.4" fill="#FFF6E4" />
            <circle cx="11" cy="21" r="2.4" fill="#FFF6E4" />
            <circle cx="21" cy="21" r="2.4" fill="#FFF6E4" />
            {/* sparkle */}
            <path d="M27 3l1 2.5L30.5 6.5 28 7.5 27 10l-1-2.5L23.5 6.5 26 5.5z" fill="#FFD36B" />
            <defs>
              <linearGradient id="cuteGrad" x1="4" y1="4" x2="28" y2="28">
                <stop offset="0%" stopColor="#FF8A4C" />
                <stop offset="100%" stopColor="#FF4A1F" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="header__title">던져봐</span>
      </div>

      <nav className="header__nav">
        <span className="header__nav-item">에이전트</span>
        <span className="header__nav-item header__nav-item--active">운명 룰렛</span>
        <span className="header__nav-item">운명 기록</span>
        <span className="header__nav-item">소개</span>
      </nav>

      <div className="header__record-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF7A3C" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        내 기록
      </div>
    </header>
  );
}
