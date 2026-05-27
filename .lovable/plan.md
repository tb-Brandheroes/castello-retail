# Plan: Offline PWA til Castello retail-kiosk

Målet: Appen kan installeres, kører fullscreen og virker uden internet på Android-tablets. Bagefter peger I bare Fully Kiosk Browser på den.

## Hvad der bygges

### 1. Pre-bake alle opskrifter ind i app'en
I dag henter app'en titel + billede for hver opskrift fra edge-funktionen `recipe-meta` ved opstart. Det kræver internet.

- Nyt build-script `scripts/prefetch-recipes.ts` der kører før hver build:
  - Henter metadata for alle ~30 opskrifter fra `recipe-meta`
  - Downloader hvert billede og gemmer som `src/assets/recipes/<slug>.jpg`
  - Skriver `src/data/recipes-meta.json` med titel, beskrivelse og billed-import-sti
- `useRecipeMeta` ændres til at læse fra den statiske JSON i stedet for at fetche
- Warm-up-loopet i `Index.tsx` fjernes — alt er allerede i bundlen
- Tilføj `"prebuild": "tsx scripts/prefetch-recipes.ts"` til `package.json`

Resultat: nul netværkskald i runtime. QR-koden virker stadig (den er bare en URL — kunden scanner med egen telefon).

### 2. Service worker til offline app-shell
- Tilføj `vite-plugin-pwa` med `registerType: "autoUpdate"`
- Cache JS, CSS, fonts, billeder, manifest — alt fra bundlen
- `NetworkFirst` for HTML-navigation, så nye deploys hentes når der er net
- **Deaktiveret i Lovable preview** (kun aktiv på published domæne, ikke i iframe) — ellers ødelægger SW'en editor-preview
- `manifest.webmanifest` er allerede der; opdateres med korrekt theme-color og `display: "fullscreen"` (er allerede sat)

### 3. Kiosk-tilpasninger i HTML/CSS
- `<meta name="viewport" content="..., user-scalable=no, maximum-scale=1">` — ingen pinch-zoom
- CSS: deaktiver text-selection og context-menu globalt
- Sørg for at idle-reset (allerede 60s) bringer brugeren tilbage til start

### 4. Analytics
`src/lib/analytics.ts` skriver til Supabase. Uden net fejler det stille. To muligheder:

- **A) Offline-kø:** Gem events i `localStorage`, flush når `navigator.onLine` bliver true. Beholder dashboard-data.
- **B) Drop helt:** Fjern analytics-kald. Simplere, men ingen statistik.

→ Jeg foreslår **A**. Spørger hvis I foretrækker B.

## Hvad I selv gør bagefter
1. Publish app'en (Lovable → Publish)
2. Installer **Fully Kiosk Browser** på hver tablet (~€10 engangskøb pr. enhed)
3. Sæt start-URL til `https://castello-retail.lovable.app`
4. Aktivér "Kiosk Mode" + PIN i Fully Kiosk — så kan personalet ikke komme ud af appen

## Tekniske detaljer
- Filer der oprettes/ændres:
  - `scripts/prefetch-recipes.ts` (ny)
  - `src/data/recipes-meta.json` + `src/assets/recipes/*.jpg` (genereret)
  - `src/hooks/useRecipeMeta.ts` (læser statisk JSON)
  - `src/pages/Index.tsx` (fjern warm-up fetch)
  - `vite.config.ts` (tilføj VitePWA plugin)
  - `package.json` (prebuild script + `vite-plugin-pwa`, `tsx`)
  - `src/main.tsx` (SW registration med iframe/preview-guard)
  - `index.html` (viewport user-scalable=no)
  - `src/lib/analytics.ts` (offline outbox, hvis A)
- Service worker registreres KUN når `window.self === window.top` og host ikke er `lovableproject.com` — så Lovable preview ikke går i stykker
