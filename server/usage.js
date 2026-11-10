/** Laps between two services when a car has no interval of its own: the braids of a slot car. */
export const DEFAULT_INTERVAL_LAPS = 300;

/** A car's service interval, in laps: its own when a whole number above 0, the default otherwise. */
export function intervalOf(extra) {
  const laps = extra?.intervalLaps;
  return Number.isInteger(laps) && laps > 0 ? laps : DEFAULT_INTERVAL_LAPS;
}

/**
 * Laps and distance per car, from lap counts per car and track (`prisma.lap.groupBy`) and the
 * length of each track in metres. Laps on a track without a length are counted, not measured.
 *
 * @returns {Map<string, { laps: number, distance: number, lapsWithoutLength: number }>}
 */
export function usageByCar(groups, lengths) {
  const usage = new Map();
  for (const { carId, trackId, _count } of groups) {
    const car = usage.get(carId) ?? {
      laps: 0,
      distance: 0,
      lapsWithoutLength: 0,
    };
    const laps = _count._all;
    const length = lengths.get(trackId);
    car.laps += laps;
    if (length > 0) car.distance += laps * length;
    else car.lapsWithoutLength += laps;
    usage.set(carId, car);
  }
  return usage;
}

const NO_USAGE = { laps: 0, distance: 0, lapsWithoutLength: 0 };

/** Where a car stands: its use since its last service against its interval. */
export function statusOf({ car, intervalLaps, usage = NO_USAGE, lastService = null }) {
  return {
    car,
    intervalLaps,
    ...usage,
    lastService,
    remaining: Math.max(intervalLaps - usage.laps, 0),
    due: usage.laps >= intervalLaps,
  };
}

/** The most worn first: the share of their interval used, then by name. */
export function byWear(a, b) {
  const wear = b.laps / b.intervalLaps - a.laps / a.intervalLaps;
  return wear || `${a.car.brand} ${a.car.model}`.localeCompare(`${b.car.brand} ${b.car.model}`);
}
