import { useEffect, useRef, useState } from 'react';

// Cuenta atrás en segundos. `onTick` recibe los segundos restantes cada segundo.
export function useCountdown(initialSeconds: number, onTick?: (remaining: number) => void) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  });

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setRemaining((value) => {
        const next = Math.max(0, value - 1);
        tick.current?.(next);
        if (next === 0) setRunning(false);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  return {
    remaining,
    running,
    toggle: () => setRunning((value) => !value),
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: (seconds = initialSeconds) => {
      setRunning(false);
      setRemaining(seconds);
    },
  };
}
