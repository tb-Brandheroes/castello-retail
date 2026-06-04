# Dato-filter på dashboardet

Alle tabeller har allerede timestamps (`sessions.started_at`, `recipe_views.created_at`, `device_heartbeats.created_at`) — vi tilføjer bare et UI-filter.

## Ændringer (kun `src/pages/Dashboard.tsx`)

1. **Dato-vælger i header** ved siden af lokations-dropdownen:
   - To `<input type="date">` felter: "Fra" og "Til"
   - Hurtige genveje: "I dag", "7 dage", "30 dage", "Alt" (knapper)
   - Default: sidste 30 dage

2. **Filtrering i hukommelse**: Vi henter allerede de seneste 2000 sessioner / 5000 views — vi tilføjer en `dateFilter`-memo der skærer dem ned baseret på `started_at` (sessions) før resten af de eksisterende memos (popular, dropoff, tagStats, durStats, avgSeconds) bruger listen. Views filtreres via `sessionIds` som i dag, så de følger automatisk med.

3. **Visning**: Tæller og labels viser det valgte interval (fx "Sessioner (1.–4. juni)").

## Hvad der *ikke* ændres

- Ingen database-ændringer — kun frontend.
- Limitten på 2000/5000 rækker bevares. Hvis du senere vil filtrere på datoer længere tilbage end de seneste 2000 sessioner, skal vi flytte filtreringen til selve Supabase-kaldet (`.gte("started_at", from).lte(...)`) — kan tilføjes hvis det bliver relevant.

## Kort teknisk

```ts
const [from, setFrom] = useState<string>(/* 30 dage siden, YYYY-MM-DD */);
const [to, setTo] = useState<string>(/* i dag */);

const dateFilteredSessions = useMemo(() => {
  const f = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
  const t = to ? new Date(to + "T23:59:59").getTime() : Infinity;
  return sessions.filter(s => {
    const ts = new Date(s.started_at).getTime();
    return ts >= f && ts <= t;
  });
}, [sessions, from, to]);
```

Derefter bruges `dateFilteredSessions` i stedet for `sessions` i de eksisterende `locFilter`-memos.
