# racehubos-car-service

A RaceHubOS add-on (id `car-service`). Read the add-on guide first and follow its rules: https://github.com/AnselmeSDR/RaceHubOS/blob/main/docs/ADDONS.md

## Layout

- `server/`: `index.js` is the entry. `usage.js` (pure: laps, distance, due) and `history.js` (own database: migrations, services) feed `carService.js`, which uses `ctx.prisma`, `ctx.extra` and `ctx.openDatabase`.
- `web/`: `index.jsx` is the entry (route `''`, nav entry). `ServicePage` → `CarServiceRow`, `HistoryDialog`. `ServiceBadge` reads `useServiceStatus`, a store shared by every badge on screen: one request for a whole list, read again on `car-service:updated`.
- Overrides (`overrides/packages/frontend/src/components/car/`), both wrapping `@base`:
  - `CarIdentity.jsx` adds the badge to the car's profile, as a link to the service page;
  - `carColumns.jsx` adds a Service column to the cars list, before the edit column. In a row, the badge is no link, because clicking the row opens the car.
- `web/locales/{en,fr,de}.json`: the same keys in each language (`locales.test.js` checks this).
- The socket event is `car-service:updated` `{ carIds }`. It is sent after an interval change, a service, and each finished session.

## Rules

- Each database change is a new step at the end of `MIGRATIONS` in `server/history.js`. Never edit a step that has been released.
- Every change comes with tests, and coverage stays at 100 % on both sides.
- `npm test` needs a RaceHubOS checkout (see README § Development). `test/core.js` starts the core's real add-on context on a temporary database.
- Bump `version` in both `racehubos-addon.json` and `package.json`, then tag `vX.Y.Z`: the Add-ons page offers that tag as an update.

## Repository

GitLab `git@gitlab.com:AnselmeSDR/racehubos-car-service.git` (main), mirrored on GitHub `git@github.com:AnselmeSDR/racehubos-car-service.git`. The `origin` remote pushes to both: a `git push` updates both.
