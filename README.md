# RaceHubOS car service

A [RaceHubOS](https://gitlab.com/AnselmeSDR/RaceHubOS) add-on that tells you when a car needs servicing: braids, tyres, a drop of oil.

- **Car service page** in the menu: each car's laps and distance since its last service, the most worn first. Distance is laps × track length.
- **An interval per car**, every 300 laps by default.
- **Service done** records the service and keeps a history per car.
- **A badge on the car page**: _Service due_, or the laps left.
- **At the end of each session**, the page updates live and the server log names the cars that are due.

English, French and German.

## Install

On the RaceHubOS **Add-ons** page, **Install from a link**: `https://gitlab.com/AnselmeSDR/racehubos-car-service`.

It needs a RaceHubOS version with add-ons ([docs/ADDONS.md](https://github.com/AnselmeSDR/RaceHubOS/blob/main/docs/ADDONS.md)).

## Data

- The interval of each car is stored with the car, in the core database (`CarExtra`). It goes away when the car is deleted for good.
- The service history lives in the add-on's own SQLite database, in `addons/.data/car-service/`. Removing the add-on with its data deletes it.

## Development

Clone it next to a RaceHubOS checkout and link it into the core's add-ons:

```bash
git clone git@gitlab.com:AnselmeSDR/racehubos-car-service.git
ln -s "$PWD/racehubos-car-service" racehubos/addons/car-service
cd racehubos && npm run dev
```

The tests run on that checkout. It can be the core the add-on is installed in, a `racehubos` folder next to the add-on, or the folder in `RACEHUBOS_DIR`.

```bash
npm test                        # both suites
npm run test:server             # node:test, with coverage
npm run test:web -- --coverage  # Vitest
```

- `test:server` loads the add-on with the core's real add-on context, on a fresh database migrated with the core's migrations and served by Express.
- `test:web` runs in the core's Vitest, with its aliases, its setup and the add-on built in. The add-on must be in the core's `addons/` folder, installed or linked.

## License

[AGPL-3.0](LICENSE) — free to use, modify and share; any modified version you distribute or offer as an online service must stay open source under the same license. A commercial license is available for closed-source use: anselme8@icloud.com.
