import { createCarService } from './carService.js';
import { MIGRATIONS } from './history.js';

/** Sent to the browsers when the status of cars may have changed: `{ carIds }`. */
export const UPDATED_EVENT = 'car-service:updated';

/**
 * Car service — docs/ADDONS.md § Server side.
 *
 * GET  /api/addons/car-service/cars                the cars, the most worn first
 * GET  /api/addons/car-service/cars/:carId         one car
 * PUT  /api/addons/car-service/cars/:carId/interval   { laps }
 * POST /api/addons/car-service/cars/:carId/service    a service done now
 * GET  /api/addons/car-service/cars/:carId/history
 */
export default function register(ctx) {
  ctx.migrate(MIGRATIONS);
  const service = createCarService(ctx);

  const updated = (carIds) => ctx.io.emit(UPDATED_EVENT, { carIds });

  // The core's answer format: { success, data } or { success: false, error }
  const answer = (handler) => async (req, res) => {
    try {
      res.json({ success: true, data: await handler(req) });
    } catch (error) {
      const status = error.status ?? 500;
      if (status === 500) ctx.log.error(`${req.method} ${req.originalUrl} failed:`, error);
      res.status(status).json({ success: false, error: error.message });
    }
  };

  ctx.router.get(
    '/cars',
    answer(() => service.statuses())
  );
  ctx.router.get(
    '/cars/:carId',
    answer((req) => service.statusOfCar(req.params.carId))
  );
  ctx.router.put(
    '/cars/:carId/interval',
    answer(async (req) => {
      const status = await service.setIntervalLaps(req.params.carId, req.body?.laps);
      updated([req.params.carId]);
      return status;
    })
  );
  ctx.router.post(
    '/cars/:carId/service',
    answer(async (req) => {
      const status = await service.markServiced(req.params.carId);
      updated([req.params.carId]);
      return status;
    })
  );
  ctx.router.get(
    '/cars/:carId/history',
    answer((req) => service.history(req.params.carId))
  );

  // The cars of a finished session have more laps: the pages showing them read them again
  ctx.events.on('session:finished', async ({ sessionId }) => {
    const carIds = await service.carsOfSession(sessionId);
    if (carIds.length === 0) return;
    updated(carIds);
    const due = (await service.statuses(carIds)).filter((status) => status.due);
    for (const { car, laps, intervalLaps } of due) {
      ctx.log.info(`${car.brand} ${car.model} is due for service: ${laps} laps, every ${intervalLaps}`);
    }
  });
}
