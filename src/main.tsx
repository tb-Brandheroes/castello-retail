import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { flushOutbox } from './lib/analytics'

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

createRoot(document.getElementById("root")!).render(<App />);

// --- Service worker registration (production + standalone window only) ---
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const host = window.location.hostname;
const isPreviewHost =
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") && host.includes("id-preview--");

if (isInIframe || isPreviewHost) {
  // Make sure no stale SW interferes inside the Lovable preview iframe
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => { /* PWA disabled */ });
}

// Flush queued analytics at startup (in case net is already back) and whenever we come online
flushOutbox();
window.addEventListener("online", () => { flushOutbox(); });
