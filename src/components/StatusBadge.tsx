import { useEffect, useRef, useState } from "react";

type CacheState = "checking" | "ready" | "partial" | "none";

declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;

const HIDE_AFTER_MS = 5000;
const TRIPLE_TAP_WINDOW_MS = 800;

export function StatusBadge() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );
  const [cacheState, setCacheState] = useState<CacheState>("checking");
  const [storagePct, setStoragePct] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const tapsRef = useRef<number[]>([]);
  const hideTimer = useRef<number | null>(null);

  // online/offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // SW + cache readiness
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        if (!("serviceWorker" in navigator) || !("caches" in window)) {
          if (!cancelled) setCacheState("none");
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || !reg.active) {
          if (!cancelled) setCacheState("partial");
          return;
        }
        const names = await caches.keys();
        let total = 0;
        for (const n of names) {
          const c = await caches.open(n);
          total += (await c.keys()).length;
        }
        if (!cancelled) setCacheState(total > 50 ? "ready" : "partial");
      } catch {
        if (!cancelled) setCacheState("partial");
      }
    };
    void check();
    const id = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // auto-hide after 5s, reveal on triple-tap
  useEffect(() => {
    const scheduleHide = () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    };
    scheduleHide();

    const onTap = () => {
      const now = Date.now();
      tapsRef.current = tapsRef.current.filter((t) => now - t < TRIPLE_TAP_WINDOW_MS);
      tapsRef.current.push(now);
      if (tapsRef.current.length >= 3) {
        tapsRef.current = [];
        setVisible(true);
        scheduleHide();
      }
    };
    window.addEventListener("pointerdown", onTap, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onTap);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const color = !online
    ? cacheState === "ready"
      ? "#9ca3af" // grey: offline but cached
      : "#eab308" // yellow: offline + incomplete cache
    : cacheState === "ready"
      ? "#22c55e" // green: online + cached
      : cacheState === "checking"
        ? "#9ca3af"
        : "#eab308";

  const label = !online
    ? cacheState === "ready"
      ? "offline · klar"
      : "offline · cache ufuldstændig"
    : cacheState === "ready"
      ? "online · klar"
      : cacheState === "checking"
        ? "tjekker…"
        : "online · cache ufuldstændig";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 9999,
        opacity: visible ? 0.7 : 0,
        transition: "opacity 400ms ease",
        pointerEvents: "none",
        fontFamily: "'Montserrat', system-ui, sans-serif",
        fontSize: 10,
        color: "#374151",
        background: "rgba(255,255,255,0.85)",
        padding: "4px 8px",
        borderRadius: 6,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      <span>
        v{__APP_VERSION__} · {label}
      </span>
      <span style={{ opacity: 0.5 }}>· {__APP_BUILD_TIME__}</span>
    </div>
  );
}
