# Sikring af data - uden at røre skærmene i drift

## Kort svar på "hvordan fandt han URL'en"
Appen er en webapp pakket i en Android-wrapper. Selv i kiosk-tilstand kan URL'en ses (skærmen var sat op med URL-linjen synlig i Bilka), og alt hvad browseren/appen kalder ligger åbent i netværkstrafikken. Derfor er anon-nøglen og tabelnavnene altid synlige for den der kigger. Sikkerheden skal derfor ligge i databasens regler - ikke i at skjule URL'en.

## Vigtigt: nul påvirkning af de 3 skærme der kører nu
De installerede APK'er (Version 2) skriver direkte til databasen: opret session, opdater session, indsæt visninger, heartbeat. Planen bevarer præcis de skrivninger, så eksisterende skærme kører videre uændret - ingen ny app-installation nødvendig.

## Fase 1 - luk hullet (ingen ændring på skærmene)

1. **Fjern al anonym læsning** af `sessions`, `recipe_views` og `device_heartbeats`. Kiosk-appen læser aldrig data, kun skriver - så det mærker skærmene ikke. Rapportens "læs alle sessioner"-scenarie er dermed lukket.
2. **Stram indsættelse op** i stedet for "alt er tilladt": felter valideres (længde på lokation/app-version, tilladte varigheder, tidsstempler kan ikke sættes i fremtiden, rimelige grænser på tekstfelter). Almindelige kiosk-skrivninger går stadig igennem.
3. **Stram opdatering op**: i dag kan enhver ændre enhver session. Fremover må en session kun opdateres kort tid efter den er startet (fx 4 timer), og kun de felter kiosken faktisk bruger (afslutning, valgt opskrift, varighed, tags). Alt andet blokeres af en database-trigger. Kioskens normale "afslut session" sker inden for sekunder/minutter, så det påvirker ikke drift.
4. **Ryd testdata**: rækken med `location = SECURITY_TEST_DELETE_ME` (og eventuelle andre åbenlyse testrækker fra rapporten) slettes.

## Fase 2 - dashboardet skal stadig virke
Når anon-læsning fjernes, kan `/dashboard` ikke længere hente data direkte. Dashboardet får sine data via en server-funktion, der bruger en beskyttet nøgle:

- Ny edge function `analytics-read` læser sessioner, visninger og heartbeats server-side med dato-/lokationsfilter og fuld paginering (samme data som i dag).
- Adgang kræver en adgangskode, som gemmes som hemmelighed i backenden. Dashboardet spørger én gang og husker koden lokalt på enheden - så triple-tap-flowet på skærmene fungerer som nu.
- `Dashboard.tsx` og `LiveActivity.tsx` skifter fra direkte tabelkald til funktionskaldet. Live-panelet skifter fra realtime-abonnement til polling hvert 10. sek (realtime kræver læserettigheder).

## Fase 3 - næste APK (kan vente)
Når vi alligevel bygger en ny APK: flyt skrivningen til en `analytics-ingest` edge function, så anon slet ikke skal kunne skrive. Indtil da kan gamle og nye APK'er køre side om side, fordi fase 1 lader den validerede direkte skrivning bestå.

## Svar til anmelderen
Kort, venlig kvittering: tak, vi bekræfter fundet, vi har lukket læseadgangen og strammet skrive-/opdateringsregler, og vi tager gerne imod den fulde rapport + HAR-fil privat. Ingen kundedata eller personoplysninger er involveret (kun anonym brugsstatistik: lokation, varighed, valgt opskrift).

## Tekniske detaljer
- Migration: drop de tre `USING (true)`-SELECT-policies, drop `Anyone can update sessions`, nye policies med snævre `WITH CHECK`, trigger `sessions_guard_update()` der afviser ændringer i `id`, `location`, `started_at`, `created_at`, samt `REVOKE SELECT ... FROM anon` og `GRANT INSERT` kun hvor det er nødvendigt. `service_role` får fuld adgang til brug fra edge functions.
- Edge function bruger `SUPABASE_SERVICE_ROLE_KEY`, validerer input med Zod og sammenligner adgangskoden i konstant tid.
- Ingen ændringer i `src/pages/Index.tsx`, `src/lib/analytics.ts` eller offline-outboxen i denne runde.
