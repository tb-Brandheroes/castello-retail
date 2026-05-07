## Mål

Erstat det nuværende "Being in the Moment"-flow med et simpelt retail-kioskflow til Castello, baseret på kravspecifikationen. Forbrugeren klikker sig frem til 3 opskrifter ud fra tid + præferencer, vælger én, ser stort billede + QR-kode, og flowet kan starte forfra.

Ingen Make.com-webhook længere. Tekster og billeder hentes automatisk fra castellocheese.com.

---

## Flow (4 skærme)

```text
[1] Forside
    "Klik dig frem til dit næste måltid"
    [Start]
        ↓
[2] Vælg varighed
    ( ) 10–15 min   ( ) 20–25 min   ( ) 30–35 min
        ↓
[3] Vælg præferencer (min. 3, måltidet må indeholde)
    Kød · Fisk · Kylling · Vegetar · Pasta · Salat · Sandwich · Æg · Frugt og grønt
    [Vis opskrifter] (disabled indtil 3 valgt)
        ↓
[4] 3 opskriftskort  "Vælg din favorit"
    [billede + navn] × 3
        ↓ (klik på ét kort)
[5] Fullscreen overlay
    Stort billede · navn · beskrivelse · QR-kode til castello-link
    [×] luk  ·  auto-luk efter 30 sek
        ↓
    Tilbage til [1]
```

Idle-reset: hvis ingen interaktion i 1 min på en hvilken som helst skærm → tilbage til [1].

---

## Opskrifts-katalog

Vi bygger ét struktureret katalog ud fra `Opskrifter.docx`, hvor hver opskrift har:

```ts
type Recipe = {
  slug: string;          // sidste del af URL
  url: string;           // fuld castello-URL
  duration: '10-15' | '20-25' | '30-35';
  tags: Array<'kød'|'fisk'|'kylling'|'vegetar'|'pasta'|'salat'|'sandwich'|'æg'|'frugt-og-grønt'>;
};
```

Kataloget gemmes som én TypeScript-fil (`src/data/recipes.ts`) — ingen database nødvendig for v1. Samme URL kan have flere tags/varigheder (vi de-dup'er på slug og samler tags).

Filtrering ved valg:
- Filter på `duration === valgt tid`
- Match hvis opskriften har **mindst én** af forbrugerens valgte tags (kravspec: "matcher et eller flere af de præferencer de har valgt")
- Tag op til 3 tilfældige (eller score-sorteret efter antal matchende tags) — så samme valg ikke altid giver samme 3.

---

## Hent tekst + billede fra castellocheese.com

Hver opskriftsside har `<script type="application/ld+json">` med `@type: "Recipe"` der indeholder `name`, `description`, `image[]`. Vi henter den server-side via en lille edge function (Lovable Cloud), så vi undgår CORS i browseren.

```text
GET /functions/v1/recipe-meta?url=<castello-url>
→ { name, description, image }
```

Edge-funktionen:
1. Validerer at URL'en starter med `https://www.castellocheese.com/da/opskrifter/`
2. Henter HTML, parser JSON-LD, returnerer `name`/`description`/`image`
3. Cacher i hukommelsen (eller en lille `recipe_cache`-tabel) i fx 7 dage

Frontenden bruger React Query til at hente metadata for de 3 viste opskrifter — første gang lidt forsinkelse, derefter cached.

QR-kode genereres client-side fra `recipe.url` med `qrcode` npm-pakken.

---

## Analytics (kravspec-ønsker)

Vi opretter to tabeller i Lovable Cloud:

```text
sessions(id, location, started_at, ended_at, completed boolean, abandoned_step text)
recipe_views(id, session_id, recipe_slug, viewed_at)
```

Vi logger:
- Session start (skærm [1] → klik)
- Hvert skridt + tidsstempel (til "hvor lang tid", "forlader undervejs")
- Hver vist top-3 og hvilken der blev valgt → "hvilke opskrifter trender"
- `location` sættes via en query-param på kiosk-URL'en, fx `?loc=arla-hq`

Senere kan vi bygge en simpel `/admin`-side med tabeller pr. lokation. Det er udenfor v1-scope men datamodellen understøtter det.

---

## Teknisk sektion

**Filer der ændres / tilføjes:**

- `src/pages/Index.tsx` — erstattes med ny multi-step state machine (start → tid → præferencer → resultater)
- `src/pages/RecipeOverlay.tsx` (eller komponent) — fullscreen visning + QR + auto-close timer
- `src/data/recipes.ts` — katalog parset fra Opskrifter.docx
- `src/hooks/useIdleReset.ts` — 1 min inaktivitet → tilbage til start
- `src/hooks/useRecipeMeta.ts` — React Query wrapper om edge function
- `supabase/functions/recipe-meta/index.ts` — JSON-LD scraper
- `supabase/migrations/...` — `sessions` + `recipe_views` tabeller med RLS
- Fjerner: Make.com webhook-kald, navn/moment-felter, bobler

**Pakker tilføjes:** `qrcode` (eller `qrcode.react`), `@tanstack/react-query` er allerede med.

**Lovable Cloud aktiveres** før implementering — bruges til edge function + analytics-tabeller.

**Design:** Beholder den eksisterende Castello-baggrund og logo i bunden. Knapper og kort styles efter eksisterende design tokens i `index.css`. Stort, touch-venligt UI (kiosk).

---

## Spørgsmål før implementering

1. Skal vi gemme analytics i Lovable Cloud nu, eller vente og kun bygge selve flowet i v1?
2. Skal QR-koden pege direkte på opskriftens URL (anbefales) eller på en kort tracking-redirect via vores edge function (så vi kan måle "scannet")?
3. Skal "Vælg præferencer" kræve **præcis 3** eller **mindst 3**? Kravspec siger "vælg min. 3".
4. Skal "uncategorized" opskrifterne (side 5–7 i dokumentet) med i v1, eller kun de allerede kategoriserede?
