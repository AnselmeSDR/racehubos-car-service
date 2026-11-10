/**
 * A real add-on context for the tests, built by the RaceHubOS core itself (createAddonContext)
 * over a throwaway core database, and the add-on's routes served on a real port.
 *
 * The core comes from findCore(); its dependencies must be installed.
 */
import { once, EventEmitter } from 'node:events';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ADDON_DIR, findCore } from './findCore.js';

export const manifest = JSON.parse(fs.readFileSync(path.join(ADDON_DIR, 'racehubos-addon.json'), 'utf-8'));

const backend = path.join(findCore(), 'packages/backend');
const coreRequire = createRequire(path.join(backend, 'package.json'));
const coreImport = (relative) => import(pathToFileURL(path.join(backend, relative)).href);

/** A core database at the latest migration, as an installed RaceHubOS has it. */
function createCoreDatabase(file) {
  const Database = coreRequire('better-sqlite3');
  const db = new Database(file);
  const migrations = path.join(backend, 'prisma/migrations');
  for (const name of fs.readdirSync(migrations).sort()) {
    const sql = path.join(migrations, name, 'migration.sql');
    if (fs.existsSync(sql)) db.exec(fs.readFileSync(sql, 'utf-8'));
  }
  db.close();
}

/**
 * @returns the core's `prisma` (unscoped, to seed), the add-on's `ctx`, `api(method, path, body)`,
 * `coreEmit(event, data)` (an event from the core to the browsers), what was `emitted`, `logs`,
 * and `close()`
 */
export async function startCore({ register } = {}) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${manifest.id}-test-`)));
  const dbFile = path.join(tmp, 'core.db');
  createCoreDatabase(dbFile);
  process.env.DATABASE_URL = `file:${dbFile}`;
  delete process.env.RACEHUBOS_ADDONS_DIR;

  const { createPrismaClient } = await coreImport('src/lib/prisma.js');
  const { createAddonContext } = await coreImport('src/addons/loader.js');
  const express = coreRequire('express');
  const prisma = createPrismaClient();

  // As in the core: what goes to the browsers is mirrored to the add-ons
  const events = new EventEmitter();
  const emitted = [];
  const io = {
    emit(event, data) {
      emitted.push([event, data]);
      events.emit(event, data);
    },
  };
  const logs = [];
  const logger = {
    log: (...a) => logs.push(['info', ...a]),
    warn: (...a) => logs.push(['warn', ...a]),
    error: (...a) => logs.push(['error', ...a]),
  };

  const app = express();
  app.use(express.json());
  const { ctx, dispose } = createAddonContext({
    addon: { id: manifest.id, manifest },
    rootDir: tmp,
    app,
    io,
    events,
    prisma,
    services: {},
    version: 'test',
    coreDatabasePath: dbFile,
    logger,
  });
  const entry = register ?? (await import(pathToFileURL(path.join(ADDON_DIR, 'server/index.js')).href)).default;
  await entry(ctx);
  app.use(`/api/addons/${manifest.id}`, ctx.router);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/addons/${manifest.id}`;

  async function api(method, route, body) {
    const res = await fetch(base + route, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  async function close() {
    server.close();
    dispose();
    await prisma.$disconnect();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { prisma, ctx, api, coreEmit: io.emit, emitted, logs, close };
}

let sequence = 0;

/** Core records to run laps on. */
export function seeder(prisma) {
  return {
    track: (data = {}) => prisma.track.create({ data: { name: `Track ${++sequence}`, ...data } }),
    car: (data = {}) =>
      prisma.car.create({
        data: { brand: 'Brand', model: `Model ${++sequence}`, ...data },
      }),
    session: (trackId) => prisma.session.create({ data: { type: 'practice', trackId } }),
    /** `count` laps of a car in a session, timed `at` (ms) on. */
    laps: (count, { carId, session, at = Date.now(), deletedAt = null }) =>
      prisma.lap.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          sessionId: session.id,
          trackId: session.trackId,
          carId,
          controller: 0,
          phase: 'racing',
          lapNumber: i + 1,
          lapTime: 8000,
          timestamp: new Date(at + i),
          deletedAt,
        })),
      }),
  };
}

/** Back to an empty core database and add-on history, between tests. */
export async function wipe({ prisma, ctx }) {
  await prisma.lap.deleteMany();
  await prisma.session.deleteMany();
  await prisma.carExtra.deleteMany();
  await prisma.car.deleteMany();
  await prisma.track.deleteMany();
  ctx.openDatabase().exec('DELETE FROM service');
}
