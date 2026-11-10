import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { seeder, startCore, wipe } from './core.js';

let core, seed;

before(async () => {
  core = await startCore();
  seed = seeder(core.prisma);
});
after(() => core.close());
beforeEach(async () => {
  await wipe(core);
  core.emitted.length = 0;
  core.logs.length = 0;
});

const get = (route) => core.api('GET', route);
const updates = () => core.emitted.filter(([event]) => event === 'car-service:updated').map(([, data]) => data);

/** A track of `length` metres (none if null) and a session on it. */
async function sessionOn(length) {
  const track = await seed.track({ length });
  return seed.session(track.id);
}

describe('the cars', () => {
  test('a car without laps: nothing used, the default interval, never serviced', async () => {
    const car = await seed.car({
      brand: 'Ford',
      model: 'GT',
      color: '#ff0000',
    });
    const { status, body } = await get('/cars');
    assert.equal(status, 200);
    assert.deepEqual(body, {
      success: true,
      data: [
        {
          car: {
            id: car.id,
            brand: 'Ford',
            model: 'GT',
            img: null,
            color: '#ff0000',
          },
          intervalLaps: 300,
          laps: 0,
          distance: 0,
          lapsWithoutLength: 0,
          lastService: null,
          remaining: 300,
          due: false,
        },
      ],
    });
  });

  test('laps and distance per car: a lap is the length of its track, counted without one', async () => {
    const [ford, porsche] = [await seed.car(), await seed.car()];
    const monza = await sessionOn(12.5);
    const unknown = await sessionOn(null);
    await seed.laps(4, { carId: ford.id, session: monza });
    await seed.laps(3, { carId: ford.id, session: unknown });
    await seed.laps(2, { carId: porsche.id, session: monza });
    // A deleted lap does not count
    await seed.laps(5, {
      carId: porsche.id,
      session: monza,
      deletedAt: new Date(),
    });

    const { body } = await get('/cars');
    const byId = Object.fromEntries(body.data.map((s) => [s.car.id, s]));
    assert.deepEqual(
      [byId[ford.id], byId[porsche.id]].map(({ laps, distance, lapsWithoutLength }) => ({
        laps,
        distance,
        lapsWithoutLength,
      })),
      [
        { laps: 7, distance: 50, lapsWithoutLength: 3 },
        { laps: 2, distance: 25, lapsWithoutLength: 0 },
      ]
    );
  });

  test('the most worn first, then by name; deleted cars are left out', async () => {
    const session = await sessionOn(10);
    const worn = await seed.car({ brand: 'Zeta', model: 'Z' });
    await seed.car({ brand: 'Beta', model: 'B' });
    await seed.car({ brand: 'Alpha', model: 'A' });
    await seed.car({ brand: 'Gone', model: 'G', deletedAt: new Date() });
    await seed.laps(30, { carId: worn.id, session });

    const { body } = await get('/cars');
    assert.deepEqual(
      body.data.map((s) => s.car.brand),
      ['Zeta', 'Alpha', 'Beta']
    );
  });

  test('one car; an unknown or deleted one is not found', async () => {
    const car = await seed.car();
    const gone = await seed.car({ deletedAt: new Date() });
    assert.equal((await get(`/cars/${car.id}`)).body.data.car.id, car.id);
    for (const id of ['nope', gone.id]) {
      assert.deepEqual(await get(`/cars/${id}`), {
        status: 404,
        body: { success: false, error: `car ${id} not found` },
      });
    }
  });
});

describe('the service interval', () => {
  test('set per car, kept with the car record; the car is due once it is reached', async () => {
    const car = await seed.car();
    await seed.laps(50, { carId: car.id, session: await sessionOn(10) });

    const { status, body } = await core.api('PUT', `/cars/${car.id}/interval`, {
      laps: 50,
    });
    assert.equal(status, 200);
    assert.deepEqual([body.data.intervalLaps, body.data.remaining, body.data.due], [50, 0, true]);
    const stored = await core.prisma.carExtra.findMany({
      where: { carId: car.id },
    });
    assert.deepEqual(
      stored.map(({ addon, data }) => [addon, JSON.parse(data)]),
      [['car-service', { intervalLaps: 50 }]]
    );
    assert.deepEqual(updates(), [{ carIds: [car.id] }]);

    await core.api('PUT', `/cars/${car.id}/interval`, { laps: 51 });
    assert.deepEqual((await get(`/cars/${car.id}`)).body.data, {
      ...body.data,
      intervalLaps: 51,
      remaining: 1,
      due: false,
    });
  });

  test('a whole number of laps above 0, for a known car', async () => {
    const car = await seed.car();
    for (const laps of [0, -5, 2.5, '100', null, undefined]) {
      assert.deepEqual(await core.api('PUT', `/cars/${car.id}/interval`, { laps }), {
        status: 400,
        body: {
          success: false,
          error: 'the interval is a whole number of laps above 0',
        },
      });
    }
    assert.equal((await core.api('PUT', '/cars/nope/interval', { laps: 10 })).status, 404);
    assert.deepEqual(updates(), []);
  });

  test('a value stored by other means that is no interval gives the default', async () => {
    const car = await seed.car();
    await core.ctx.extra.set('car', car.id, { intervalLaps: 'often' });
    assert.equal((await get(`/cars/${car.id}`)).body.data.intervalLaps, 300);
  });
});

describe('a service', () => {
  test('starts the car again from zero, and is kept in its history', async () => {
    const car = await seed.car();
    const session = await sessionOn(10);
    await seed.laps(40, { carId: car.id, session, at: Date.now() - 60_000 });

    const { status, body } = await core.api('POST', `/cars/${car.id}/service`);
    assert.equal(status, 200);
    assert.deepEqual([body.data.laps, body.data.distance, body.data.remaining], [0, 0, 300]);
    assert.deepEqual([body.data.lastService.laps, body.data.lastService.distance], [40, 400]);
    assert.deepEqual(updates(), [{ carIds: [car.id] }]);

    // Only the laps after it count
    await seed.laps(7, { carId: car.id, session, at: Date.now() + 1000 });
    assert.equal((await get(`/cars/${car.id}`)).body.data.laps, 7);
    await core.api('POST', `/cars/${car.id}/service`);

    const history = (await get(`/cars/${car.id}/history`)).body.data;
    assert.deepEqual(
      history.map(({ laps, distance }) => [laps, distance]),
      [
        [7, 70],
        [40, 400],
      ]
    );
    assert.ok(history.every((entry) => Number.isInteger(entry.id) && entry.doneAt > 0));
  });

  test('of an unknown car is not found, nor is its history', async () => {
    assert.equal((await core.api('POST', '/cars/nope/service')).status, 404);
    assert.equal((await get('/cars/nope/history')).status, 404);
  });

  test('a car never serviced has an empty history', async () => {
    const car = await seed.car();
    assert.deepEqual((await get(`/cars/${car.id}/history`)).body, {
      success: true,
      data: [],
    });
  });
});

describe('the end of a session', () => {
  test('the pages read its cars again; the cars due are logged', async () => {
    const session = await sessionOn(10);
    const [due, fine, absent] = [await seed.car({ brand: 'Due' }), await seed.car(), await seed.car()];
    await core.api('PUT', `/cars/${due.id}/interval`, { laps: 5 });
    await seed.laps(5, { carId: due.id, session });
    await seed.laps(1, { carId: fine.id, session });
    core.emitted.length = 0;

    core.coreEmit('session:finished', { sessionId: session.id });
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(updates().length, 1);
    assert.deepEqual(updates()[0].carIds.sort(), [due.id, fine.id].sort());
    assert.ok(!updates()[0].carIds.includes(absent.id));
    assert.ok(
      core.logs.some(
        ([level, , message]) => level === 'info' && /^Due .* is due for service: 5 laps, every 5$/.test(message)
      )
    );
  });

  test('a session without laps changes nothing', async () => {
    const session = await sessionOn(10);
    core.coreEmit('session:finished', { sessionId: session.id });
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(updates(), []);
  });
});

test('a failure answers 500 in JSON and is logged', async () => {
  core.ctx.openDatabase().exec('ALTER TABLE service RENAME TO broken');
  try {
    const { status, body } = await get('/cars');
    assert.equal(status, 500);
    assert.equal(body.success, false);
    assert.match(body.error, /no such table: service/);
    assert.ok(
      core.logs.some(
        ([level, , message]) => level === 'error' && message === 'GET /api/addons/car-service/cars failed:'
      )
    );
  } finally {
    core.ctx.openDatabase().exec('ALTER TABLE broken RENAME TO service');
  }
});
