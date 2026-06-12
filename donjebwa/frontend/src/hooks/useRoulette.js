import { useState, useEffect, useRef, useCallback } from 'react';

const CITY_NAMES = ['서울','부산','대구','인천','광주','대전','울산','제주','춘천','강릉','전주','목포'];

export default function useRoulette() {
  const [needleRot, setNeedleRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [thrown, setThrown] = useState(12847);
  const [rpm, setRpm] = useState(0);

  const spinTimeoutRef = useRef(null);
  const rpmIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const thrownIntervalRef = useRef(null);

  // Increment thrown count periodically
  useEffect(() => {
    thrownIntervalRef.current = setInterval(() => {
      if (Math.random() < 0.45) {
        setThrown(prev => prev + 1);
      }
    }, 3200);

    return () => {
      clearInterval(thrownIntervalRef.current);
      clearTimeout(spinTimeoutRef.current);
      clearInterval(rpmIntervalRef.current);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const spin = useCallback(() => {
    if (spinning) return;

    const idx = Math.floor(Math.random() * 12);

    setNeedleRot(prev => {
      const next = Math.ceil((prev + 1) / 360) * 360 + 360 * 6 + idx * 30;
      return next;
    });
    setSpinning(true);
    setSelected(null);

    // Animate RPM
    clearInterval(rpmIntervalRef.current);
    rpmIntervalRef.current = setInterval(() => {
      setRpm(600 + Math.floor(Math.random() * 500));
    }, 120);

    clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = setTimeout(() => {
      clearInterval(rpmIntervalRef.current);
      setSpinning(false);
      setSelected(idx);
      setThrown(prev => prev + 1);
      setRpm(0);
    }, 4300);
  }, [spinning]);

  const scrollSpin = useCallback(() => {
    const el = document.getElementById('destiny-map');
    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(spin, 750);
  }, [spin]);

  // Derived values
  const target = selected == null ? '서울' : CITY_NAMES[selected];
  const currentRpm = spinning ? rpm : (selected == null ? 850 : 0);
  const statusText = spinning
    ? '운명 연산 중...'
    : (selected == null ? '대기 중 — 운명을 돌려보세요' : '운명 확정: ' + CITY_NAMES[selected]);
  const btnLabel = spinning
    ? '회전 중...'
    : (selected == null ? '운명 돌리기' : '다시 던지기');

  return {
    needleRot,
    spinning,
    selected,
    thrown,
    rpm: currentRpm,
    target,
    statusText,
    btnLabel,
    spin,
    scrollSpin,
    cityNames: CITY_NAMES,
  };
}
