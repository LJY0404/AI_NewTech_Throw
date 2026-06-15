import { useState, useRef } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ModeSelectionSection from './components/ModeSelectionSection';
import AgentTerminal from './components/AgentTerminal';
import './styles/index.css';

export default function App() {
  const [thrown, setThrown] = useState(12847);
  const [session, setSession] = useState(null); // { key, request }
  const terminalRef = useRef(null);

  // 사용자가 "운명에 맡기기"를 누르면 → 터미널을 렌더하고 스크롤
  const handleThrow = (request) => {
    setThrown((n) => n + 1);
    setSession({ key: Date.now(), request });
    setTimeout(() => {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleReset = () => setSession(null);

  return (
    <div className="app-root">
      <Header />
      <HeroSection thrown={thrown} />
      <ModeSelectionSection onThrow={handleThrow} />
      {session && (
        <div ref={terminalRef}>
          <AgentTerminal
            key={session.key}
            request={session.request}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
