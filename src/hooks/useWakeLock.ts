import { useEffect } from "react";

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

/**
 * Holds a screen wake lock so the kiosk display does not sleep.
 * Re-acquires on visibility change (browsers drop the lock when hidden).
 * Fails silently where unsupported (iOS < 16.4, older Android browsers).
 */
export function useWakeLock() {
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
    };
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await nav.wakeLock!.request("screen");
        sentinel.addEventListener("release", () => {
          sentinel = null;
        });
      } catch (e) {
        console.warn("[wakeLock] acquire failed", e);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel && !cancelled) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {});
      }
    };
  }, []);
}
