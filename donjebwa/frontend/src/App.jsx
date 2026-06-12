import Header from './components/Header';
import HeroSection from './components/HeroSection';
import DestinyMap from './components/DestinyMap';
import useRoulette from './hooks/useRoulette';
import './styles/index.css';

export default function App() {
  const {
    needleRot,
    spinning,
    selected,
    thrown,
    rpm,
    target,
    statusText,
    btnLabel,
    spin,
    scrollSpin,
    cityNames,
  } = useRoulette();

  return (
    <div className="app-root">
      <Header />
      <HeroSection thrown={thrown} onScrollSpin={scrollSpin} />
      <DestinyMap
        cityNames={cityNames}
        selected={selected}
        needleRot={needleRot}
        spinning={spinning}
        statusText={statusText}
        btnLabel={btnLabel}
        target={target}
        rpm={rpm}
        onSpin={spin}
      />
    </div>
  );
}
