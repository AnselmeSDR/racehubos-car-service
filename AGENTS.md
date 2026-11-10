# racehubos-car-service

A RaceHubOS add-on (id `car-service`). Read the add-on guide first and follow its rules: https://github.com/AnselmeSDR/RaceHubOS/blob/main/docs/ADDONS.md

## Layout

- `server/`: `index.js` is the entry. `usage.js` (pure: laps, distance, due) and `history.js` (own database: migrations, services) feed `carService.js`, which uses `ctx.prisma`, `ctx.extra` and `ctx.openDatabase`.
- `web/`: `index.jsx` is the entry (route `''`, nav entry). `ServicePage` → `CarServiceRow`, `HistoryDialog`. `ServiceBadge` is shown by the override.
- `overrides/packages/frontend/src/components/car/CarIdentity.jsx` wraps the core's car identity with `@base` and adds the badge.
- `web/locales/{en,fr,de}.json`: the same keys in each language (`locales.test.js` checks this).
- The socket event is `car-service:updated` `{ carIds }`. It is sent after an interval change, a service, and each finished session.

## Rules

- Each database change is a new step at the end of `MIGRATIONS` in `server/history.js`. Never edit a step that has been released.
- Every change comes with tests, and coverage stays at 100 % on both sides.
- `npm test` needs a RaceHubOS checkout (see README § Development). `test/core.js` starts the core's real add-on context on a temporary database.
- Bump `version` in both `racehubos-addon.json` and `package.json`, then tag `vX.Y.Z`: the Add-ons page offers that tag as an update.

## Repository

GitLab `git@gitlab.com:AnselmeSDR/racehubos-car-service.git` (main), mirrored on GitHub `git@github.com:AnselmeSDR/racehubos-car-service.git`. The `origin` remote pushes to both: a `git push` updates both.
