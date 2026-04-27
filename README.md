# Milomatic (Offline Mileage Tracker PWA)

A private, offline-capable mileage tracker web app/PWA for business driving.

## Built with
- Plain HTML, CSS, and JavaScript only
- No external libraries, frameworks, CDNs, APIs, images, or tracking
- Local data storage with `localStorage`

## Features
- Vehicle management (add/update, safe delete blocking when trips exist)
- Trip entry with automatic distance calculation in kilometres (km)
- Local-date defaults for trip entry (`YYYY-MM-DD` based on device local time, not UTC)
- Default categories:
  - Repairs
  - Inspection
  - Supply Pickup
  - Showing
  - Tenant Visit
  - Property Trip
  - Administration
  - Other
- Trip list with newest first
- Edit and delete trip actions with confirmations
- Reports:
  - Current month total km
  - Current year total km
  - Totals by category
  - Totals by vehicle
- Export all trips to CSV (properly escaped for Excel/Numbers/Sheets)
- Export backup JSON
- Import backup JSON with overwrite confirmation
- PWA service worker app-shell caching for offline opening after first load

## Local testing
1. Serve the app from a local web server (recommended for service worker testing):
   - Python 3: `python3 -m http.server 8000`
2. Open `http://localhost:8000` in your browser.
3. Add at least one vehicle.
4. Add a trip and confirm km is auto-calculated from odometer values.
5. Edit and delete a trip.
6. Export CSV and JSON.
7. Import JSON and confirm overwrite warning appears.

## Offline testing (including iPhone flow)
1. Open the app once while online so the service worker can cache files.
2. On iPhone Safari, tap **Share** → **Add to Home Screen**.
3. Launch from Home Screen at least once while online.
4. Turn on **Airplane Mode**.
5. Re-open the app from Home Screen and confirm it still opens and allows create/edit/delete/export/import without internet.

## Private publishing options
### GitHub Pages
1. Push this folder to a private repository.
2. In repository settings, enable GitHub Pages from the main branch root.
3. GitHub Pages visibility/support can vary by plan and repository type over time; check your current GitHub plan rules for private-repo Pages support.
4. If you switch to a public repo for Pages, that exposes your app source code, but not your mileage records. Trip data stays in each user's local browser/device storage.
5. Open the Pages URL once on iPhone Safari and add to Home Screen.

### Another static host
Any static host that serves files over HTTPS will work (for example Cloudflare Pages, Netlify, or a private internal host).

## Data safety note
All mileage data is stored locally in this browser/device only, unless you export and move backup files yourself.
Do not commit exported CSV or JSON backup files to this repository. These may contain private mileage records. Keep exports in Files/iCloud Drive/email/spreadsheets instead.

## Service worker cache versioning
When you change app files (`index.html`, `app.js`, etc.), bump the cache name in `service-worker.js` (for example from `milomatic-cache-v1` to `milomatic-cache-v2`) so clients refresh to the new app shell.
