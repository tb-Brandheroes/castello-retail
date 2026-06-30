## Mål
Tilføj en "Live aktivitet"-log på Dashboard, så vi hurtigt kan se om data tikker ind når enheder kommer online igen.

## Hvad bygges
I `src/pages/Dashboard.tsx` tilføjes et nyt panel øverst (over de eksisterende tabeller) kaldet **"Live aktivitet"**:

- Viser de seneste 50 events på tværs af `sessions`, `recipe_views` og `device_heartbeats`, sorteret efter tidspunkt (nyeste øverst).
- Hver række: tidspunkt (HH:mm:ss, relativ "for 12s siden"), type-badge (Session start / Opskrift vist / Opskrift valgt / Heartbeat), lokation, og kort beskrivelse (fx opskriftsnavn eller app-version).
- Filter-knap "Kun denne lokation" der respekterer det eksisterende `locFilter`.
- "Sidst opdateret: HH:mm:ss" tæller + status-prik (grøn = forbindelse OK, gul = ingen nye events i 5 min).
- **Auto-refresh hvert 10. sek** via `setInterval` (henter kun de seneste 50 rækker pr. tabel, så det er let).
- Manuel "Genindlæs nu"-knap.
- Realtime-subscription via Supabase channels på de tre tabeller, så nye INSERTs popper ind med det samme uden at vente på polling (kræver `ALTER PUBLICATION supabase_realtime ADD TABLE ...` migration for de tre tabeller).

## Tekniske detaljer
- Ny migration: tilføjer `sessions`, `recipe_views`, `device_heartbeats` til `supabase_realtime` publication og sætter `REPLICA IDENTITY FULL` på dem.
- Ny komponent `src/components/LiveActivity.tsx` der håndterer fetch + realtime + rendering, så `Dashboard.tsx` ikke vokser yderligere.
- Bruger eksisterende `Card`, `Badge`, `Table` shadcn-komponenter og semantiske tokens — ingen nye farver.
- Channel ryddes op i `useEffect` cleanup (ingen leak).
- Ingen ændringer i analytics-skrivning eller eksisterende dashboards-tabeller.

## Ikke med
- Ingen ændring af `Index.tsx`, AppDownload, eller analytics-klienten.
- Ingen ny tabel — vi læser kun fra de tre eksisterende.
