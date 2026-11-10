import { historyOf, lastServices, recordService } from './history.js';
import { byWear, intervalOf, statusOf, usageByCar } from './usage.js';

const CAR_FIELDS = {
  id: true,
  brand: true,
  model: true,
  img: true,
  color: true,
};

export class NotFound extends Error {
  status = 404;
}
export class BadRequest extends Error {
  status = 400;
}

/** What the add-on knows of the cars, from the core database (`ctx.prisma`, `ctx.extra`) and its own. */
export function createCarService({ prisma, extra, openDatabase, now = () => Date.now() }) {
  const db = () => openDatabase();

  /** Laps and distance of `cars` since each one's last service. */
  async function usageOf(cars, last) {
    if (cars.length === 0) return new Map();
    const since = (car) => last.get(car.id)?.doneAt;
    const groups = await prisma.lap.groupBy({
      by: ['carId', 'trackId'],
      where: {
        deletedAt: null,
        OR: cars.map((car) =>
          since(car) ? { carId: car.id, timestamp: { gt: new Date(since(car)) } } : { carId: car.id }
        ),
      },
      _count: { _all: true },
    });
    const tracks = await prisma.track.findMany({
      where: { id: { in: [...new Set(groups.map((group) => group.trackId))] } },
      select: { id: true, length: true },
    });
    return usageByCar(groups, new Map(tracks.map((track) => [track.id, track.length])));
  }

  /** The status of the cars not deleted, or only of those in `ids`; the most worn first. */
  async function statuses(ids = null) {
    const cars = await prisma.car.findMany({
      where: { deletedAt: null, ...(ids && { id: { in: ids } }) },
      select: CAR_FIELDS,
    });
    const last = lastServices(db());
    const [usage, extras] = await Promise.all([usageOf(cars, last), extra.all('car')]);
    return cars
      .map((car) =>
        statusOf({
          car,
          intervalLaps: intervalOf(extras[car.id]),
          usage: usage.get(car.id),
          lastService: last.get(car.id) ?? null,
        })
      )
      .sort(byWear);
  }

  async function statusOfCar(carId) {
    const [status] = await statuses([carId]);
    if (!status) throw new NotFound(`car ${carId} not found`);
    return status;
  }

  /** Records a service done now: the car starts again from zero. */
  async function markServiced(carId) {
    const { laps, distance } = await statusOfCar(carId);
    recordService(db(), { carId, doneAt: now(), laps, distance });
    return statusOfCar(carId);
  }

  async function setIntervalLaps(carId, laps) {
    if (!Number.isInteger(laps) || laps <= 0) throw new BadRequest('the interval is a whole number of laps above 0');
    await statusOfCar(carId);
    await extra.set('car', carId, { intervalLaps: laps });
    return statusOfCar(carId);
  }

  async function history(carId) {
    await statusOfCar(carId);
    return historyOf(db(), carId);
  }

  /** The cars that ran in a session. */
  async function carsOfSession(sessionId) {
    const laps = await prisma.lap.findMany({
      where: { sessionId },
      distinct: ['carId'],
      select: { carId: true },
    });
    return laps.map((lap) => lap.carId);
  }

  return {
    statuses,
    statusOfCar,
    markServiced,
    setIntervalLaps,
    history,
    carsOfSession,
  };
}
