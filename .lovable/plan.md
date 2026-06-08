## Update app download page to Version 2

1. **Replace the APK file** at `public/downloads/castello-moments.apk` with the new `app-debug.apk` extracted from `castello-moments-debug_3.zip` (~27 MB).

2. **Update `src/pages/AppDownload.tsx`**:
   - Add a clearly visible **"Version 2"** badge near the title (e.g. a pill above the heading or next to the download button), styled with the existing design tokens.
   - Update the displayed APK size (recomputed from the new file).
   - Add a small "Updated: 8 June 2026" line under the filename so it's obvious which build is live.

No other files change. The triple-tap dashboard shortcut on `/` is untouched.
