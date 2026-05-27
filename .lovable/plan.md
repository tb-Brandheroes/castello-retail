## Goal

Make the attached `app-debug.apk` (27 MB) downloadable from the published site at the URL `/app`, so the tablet (or anyone) can install it straight from a browser.

## What I'll do

1. **Add the APK to `public/`**
   - Save the file as `public/downloads/castello-moments.apk`
   - Anything in `public/` is served as-is by Vite, so it will be reachable directly at `https://castello-retail.lovable.app/downloads/castello-moments.apk`.

2. **Create an `/app` route with a simple install page**
   - New page `src/pages/AppDownload.tsx` styled to match the Castello look (Cormorant + Montserrat, existing color tokens).
   - Content:
     - Title "Install Castello Moments"
     - Short instructions (enable "Install unknown apps" for the browser → tap Download → open the APK to install)
     - Big download button linking to `/downloads/castello-moments.apk` with the `download` attribute
     - Version + file size shown below the button
   - Register the route `/app` in `src/App.tsx`.

3. **No service worker caching of the APK**
   - Add `downloads/*` to the PWA `globIgnores` (or simply leave it out of `globPatterns`) so the 27 MB file is not pulled into the offline cache and doesn't bloat the kiosk app.

4. **Verify**
   - After publish, `https://castello-retail.lovable.app/app` shows the install page.
   - `https://castello-retail.lovable.app/downloads/castello-moments.apk` downloads the APK directly (handy as a short link too).

## Notes

- Lovable's static hosting will serve the `.apk` with a generic binary content-type, which is fine — Android recognizes it by extension and prompts to install.
- If you'd like a shorter URL (e.g. `/castello.apk` at the root) I can add that too — just say the word.
- Future APK updates: drop the new file in the same path and republish; the URL stays the same.
