## Mål
Opdater download-siden så `Download APK`-knappen serverer den nye build du har uploadet (`castello-moments-debug (1).zip` → `app-debug.apk`, 28 MB, 4. juni 2026).

## Trin
1. Pak `app-debug.apk` ud af den uploadede zip.
2. Overskriv `public/downloads/castello-moments.apk` med den nye APK (samme filnavn, så URL'en `/downloads/castello-moments.apk` virker uændret — tablets behøver ikke nyt link).
3. Opdater `APK_SIZE` i `src/pages/AppDownload.tsx` fra `"27 MB"` til `"28 MB"` så størrelsen vist under knappen matcher.

## Efter publish
Når frontend er publiceret, kan tablets gå til samme `/app`-side og hente den nye APK. Eksisterende installation skal afinstalleres først hvis signaturen er ændret (debug-builds har samme debug-signatur, så normalt kan den bare installeres ovenpå).
