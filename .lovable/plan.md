
# 3-sekunders long-press på Castello-logoet → Dashboard

## Mål
I kiosk mode skal personalet kunne komme til `/dashboard` ved at holde fingeren på Castello-logoet nederst på siden i 3 sekunder. Gæster må ikke kunne udløse det ved et almindeligt tryk.

## Ændringer

**1 fil: `src/pages/Index.tsx`**

På `<img>`-logoet i footeren (linje 136–144) tilføjes:

- `onPointerDown` → start en `setTimeout(3000)` der kalder `navigate("/dashboard")`.
- `onPointerUp`, `onPointerLeave`, `onPointerCancel` → ryd timeren, så et almindeligt tap ikke gør noget.
- Wrap evt. i en `<button>` eller behold `<img>` med `role="button"` + `aria-hidden` (kiosk).
- Tilføj `touch-action: none` og `user-select: none` så browseren ikke åbner kontekstmenu/billed-preview ved langt tryk.
- Tilføj subtil visuel feedback under press (fx let opacity-ændring) så personalet ved at det virker — gæster vil ikke holde længe nok til at se det.

Import: `useNavigate` fra `react-router-dom` (kan allerede være importeret — tjekkes når vi bygger).

## Hvad vi IKKE rører
- `StatusBadge.tsx` (triple-tap til badge bevares uændret)
- Routing, offline-cache, service worker, APK

## Verifikation
- Almindeligt tap på logo: intet sker.
- Hold 3 sek: navigerer til `/dashboard`.
- Slip før 3 sek: intet sker.
- Ingen browser-kontekstmenu på langt tryk på mobil/touch.

## Note om APK'en på skærmene
Long-press-funktionen ligger i webappen, så den virker automatisk når skærmene henter den nye version (efter de er online + service workeren har opdateret + reload). Hvis skærmene stadig kører gammel cache, skal de først twin-reload eller geninstalleres med ny APK — det er en separat opgave.
