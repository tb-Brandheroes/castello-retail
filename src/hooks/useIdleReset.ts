import { useEffect, useRef } from "react";

/** Calls onIdle after `ms` of no user activity. Pass null to disable. */
export function useIdleReset(ms: number | null, onIdle: () => void) {
  const timer = useRef<number | null>(null);
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    if (ms == null) return;
    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => cb.current(), ms);
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [ms]);
}
