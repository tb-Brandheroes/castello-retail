import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { startBackgroundScheduler } from './lib/analytics'
import { ErrorBoundary } from './components/ErrorBoundary'


// Bundled fonts — no runtime requests to Google Fonts
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// --- Service worker registration (production + standalone window only) ---
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const host = window.location.hostname;
const isPreviewHost =
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") && host.includes("id-preview--");
// Capacitor injects window.Capacitor when running inside the Android shell.
// Assets are already on-device, so the SW adds no value and can break capacitor:// routing.
const isCapacitor =
  typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== "undefined";

if (isInIframe || isPreviewHost || isCapacitor) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => { /* PWA disabled */ });
}

// Periodic flush, online-reconnect flush, IDB-recovery and heartbeat
startBackgroundScheduler();
