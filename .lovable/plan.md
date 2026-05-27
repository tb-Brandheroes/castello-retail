## Plan: 10 robusthedsforbedringer til kiosk use-case

Implementeres i rækkefølge — hver step er selvstændig og kan verificeres før næste.

### Step 1 — ErrorBoundary med auto-reload
- Ny `src/components/ErrorBoundary.tsx` der fanger React-crashes
- Viser kort "Genstarter…" overlay og kalder `window.location.reload()` efter 3 sek
- Logger fejl til console (så Fully Kiosk remote-logs fanger den)
- Wrappes om `<App />` i `src/main.tsx`

### Step 2 — Wake Lock (skærm sover ikke)
- Ny `src/hooks/useWakeLock.ts` der bruger `navigator.wakeLock.request("screen")`
- Re-acquirer automatisk på `visibilitychange` (Safari frigiver ved tab-skift)
- Kaldes én gang i `Index.tsx`
- Fejler stille på browsere uden support (iOS <16.4)

### Step 3 — Offline-ready indikator + version-tag
- Læser `__APP_VERSION__` (injected via Vite `define` fra `package.json` version + git-uafhængigt build-timestamp)
- Lille diskret badge nederst i hjørnet: `v1.0.0 · ●` (grøn=online, grå=offline+cached, gul=cache ufuldstændig)
- Tjekker `navigator.serviceWorker.ready` + caches.keys() for at vise "offline ready"
- Skjules efter 5 sek aktivitet, vises igen ved 3-finger tap (debug-gesture for staff)

### Step 4 — Crash- og analytics-backup til IndexedDB
- Tilføj sekundær persistens i `analytics.ts`: hver `enqueue()` skriver også til IndexedDB (`castello-analytics` db, `outbox` store)
- Ved opstart: merge IndexedDB-kø ind hvis `localStorage` er tom (recovery efter browser-data clear)
- ~50MB grænse i stedet for ~5MB

### Step 5 — Manifest: tilføj `id` felt
- Tilføj `"id": "/"` til `public/manifest.webmanifest`
- Sikrer at fremtidige `start_url`-ændringer ikke skaber duplicate installs
- Ren tilføjelse, ingen breaking change

### Step 6 — Offline-test script
- Ny `scripts/verify-offline.mjs` der:
  - Bygger appen (`vite build`)
  - Starter `vite preview`
  - Bruger Playwright (allerede ikke installeret — bruger i stedet headless `curl` + asset-tjek)
  - Verificerer at alle 39 recipe-billeder + fonts + JS/CSS findes i `dist/`
  - Tjekker at `sw.js` registrerer alle assets i precache-manifest
- Tilføj `npm run verify:offline` til `package.json`

### Step 7 — QR-fallback: in-app recipe view
- Ny route `/recipe/:slug` der renderer recipe-detalje fra `recipes-meta.json` lokalt
- QR-koden viser stadig castellocheese.com URL (kunde scanner med eget net)
- MEN: hvis kunden ikke kan scanne, kan staff trykke "Vis opskrift her" knap → åbner lokal view
- Ingen ændringer til selve QR-flowet, kun en ekstra knap på results-skærmen

### Step 8 — Cache-størrelse monitor
- I debug-badge (step 3): vis også `navigator.storage.estimate()` brug/quota
- Advarsel hvis >80% af quota brugt
- Hjælper med at opdage når fremtidige recipe-tilføjelser nærmer sig Safari's grænse

### Step 9 — Timezone-håndtering
- Tilføj `tz_offset_minutes` til session-row (fra `new Date().getTimezoneOffset()`)
- Server-side timestamps gemmes som UTC (uændret), men vi kan rekonstruere tablet-lokal tid
- Migration: `ALTER TABLE sessions ADD COLUMN tz_offset_minutes integer`

### Step 10 — Periodisk flush + health-beacon
- Udover `online`-event og startup: flush hver 5. minut hvis kø ikke er tom
- Send tom "heartbeat"-row til Supabase hver time når online (ny `device_heartbeats` tabel)
- Lar driften se hvilke tablets der er live uden at vente på user-sessions

### Filer der ændres
- Nye: `src/components/ErrorBoundary.tsx`, `src/hooks/useWakeLock.ts`, `src/components/StatusBadge.tsx`, `src/pages/RecipeDetail.tsx`, `scripts/verify-offline.mjs`
- Ændrede: `src/main.tsx`, `src/App.tsx`, `src/pages/Index.tsx`, `src/lib/analytics.ts`, `public/manifest.webmanifest`, `vite.config.ts`, `package.json`
- Migration: `tz_offset_minutes` kolonne + ny `device_heartbeats` tabel

### Rækkefølge / verificering
Jeg laver step 1-3 først (de vigtigste — crash recovery, wake lock, version-badge), beder dig teste, og fortsætter derefter med 4-10. Sig til hvis du vil have en anden rækkefølge eller springe nogen over (fx step 7 hvis QR-fallback ikke er nødvendigt).
