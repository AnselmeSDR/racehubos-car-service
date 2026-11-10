/**
 * The services done, in the add-on's own database. Each step runs once (ctx.migrate):
 * add new ones at the end, never change a released one.
 */
export const MIGRATIONS = [
  `CREATE TABLE service (
    id INTEGER PRIMARY KEY,
    car_id TEXT NOT NULL,
    done_at INTEGER NOT NULL,
    laps INTEGER NOT NULL,
    distance REAL NOT NULL
  )`,
  'CREATE INDEX service_car ON service (car_id, done_at)',
];

const toService = (row) => ({
  id: row.id,
  doneAt: row.done_at,
  laps: row.laps,
  distance: row.distance,
});

/** The last service of each car: `{ doneAt, laps, distance }` by car id. */
export function lastServices(db) {
  // SQLite gives the other columns of the row holding the MAX
  const rows = db
    .prepare('SELECT id, car_id, MAX(done_at) AS done_at, laps, distance FROM service GROUP BY car_id')
    .all();
  return new Map(rows.map((row) => [row.car_id, toService(row)]));
}

/** Records a service, with the laps and distance the car had covered since the one before. */
export function recordService(db, { carId, doneAt, laps, distance }) {
  db.prepare('INSERT INTO service (car_id, done_at, laps, distance) VALUES (?, ?, ?, ?)').run(
    carId,
    doneAt,
    laps,
    distance
  );
}

/** A car's services, the latest first. */
export function historyOf(db, carId) {
  return db
    .prepare('SELECT id, done_at, laps, distance FROM service WHERE car_id = ? ORDER BY done_at DESC, id DESC')
    .all(carId)
    .map(toService);
}
