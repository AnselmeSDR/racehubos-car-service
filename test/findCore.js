import fs from 'node:fs';
import path from 'node:path';

export const ADDON_DIR = path.resolve(import.meta.dirname, '..');

/**
 * The RaceHubOS checkout the tests run on: RACEHUBOS_DIR, else the core this add-on is installed in
 * (`<core>/addons/<id>`), else a `racehubos` folder next to the add-on.
 */
export function findCore() {
  const candidates = process.env.RACEHUBOS_DIR
    ? [path.resolve(process.env.RACEHUBOS_DIR)]
    : [path.resolve(ADDON_DIR, '../..'), path.resolve(ADDON_DIR, '../racehubos')];
  const core = candidates.find((dir) => fs.existsSync(path.join(dir, 'packages/backend/src/addons/loader.js')));
  if (!core) throw new Error(`RaceHubOS not found in ${candidates.join(' or ')}: set RACEHUBOS_DIR`);
  return core;
}
