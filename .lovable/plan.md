# Identificering af tablets

Mål: Hver tablet sender sit eget navn (fx "Kvickly ved køl") med al data, så dashboardet kan filtrere per skærm. Eksisterende data bevares — vi ændrer kun *hvordan* `location` udfyldes fremover.

## Ingen data går tabt

- Vi rører ikke databasen. `sessions.location`, `device_heartbeats.location` og rækker fra de sidste APK-builds (alle med `location = "unknown"`) bliver liggende.
- Ingen migrations, ingen drops. Nye sessions fra opdaterede tablets får bare et rigtigt navn.
- Capacitor's WebView bevarer localStorage på tværs af app-opdateringer, så når navnet først er sat på en tablet, overlever det fremtidige APK-installs (kun "Clear app data" eller afinstallation rydder det).

## Ændringer

### 1. `src/lib/analytics.ts` — læs location fra localStorage

Erstat `getLocation()` så den bruger localStorage først, derefter `?loc=` (bagudkompatibel for web-preview), derefter `"unknown"`:

```ts
const LOCATION_KEY = "castello.location";

const getLocation = () => {
  if (location !== null) return location;
  try {
    const stored = localStorage.getItem(LOCATION_KEY);
    if (stored && stored.trim()) {
      location = stored.trim();
      return location;
    }
    const params = new URLSearchParams(window.location.search);
    location = params.get("loc") || "unknown";
  } catch {
    location = "unknown";
  }
  return location;
};
```

Heartbeat bruger samme funktion → fixes automatisk.

Eksportér også en lille helper så Dashboard kan opdatere det:

```ts
export function setDeviceLocation(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  try { localStorage.setItem(LOCATION_KEY, trimmed); } catch {}
  location = trimmed;
}
export function getDeviceLocation(): string {
  try { return localStorage.getItem(LOCATION_KEY) ?? ""; } catch { return ""; }
}
```

### 2. `src/pages/Dashboard.tsx` — input til at navngive *denne* tablet

Tilføj et lille kort øverst på dashboardet: viser nuværende navn for *denne enhed* + input + "Gem"-knap. Workflowet bliver: ved opsætning åbner man `/dashboard` på selve tabletten, skriver navnet, gemmer. Derefter bruges tabletten normalt.

```tsx
// Øverst i dashboardet
<Panel title="Denne skærms navn">
  <p className="text-sm text-muted-foreground mb-2">
    Sættes på selve tabletten ved opsætning. Gemmes lokalt og bruges som "location"
    på alle sessioner fra denne enhed.
  </p>
  <div className="flex gap-2">
    <Input value={name} onChange={(e) => setName(e.target.value)}
      placeholder="Fx Kvickly ved køl" />
    <Button onClick={save}>Gem</Button>
  </div>
  {current && <p className="text-xs mt-2">Nuværende: <strong>{current}</strong></p>}
</Panel>
```

`save` kalder `setDeviceLocation(name)` og viser en toast. Navnet ligger så i location-filteret i dropdownen som det allerede er bygget.

### 3. Skjult adgang (anbefalet, lille tilføjelse)

I `src/pages/Index.tsx`: long-press (3 sek) på Castello-logoet → `navigate("/dashboard")`. Lige nu er `/dashboard` kun beskyttet af at kunder ikke kan skrive URL i kiosk-mode, men long-press giver dig en eksplicit vej ind når du står ved tabletten.

## Hvad du gør efter deploy

1. Byg ny APK (eller hot-reload hvis wrapperen peger på Lovable preview), installer på hver tablet.
2. På hver tablet: åbn `/dashboard` (long-press logo), skriv navnet, tryk Gem.
3. Fra det øjeblik tagges al ny data med det navn. Dashboard-dropdownen viser de 3 navne (+ "unknown" for historisk data).

## Hvad der *ikke* løses her

- Gammel data (42 sessions med `location = "unknown"`) forbliver "unknown" — kan ikke retroaktivt tildeles en skærm.
- Hvis nogen klikker "Clear app data" eller afinstallerer, skal navnet sættes igen.
