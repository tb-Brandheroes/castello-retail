## Plan: Bundle fonts lokalt + bekræft offline analytics

### 1. Google Fonts bundles lokalt
- Tilføj `@fontsource/cormorant-garamond` (vægte 400, 500, 600, 700) og `@fontsource/montserrat` (vægte 300, 400, 500, 600, 700) som dependencies
- Importér dem i `src/main.tsx` (eller `src/index.css` via `@import`) så de bundles ind i app'en
- Fjern `<link>` til `fonts.googleapis.com` og de to `<link rel="preconnect">` i `index.html`
- Fjern Google Fonts runtime-caching reglerne i `vite.config.ts` (ikke længere relevante)
- Resultat: nul eksterne netværkskald — appen kører 100% selvstændigt efter første install

### 2. Bekræftelse: holder analytics i ugevis offline?

**Ja, det gør den.** Sådan virker det konkret i `src/lib/analytics.ts`:

- Alle events (`startSession`, `updateSession`, `logShownRecipes`, `logPicked`) tjekker `navigator.onLine`. Hvis offline → skrives til `localStorage` under nøglen `castello.analytics.outbox.v1`.
- `localStorage` er **persistent** i browseren — den overlever:
  - Browser-restart
  - Tablet-genstart  
  - App-genstart i Fully Kiosk
  - Dage, uger, måneder uden net
- Køen ryddes kun når events succesfuldt sendes til Supabase, eller hvis nogen manuelt clearer browser-data.
- Hver offline-session får et midlertidigt `local-<timestamp>-<random>` id. Når nettet kommer tilbage:
  - `window.addEventListener("online", flushOutbox)` trigger automatisk
  - `flushOutbox()` indsætter session-rows først, mapper temp-id → rigtigt UUID, og opdaterer derefter session-patches og recipe_views med det rigtige id
  - Rækkefølgen bevares (FIFO i array)

**Begrænsninger I bør kende:**
- `localStorage` har ~5MB grænse pr. origin. Hver event fylder ~200 bytes → plads til ~25.000 events. Med 1 session = ~5 events, kan I køre ~5.000 sessions offline før kø'en bliver fuld. Mere end rigeligt til "uger mellem internet".
- Hvis personalet rydder browser-data eller geninstallerer Fully Kiosk → kø'en mistes. (Ikke et reelt problem i kiosk-mode med PIN.)
- `started_at`/`ended_at` timestamps gemmes med tablettens lokale tid på event-tidspunktet, så datoerne i Supabase er korrekte — ikke flush-tidspunktet.

**Lille forbedring jeg tilføjer samtidig:** Også flush når app'en starter op (ikke kun ved `online` event), så hvis nettet allerede er tilbage når tabletten tændes, tømmes kø'en med det samme.

### Filer der ændres
- `package.json` — tilføj `@fontsource/cormorant-garamond`, `@fontsource/montserrat`
- `src/main.tsx` — importér font-pakker + kald `flushOutbox()` ved opstart
- `index.html` — fjern Google Fonts `<link>` tags
- `vite.config.ts` — fjern gfonts runtime-caching regler

Det er alt. Ingen ændringer til UI, business logic eller database.
